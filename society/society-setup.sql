-- =====================================================================
-- HF Solutions — Property Society Core (society-app.html)
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again: it only creates what is missing.
-- It does NOT touch hf_clients, hf_entries, hf_bookings or any other table's data.
-- =====================================================================

-- 1) Records table: one row per investor / land deal / commission deal /
--    receipt / payment / settings. Deletes are soft (deleted_at), nothing is lost.
create table if not exists public.hf_society(
  owner_uid  uuid not null default auth.uid(),
  client_id  text not null,
  coll       text not null check (coll in ('investors','purchases','deals','receipts','outflows','settings')),
  doc_id     text not null check (length(doc_id) between 1 and 200),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_uid, coll, doc_id)
);
comment on table public.hf_society is 'HF Solutions — Property Society Core records. Soft deletes (deleted_at).';

-- 2) Security: each client sees and writes ONLY its own rows; HF admin can read.
alter table public.hf_society enable row level security;

drop policy if exists hf_society_own on public.hf_society;
create policy hf_society_own on public.hf_society for all to authenticated
  using (owner_uid = auth.uid())
  with check (owner_uid = auth.uid() and client_id = 'c_' || left(auth.uid()::text, 8));

drop policy if exists hf_society_admin_read on public.hf_society;
create policy hf_society_admin_read on public.hf_society for select to authenticated
  using (exists (select 1 from public.hf_admins a where a.uid = auth.uid()));

create index if not exists hf_society_owner_updated on public.hf_society(owner_uid, updated_at);

create or replace function public.hf_society_touch() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists hf_society_touch on public.hf_society;
create trigger hf_society_touch before update on public.hf_society
  for each row execute function public.hf_society_touch();

revoke all on public.hf_society from anon;
grant select, insert, update on public.hf_society to authenticated;

-- 3) Setup packet for the society client (same job Admin does for other cores).
--    Society details are taken from royalswisshousing.com. The address/phone are the
--    Multan office shown on the website — change them if the sub-branch has its own.
--    CHANGE 'society1' (two places) to the login you create in
--    Authentication → Users (email = <login>@hfsolutions.app).
--    Everything here can be edited later inside the app (⚙ Settings).
insert into public.hf_setup (login, core_id, name, data, created_by)
select 'society1', 'society', 'Royal Swiss Housing — Sub Branch',
       jsonb_build_object('settings', jsonb_build_object(
         'soc','Royal Swiss Housing', 'socUr','رائل سوئس ہاؤسنگ',
         'branch','Sub Branch', 'branchUr','سب برانچ',
         'addr','House 253-D, Northern Bypass, near Nigana Chowk, Multan',
         'phone','061-6216008',
         'p1en','Malik Ashraf Aheer', 'p1ur','ملک اشرف اہیر', 'p1',50,
         'p2en','Captain Azad', 'p2ur','کیپٹن آزاد', 'p2',50)),
       (select uid from public.hf_admins order by at limit 1)
where not exists (select 1 from public.hf_setup where login = 'society1' and core_id = 'society');

-- 4) Check (should list the new table and the packet):
select 'table ok' as check, count(*) as rows from public.hf_society
union all
select 'packet ' || login || ' / ' || core_id, 1 from public.hf_setup where core_id = 'society';
