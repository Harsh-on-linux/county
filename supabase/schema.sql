-- Run once in a new Supabase project's SQL editor. No service-role key goes in the app.
create table public.households(id uuid primary key default gen_random_uuid(),name text not null,owner uuid not null references auth.users(id));
create table public.members(household_id uuid references public.households(id) on delete cascade,user_id uuid primary key references auth.users(id),name text not null);
create table public.invitations(code text primary key default replace(gen_random_uuid()::text,'-',''),household_id uuid references public.households(id) on delete cascade,expires timestamptz not null default now()+interval '24 hours');
create table public.household_entries(id uuid primary key,household_id uuid not null references public.households(id),creator uuid not null references auth.users(id),payer text not null,payload jsonb not null,revision integer not null default 1);
create table public.backups(user_id uuid primary key references auth.users(id),payload jsonb not null,revision integer not null default 1,updated timestamptz not null default now());
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.household_entries enable row level security;
alter table public.backups enable row level security;
-- Tables have no client policies: access is through narrowly scoped RPCs below.
revoke all on public.households,public.members,public.invitations,public.household_entries,public.backups from anon,authenticated;

create function public.create_household(household_name text,member_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if length(trim(household_name)) not between 1 and 60 or length(trim(member_name)) not between 1 and 40 then raise exception 'Enter a household name and your name'; end if;
 if exists(select 1 from members where user_id=auth.uid()) then raise exception 'You already belong to a household'; end if;
 insert into households(name,owner) values(trim(household_name),auth.uid()) returning id into hid;
 insert into members values(hid,auth.uid(),trim(member_name)); return hid;
end $$;
create function public.create_invite() returns text language plpgsql security definer set search_path=public as $$
declare hid uuid; token text;
begin
 select id into hid from households where owner=auth.uid();
 if hid is null then raise exception 'Only the household owner can invite members'; end if;
 insert into invitations(household_id) values(hid) returning code into token;return token;
end $$;
create function public.accept_invite(invite_code text,member_name text) returns void language plpgsql security definer set search_path=public as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if length(trim(member_name)) not between 1 and 40 then raise exception 'Enter your name'; end if;
 if exists(select 1 from members where user_id=auth.uid()) then raise exception 'You already belong to a household'; end if;
 delete from invitations where code=invite_code and expires>now() returning household_id into hid;
 if hid is null then raise exception 'Invitation is invalid, expired, or already used'; end if;
 insert into members values(hid,auth.uid(),trim(member_name));
end $$;
create function public.remove_member(member_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if member_id=auth.uid() then raise exception 'The owner cannot remove themselves'; end if;
 delete from members m using households h where m.household_id=h.id and h.owner=auth.uid() and m.user_id=member_id;
end $$;
create function public.household_snapshot() returns jsonb language plpgsql security definer set search_path=public as $$
declare hid uuid;result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select household_id into hid from members where user_id=auth.uid();
 if hid is null then return jsonb_build_object('household',null,'members','[]'::jsonb,'entries','[]'::jsonb); end if;
 select jsonb_build_object('household',(select to_jsonb(h) from households h where id=hid),'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',m.name)) from members m where household_id=hid),'[]'::jsonb),'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'creator',e.creator,'payer',e.payer,'payload',e.payload,'revision',e.revision)) from household_entries e where household_id=hid),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.put_household_entry(entry_id uuid,entry_payload jsonb,expected_revision integer,payer_name text) returns integer language plpgsql security definer set search_path=public as $$
declare hid uuid; existing household_entries; nextrev integer; clean jsonb;
begin
 select household_id into hid from members where user_id=auth.uid();
 if hid is null then raise exception 'Connect to a household first'; end if;
 if entry_payload->>'type'<>'expense' or (entry_payload->>'amount')::bigint<=0 or (entry_payload->>'date')::date is null then raise exception 'Invalid household expense'; end if;
 -- Explicit allowlist: never store private account IDs, SMS IDs, or other accounts.
 clean=jsonb_build_object('id',entry_id,'type','expense','amount',(entry_payload->>'amount')::bigint,'account','','category',left(entry_payload->>'category',100),'payee',left(entry_payload->>'payee',100),'note',left(entry_payload->>'note',500),'date',entry_payload->>'date','shared',true,'deleted',coalesce((entry_payload->>'deleted')::boolean,false),'updated',now());
 select * into existing from household_entries where id=entry_id for update;
 if found then
  if existing.household_id<>hid or (existing.creator<>auth.uid() and not exists(select 1 from households where id=hid and owner=auth.uid())) then raise exception 'You cannot change this entry'; end if;
  if existing.revision<>expected_revision then raise exception 'This shared expense changed on another phone. Review both versions before retrying.'; end if;
  nextrev=existing.revision+1;
  update household_entries set payload=clean,revision=nextrev where id=entry_id;
 else
  if expected_revision<>0 then raise exception 'Shared entry no longer exists'; end if;
  nextrev=1;insert into household_entries values(entry_id,hid,auth.uid(),left(payer_name,40),clean,nextrev);
 end if;return nextrev;
end $$;
create function public.save_backup(snapshot jsonb,expected_revision integer) returns integer language plpgsql security definer set search_path=public as $$
declare rev integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if snapshot->>'version'<>'1' or jsonb_typeof(snapshot->'entries')<>'array' or jsonb_typeof(snapshot->'accounts')<>'array' then raise exception 'Invalid backup'; end if;
 select revision into rev from backups where user_id=auth.uid() for update;
 if found then
  if rev<>expected_revision then raise exception 'A newer cloud backup exists. Export this phone before restoring the cloud backup in Settings.'; end if;
  rev=rev+1;update backups set payload=snapshot,revision=rev,updated=now() where user_id=auth.uid();
 else rev=1;insert into backups(user_id,payload) values(auth.uid(),snapshot);end if;
 return rev;
end $$;
create function public.get_backup() returns jsonb language sql security definer set search_path=public as $$ select jsonb_build_object('payload',payload,'revision',revision) from backups where user_id=auth.uid() $$;
revoke execute on function public.create_household(text,text),public.create_invite(),public.accept_invite(text,text),public.remove_member(uuid),public.household_snapshot(),public.put_household_entry(uuid,jsonb,integer,text),public.save_backup(jsonb,integer),public.get_backup() from public,anon;
grant execute on function public.create_household(text,text),public.create_invite(),public.accept_invite(text,text),public.remove_member(uuid),public.household_snapshot(),public.put_household_entry(uuid,jsonb,integer,text),public.save_backup(jsonb,integer),public.get_backup() to authenticated;
