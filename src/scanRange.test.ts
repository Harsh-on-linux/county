import { describe, expect, it } from "vitest";
import { scanBounds } from "./scanRange";
import { initial, readBackup } from "./domain";

describe("message scan dates and account appearance", () => {
  it("includes the whole final local day and excludes the next midnight", () => {
    const bounds = scanBounds({ from: "2026-11-01", to: "2026-11-15" });
    expect(bounds.since).toBe(+new Date(2026, 10, 1));
    expect(bounds.until).toBe(+new Date(2026, 10, 16));
    const single = scanBounds({ from: "2026-11-15", to: "2026-11-15" });
    expect(single.until).toBe(+new Date(2026, 10, 16));
    expect(single.since).toBe(+new Date(2026, 10, 15));
  });
  it("rejects reversed, empty, and impossible dates", () => {
    for (const range of [
      { from: "2026-11-15", to: "2026-11-01" },
      { from: "", to: "2026-11-01" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-13-01", to: "2026-13-05" },
    ])
      expect(() => scanBounds(range)).toThrow("valid start and end date");
  });
  it("keeps older accounts readable, and round-trips colours and scan dates", () => {
    const account = {
      id: "bank",
      name: "Savings",
      type: "bank",
      opening: 200000,
    };
    const old = { ...initial(), accounts: [account] };
    expect(readBackup(JSON.stringify(old))).toEqual(old);
    const updated = {
      ...old,
      accounts: [{ ...account, color: "blue" }],
      smsScanRange: { from: "2026-11-01", to: "2026-11-15" },
    };
    expect(readBackup(JSON.stringify(updated))).toEqual(updated);
    expect(() =>
      readBackup(
        JSON.stringify({
          ...updated,
          accounts: [{ ...account, color: "invalid" }],
        }),
      ),
    ).toThrow("Invalid account");
    expect(() =>
      readBackup(
        JSON.stringify({
          ...updated,
          smsScanRange: { from: "2026-11-16", to: "2026-11-15" },
        }),
      ),
    ).toThrow("Invalid saved message scan dates");
  });
});
