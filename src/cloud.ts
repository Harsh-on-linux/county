import { createClient } from "@supabase/supabase-js";
import type { Data, Entry, SharedEntry } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud = url && key ? createClient(url, key) : null;
export type Household = { id: string; name: string; owner: string };
export type Member = { user_id: string; name: string };
export async function rpc<T>(name: string, args = {}): Promise<T> {
  if (!cloud) throw new Error("Cloud is not configured for this build.");
  const { data, error } = await cloud.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function household(): Promise<{
  household: Household | null;
  members: Member[];
  entries: SharedEntry[];
}> {
  return rpc("household_snapshot");
}
import { Preferences } from "@capacitor/preferences";
export type SyncMark = { revision: number; fingerprint: string };
export function fingerprint(e: Entry) {
  return JSON.stringify([
    e.amount,
    e.category,
    e.payee,
    e.note,
    e.date,
    !!e.deleted || !e.shared,
    e.type,
  ]);
}
export class SharedConflict extends Error {
  constructor(
    public local: Entry,
    public remote: SharedEntry,
    public remoteOnly = false,
  ) {
    super("A shared expense has two versions. Choose which one to keep.");
  }
}
export async function syncShared(
  data: Data,
  marks: Record<string, SyncMark>,
  snapshot: SharedEntry[],
  userId: string,
): Promise<Data> {
  let next = { ...data, entries: [...data.entries] };
  const persist = () =>
    Preferences.set({
      key: "county-marks-" + userId,
      value: JSON.stringify(marks),
    });
  for (const remote of snapshot.filter((s) => s.creator === userId)) {
    const local = next.entries.find((e) => e.id === remote.id);
    if (!local) continue; // Household records cannot reconstruct private account associations.
    const mark = marks[local.id];
    if (remote.revision !== mark?.revision) {
      if (mark && fingerprint(local) !== mark.fingerprint)
        throw new SharedConflict(local, remote);
      if (!mark && fingerprint(local) !== fingerprint(remote.payload))
        throw new SharedConflict(local, remote);
      const merged = {
        ...local,
        ...remote.payload,
        account: local.account,
        to: local.to,
        smsId: local.smsId,
      };
      next.entries = next.entries.map((e) => (e.id === local.id ? merged : e));
      marks[local.id] = {
        revision: remote.revision,
        fingerprint: fingerprint(merged),
      };
      await persist();
    }
  }
  for (const entry of next.entries.filter(
    (e) => (e.type === "expense" && e.shared) || marks[e.id],
  )) {
    if (marks[entry.id]?.fingerprint === fingerprint(entry)) continue;
    const payload = {
      ...entry,
      type: "expense",
      account: "",
      to: undefined,
      smsId: undefined,
      deleted: !!entry.deleted || !entry.shared || entry.type !== "expense",
    };
    const revision = await rpc<number>("put_household_entry", {
      entry_id: entry.id,
      entry_payload: payload,
      expected_revision: marks[entry.id]?.revision || 0,
      payer_name: data.name,
    });
    marks[entry.id] = { revision, fingerprint: fingerprint(entry) };
    await persist();
  }
  return next;
}
export async function editShared(entry: SharedEntry, payload: Entry) {
  return rpc<number>("put_household_entry", {
    entry_id: entry.id,
    entry_payload: payload,
    expected_revision: entry.revision,
    payer_name: entry.payer,
  });
}
