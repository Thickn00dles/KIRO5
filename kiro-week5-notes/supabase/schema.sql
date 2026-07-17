-- =============================================================
-- kiro-week5-notes — database schema + Row-Level Security
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- =============================================================

-- 1. Notes table -------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null,
  body        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helpful index for the common "my notes, newest first" query.
create index if not exists notes_user_id_created_at_idx
  on public.notes (user_id, created_at desc);

-- 2. Keep updated_at fresh on every update ----------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

-- 3. Row-Level Security -----------------------------------------
-- Turn RLS ON so the anon key alone cannot read/write arbitrary rows.
alter table public.notes enable row level security;

-- Each policy scopes access to rows owned by the signed-in user.
drop policy if exists "Users can view their own notes" on public.notes;
create policy "Users can view their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);
