import { describe, expect, it } from "vitest";
import {
  ingestMessages,
  matchSuggestion,
  setSuggestionStatus,
  suggestionStatus,
} from "./capture";
import { balance, initial, parseSms, readBackup, type Entry } from "./domain";
const time = new Date("2026-11-15T12:00:00").getTime();
const message = {
  id: "sms-one",
  body: "INR 850 debited from A/c XX1234 at FRESH MART on 15Nov Ref 123456789",
  timestamp: time,
  sender: "VM-BANK",
};
const account = {
  id: "cash",
  name: "Cash",
  type: "cash" as const,
  opening: 100000,
};
const base = () => ({ ...initial(), accounts: [account] });
describe("unlabelled message inbox", () => {
  it("captures financial details without changing money or storing the message body", () => {
    const captured = ingestMessages(base(), [message]);
    expect(captured.added).toBe(1);
    expect(captured.data.entries).toEqual([]);
    expect(balance(account, captured.data.entries)).toBe(100000);
    expect(captured.data.suggestions[0]).toMatchObject({
      amount: 85000,
      accountHint: "1234",
      sender: "VM-BANK",
      status: "unlabelled",
    });
    expect(captured.data.suggestions[0]).not.toHaveProperty("body");
  });
  it("does not recapture repeated scans, dismissed items, or duplicate references", () => {
    const first = ingestMessages(base(), [message, message]);
    expect(first.added).toBe(1);
    const discarded = setSuggestionStatus(first.data, message.id, "discarded");
    const second = ingestMessages(discarded, [
      message,
      { ...message, id: "sms-two" },
    ]);
    expect(second.added).toBe(0);
    expect(suggestionStatus(second.data.suggestions[0], [])).toBe("discarded");
  });
  it("keeps a debit and credit with the same transfer reference separate for review", () => {
    expect(
      ingestMessages(base(), [
        message,
        {
          ...message,
          id: "credit",
          body: message.body.replace("debited", "credited"),
        },
      ]).added,
    ).toBe(2);
  });
  it("restores a discarded capture and preserves that decision across backup/reload", () => {
    const first = ingestMessages(base(), [message]);
    const discarded = readBackup(
      JSON.stringify(setSuggestionStatus(first.data, message.id, "discarded")),
    );
    expect(suggestionStatus(discarded.suggestions[0], [])).toBe("discarded");
    const restored = setSuggestionStatus(discarded, message.id, "unlabelled");
    expect(suggestionStatus(restored.suggestions[0], [])).toBe("unlabelled");
  });
  it("matches a manual entry without counting the payment twice", () => {
    const captured = ingestMessages(base(), [message]);
    const entry: Entry = {
      id: "manual",
      type: "expense",
      amount: 85000,
      account: "cash",
      category: "Groceries",
      payee: "Fresh Mart",
      note: "",
      date: "2026-11-15",
      shared: false,
      updated: new Date(time).toISOString(),
    };
    const matched = matchSuggestion(
      { ...captured.data, entries: [entry] },
      message.id,
    );
    expect(matched.entries).toHaveLength(1);
    expect(matched.entries[0].smsId).toBe(message.id);
    expect(balance(account, matched.entries)).toBe(15000);
    expect(suggestionStatus(matched.suggestions[0], matched.entries)).toBe(
      "matched",
    );
    expect(() => matchSuggestion(matched, message.id)).toThrow(
      "already been reviewed",
    );
    expect(setSuggestionStatus(matched, message.id, "unlabelled")).toEqual(
      matched,
    );
  });
  it("understands legacy saved/discarded states without reviving deleted entries", () => {
    const s = parseSms(message.id, message.body, time)!;
    expect(suggestionStatus({ ...s, dismissed: true }, [])).toBe("discarded");
    expect(
      suggestionStatus({ ...s, dismissed: true }, [
        { smsId: s.id, deleted: true } as Entry,
      ]),
    ).toBe("saved");
  });
  it("rejects malformed capture states in backups", () => {
    expect(() =>
      readBackup(JSON.stringify({ ...base(), smsCapture: "yes" })),
    ).toThrow("capture settings");
    expect(() =>
      readBackup(
        JSON.stringify({
          ...base(),
          suggestions: [
            { ...parseSms(message.id, message.body, time), status: "bad" },
          ],
        }),
      ),
    ).toThrow("suggestion");
  });
  it("associates the amount with the payment action instead of an earlier balance", () => {
    expect(
      parseSms(
        "x",
        "Available balance INR 9,000. Your account debited by Rs. 250 at SHOP",
        time,
      )?.amount,
    ).toBe(25000);
    expect(
      parseSms(
        "x",
        "Available balance Rs. 2,000. INR 100 has been credited to account",
        time,
      )?.amount,
    ).toBe(10000);
    expect(parseSms("x", "Rs 100 credited", Infinity)).toBeNull();
  });
});
