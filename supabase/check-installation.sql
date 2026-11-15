-- Read-only: run in the Supabase SQL editor. Does not change accounts or records.
-- 1. Expected tables and row-level security.
with expected(name) as (values ('households'),('members'),('invitations'),('household_entries'),('backups'))
select e.name as table_name, c.oid is not null as installed,
       coalesce(c.relrowsecurity,false) as rls_enabled
from expected e left join pg_class c on c.oid=to_regclass('public.'||e.name)
order by e.name;

-- 2. Exact function signatures and execution grants.
with expected(signature) as (values
 ('public.create_household(text,text)'),('public.create_invite()'),
 ('public.accept_invite(text,text)'),('public.remove_member(uuid)'),
 ('public.household_snapshot()'),('public.put_household_entry(uuid,jsonb,integer,text)'),
 ('public.save_backup(jsonb,integer)'),('public.get_backup()')),
functions as (select signature,to_regprocedure(signature) as oid from expected)
select signature,oid is not null as installed,
 case when oid is not null then has_function_privilege('authenticated',oid,'EXECUTE') else false end as signed_in_can_execute,
 case when oid is not null then has_function_privilege('anon',oid,'EXECUTE') else false end as anonymous_can_execute
from functions order by signature;

-- 3. If backups exists, run this separately to check whether an account has a copy.
-- Email and counts only; no tokens, account balances or transaction details.
select u.email, b.user_id is not null as has_saved_backup, b.updated as backup_updated,
       coalesce(jsonb_array_length(b.payload->'accounts'),0) as saved_accounts,
       coalesce(jsonb_array_length(b.payload->'entries'),0) as saved_records
from auth.users u left join public.backups b on b.user_id=u.id
order by u.created_at desc;
