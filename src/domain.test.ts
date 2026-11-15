import { describe, it, expect } from "vitest";
import {
  amountOf,
  balance,
  totals,
  breakdown,
  validateEntry,
  initial,
  readBackup,
  parseSms,
  duplicate,
  csv,
  householdLedger,
  type Entry,
  type Account,
} from "./domain";
const bank: Account = {
  id: "bank",
  name: "Savings",
  type: "bank",
  opening: 100000,
};
const card: Account = {
  id: "card",
  name: "Card",
  type: "card",
  opening: -50000,
};
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: "one",
  type: "expense",
  amount: 10000,
  account: "bank",
  category: "Groceries",
  payee: "Shop",
  note: "",
  date: "2026-11-14",
  shared: false,
  updated: "2026-11-14T00:00:00Z",
  ...over,
});
describe("money ledger", () => {
  it("shows new offline household entries and queued owner edits without duplicates", () => {
    const local = entry({ shared: true });
    const other = entry({ id: "other", shared: true, amount: 20000 });
    const remote = [
      {
        id: "one",
        creator: "me",
        payer: "Me",
        revision: 1,
        payload: { ...local, amount: 5000 },
      },
      {
        id: "other",
        creator: "mom",
        payer: "Mom",
        revision: 1,
        payload: other,
      },
    ];
    const data = {
      ...initial(),
      name: "Me",
      entries: [local, entry({ id: "new", shared: true })],
      sharedEdits: [{ ...remote[1], payload: { ...other, amount: 30000 } }],
    };
    const result = householdLedger(data, remote, "me", true);
    expect(result).toHaveLength(3);
    expect(totals(result).expense).toBe(50000);
    expect(
      householdLedger(
        { ...data, entries: [{ ...local, shared: false }] },
        remote,
        "me",
        true,
      ).some((e) => e.id === "one"),
    ).toBe(false);
  });
  it("stores exact paise and rejects ambiguous input", () => {
    expect(amountOf("120.15")).toBe(12015);
    for (const s of ["0", "-1", "1.123", "1e3", "NaN", "Infinity", ""])
      expect(() => amountOf(s)).toThrow();
  });
  it("transfers and card repayments move balances without adding spending", () => {
    const es = [entry({ type: "transfer", to: "card", amount: 20000 })];
    expect(balance(bank, es)).toBe(80000);
    expect(balance(card, es)).toBe(-30000);
    expect(totals(es)).toEqual({ income: 0, expense: 0 });
  });
  it("excludes deleted transactions and counts a shared expense once", () => {
    const es = [
      entry({ shared: true }),
      entry({ id: "two", deleted: true }),
      entry({ id: "three", type: "income", amount: 200000 }),
    ];
    expect(balance(bank, es)).toBe(290000);
    expect(totals(es)).toEqual({ income: 200000, expense: 10000 });
    expect(breakdown(es)).toEqual([["Groceries", 10000]]);
  });
  it("adjusts balances in either direction without affecting spending", () => {
    const es = [entry({ type: "adjustment", amount: -20000 })];
    validateEntry(es[0], [bank]);
    expect(balance(bank, es)).toBe(80000);
    expect(totals(es).expense).toBe(0);
  });
  it("rejects invalid account associations, dates and shared transfers", () => {
    for (const e of [
      entry({ account: "missing" }),
      entry({ type: "transfer", to: "bank" }),
      entry({ date: "2026-02-31" }),
      entry({ type: "income", shared: true }),
    ])
      expect(() => validateEntry(e, [bank, card])).toThrow();
  });
});
describe("SMS suggestions", () => {
  it("parses debit and credit messages without persisting raw text", () => {
    const s = parseSms(
      "123",
      "INR 1,250.50 debited from A/c XX1234 at FRESH MART on 14Nov Ref 987654321",
      Date.parse("2026-11-14"),
    );
    expect(s?.amount).toBe(125050);
    expect(s?.type).toBe("expense");
    expect(s?.payee).toBe("FRESH MART");
    expect(s?.reference).toBe("987654321");
    expect(s).not.toHaveProperty("body");
    expect(parseSms("x", "Rs. 500 credited to account", Date.now())?.type).toBe(
      "income",
    );
  });
  it("ignores failed, OTP, reversal and reminder messages", () => {
    for (const body of [
      "INR 200 payment failed",
      "OTP 123456 for INR 200 paid",
      "INR 200 debited then reversed",
      "INR 200 due reminder",
    ])
      expect(parseSms("x", body, Date.now())).toBeNull();
  });
  it("flags potential manual duplicates and exact SMS matches", () => {
    const s = parseSms("123", "Rs 100 paid to SHOP", Date.parse("2026-11-14"))!;
    s.date = "2026-11-14";
    expect(duplicate(s, [entry()])?.id).toBe("one");
    expect(
      duplicate({ ...s, amount: 500 }, [entry({ smsId: "123" })])?.id,
    ).toBe("one");
  });
});
describe("portable records", () => {
  it("round trips backups including recoverable deletions", () => {
    const d = {
      ...initial(),
      accounts: [bank],
      entries: [entry({ deleted: true })],
    };
    expect(readBackup(JSON.stringify(d))).toEqual(d);
  });
  it("rejects broken backup associations and duplicate transaction ids", () => {
    for (const d of [
      { ...initial(), entries: [entry()] },
      { ...initial(), accounts: [bank], entries: [entry(), entry()] },
      { ...initial(), accounts: [{ ...bank, opening: 1.1 }] },
    ])
      expect(() => readBackup(JSON.stringify(d))).toThrow();
  });
  it("quotes CSV fields and neutralizes spreadsheet formulas", () => {
    const text = csv(
      [entry({ payee: "=1+1", note: 'one,"two"\nthree' })],
      [bank],
    );
    expect(text).toContain('"\'=1+1"');
    expect(text).toContain('"one,""two""\nthree"');
  });
});
