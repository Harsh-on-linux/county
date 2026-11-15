import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
const owner = "10000000-0000-4000-8000-000000000001",
  mom = "10000000-0000-4000-8000-000000000002",
  stranger = "10000000-0000-4000-8000-000000000003",
  id = "20000000-0000-4000-8000-000000000001";
let db: PGlite;
async function as(user: string) {
  await db.exec(`set request.jwt.claim.sub='${user}';set role authenticated;`);
}
async function call(sql: string, args: unknown[] = []) {
  return db.query(sql, args);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${mom}'),('${stranger}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create function public.gen_random_bytes(integer) returns bytea language sql as $$select decode(replace(gen_random_uuid()::text,'-',''),'hex')$$;`,
  );
  const sql = (await readFile("supabase/schema.sql", "utf8")).replace(
    "create extension if not exists pgcrypto;",
    "",
  );
  await db.exec(sql);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("enforces family membership, field privacy, ownership, revisions, and revocation", async () => {
  await as(owner);
  await call("select create_household($1,$2)", ["Our home", "Harsh"]);
  const invite = (await call("select create_invite() as code")).rows[0] as {
    code: string;
  };
  await as(mom);
  await call("select accept_invite($1,$2)", [invite.code, "Mom"]);
  await expect(call("select create_invite()")).rejects.toThrow(
    "Only the household owner",
  );
  const payload = {
    id,
    type: "expense",
    amount: 85000,
    account: "PRIVATE-BANK-ID",
    smsId: "PRIVATE-SMS-ID",
    category: "Groceries",
    payee: "Fresh Mart",
    note: "Dinner",
    date: "2026-11-14",
    shared: true,
  };
  await call("select put_household_entry($1,$2,0,$3)", [
    id,
    JSON.stringify(payload),
    "Mom",
  ]);
  const snap = (await call("select household_snapshot() as s")).rows[0] as any;
  expect(snap.s.entries[0].payload.account).toBe("");
  expect(snap.s.entries[0].payload).not.toHaveProperty("smsId");
  await expect(call("select * from backups")).rejects.toThrow(
    "permission denied",
  );
  await as(stranger);
  expect(
    ((await call("select household_snapshot() as s")).rows[0] as any).s
      .household,
  ).toBeNull();
  await expect(
    call("select put_household_entry($1,$2,1,$3)", [
      id,
      JSON.stringify(payload),
      "Stranger",
    ]),
  ).rejects.toThrow("Connect to a household");
  await as(owner);
  const token = (await call("select create_invite() as code")).rows[0] as {
    code: string;
  };
  await as(stranger);
  await call("select accept_invite($1,$2)", [token.code, "Dad"]);
  await expect(
    call("select put_household_entry($1,$2,1,$3)", [
      id,
      JSON.stringify(payload),
      "Dad",
    ]),
  ).rejects.toThrow("cannot change this entry");
  await as(owner);
  await call("select put_household_entry($1,$2,1,$3)", [
    id,
    JSON.stringify({ ...payload, amount: 90000 }),
    "Harsh",
  ]);
  await as(mom);
  await expect(
    call("select put_household_entry($1,$2,1,$3)", [
      id,
      JSON.stringify(payload),
      "Mom",
    ]),
  ).rejects.toThrow("changed on another phone");
  await as(owner);
  await call("select remove_member($1)", [mom]);
  await as(mom);
  expect(
    ((await call("select household_snapshot() as s")).rows[0] as any).s
      .household,
  ).toBeNull();
  await expect(
    call("select put_household_entry($1,$2,2,$3)", [
      id,
      JSON.stringify(payload),
      "Mom",
    ]),
  ).rejects.toThrow("Connect to a household");
});
it("isolates private backups and prevents stale writes", async () => {
  await as(owner);
  const snapshot = { version: 1, accounts: [], entries: [] };
  await call("select save_backup($1,0)", [JSON.stringify(snapshot)]);
  await expect(
    call("select save_backup($1,0)", [JSON.stringify(snapshot)]),
  ).rejects.toThrow("newer cloud backup");
  await as(stranger);
  expect(
    ((await call("select get_backup() as b")).rows[0] as any).b,
  ).toBeNull();
  await db.exec("reset role;set role anon;");
  await expect(call("select get_backup()")).rejects.toThrow(
    "permission denied",
  );
});
