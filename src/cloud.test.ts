import { beforeAll, beforeEach, it, expect, vi } from "vitest";
import { initial, type Entry, type SharedEntry } from "./domain";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), set: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@capacitor/preferences", () => ({ Preferences: { set: mocks.set } }));
let cloud: typeof import("./cloud");
beforeAll(async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test");
  cloud = await import("./cloud");
});
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.set.mockReset();
  mocks.set.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
});
const e: Entry = {
  id: "one",
  type: "expense",
  amount: 100,
  account: "private-account",
  category: "Other",
  payee: "Shop",
  note: "Note",
  date: "2026-11-14",
  shared: true,
  updated: "2026-11-14T00:00:00Z",
  smsId: "private-sms",
};
it("does not republish unchanged household expenses", async () => {
  await cloud.syncShared(
    { ...initial(), entries: [e] },
    { one: { revision: 1, fingerprint: cloud.fingerprint(e) } },
    [],
    "me",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("pushes an allowlisted projection without private account or SMS identity", async () => {
  await cloud.syncShared(
    { ...initial(), name: "Me", entries: [e] },
    {},
    [],
    "me",
  );
  const args = mocks.rpc.mock.calls[0][1];
  expect(args.entry_payload.account).toBe("");
  expect(args.entry_payload.smsId).toBeUndefined();
  expect(args.expected_revision).toBe(0);
});
it("pulls owner edits into the creator ledger preserving private associations", async () => {
  const remote: SharedEntry = {
    id: "one",
    creator: "me",
    payer: "Me",
    revision: 2,
    payload: { ...e, amount: 200, account: "", smsId: undefined },
  };
  const result = await cloud.syncShared(
    { ...initial(), entries: [e] },
    { one: { revision: 1, fingerprint: cloud.fingerprint(e) } },
    [remote],
    "me",
  );
  expect(result.entries[0].amount).toBe(200);
  expect(result.entries[0].account).toBe("private-account");
  expect(result.entries[0].smsId).toBe("private-sms");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("preserves simultaneous edits for explicit conflict resolution", async () => {
  const remote: SharedEntry = {
    id: "one",
    creator: "me",
    payer: "Me",
    revision: 2,
    payload: { ...e, amount: 300 },
  };
  await expect(
    cloud.syncShared(
      { ...initial(), entries: [{ ...e, amount: 200 }] },
      { one: { revision: 1, fingerprint: cloud.fingerprint(e) } },
      [remote],
      "me",
    ),
  ).rejects.toBeInstanceOf(cloud.SharedConflict);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("withdraws an expense when converted to another transaction type", async () => {
  await cloud.syncShared(
    { ...initial(), entries: [{ ...e, type: "income", shared: false }] },
    { one: { revision: 1, fingerprint: cloud.fingerprint(e) } },
    [],
    "me",
  );
  expect(mocks.rpc.mock.calls[0][1].entry_payload.deleted).toBe(true);
  expect(mocks.rpc.mock.calls[0][1].entry_payload.type).toBe("expense");
});
