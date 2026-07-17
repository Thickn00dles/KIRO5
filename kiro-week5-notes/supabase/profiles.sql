-- =============================================================
-- Player profiles — stores each user's chosen display name.
-- The leaderboard reads names from here, so changing your name
-- updates it everywhere (including past scores) instantly.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- =============================================================

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can read all display names (needed for the leaderboard).
drop policy if exists "Authenticated users can read all profiles" on public.profiles;
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may create only their own profile row.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A user may update only their own profile row.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
