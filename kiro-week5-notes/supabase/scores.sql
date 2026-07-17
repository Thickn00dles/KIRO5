-- =============================================================
-- Reverse Snake — scores / leaderboard table + Row-Level Security
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- =============================================================

-- 1. Scores table ----------------------------------------------
create table if not exists public.scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  player_name  text not null,
  score        integer not null check (score >= 0),
  created_at   timestamptz not null default now()
);

-- Index for the "top scores" leaderboard query.
create index if not exists scores_score_desc_idx
  on public.scores (score desc);

-- Index for looking up a user's own best score quickly.
create index if not exists scores_user_id_idx
  on public.scores (user_id);

-- 2. Row-Level Security -----------------------------------------
alter table public.scores enable row level security;

-- Anyone signed in can READ all scores (needed for a shared leaderboard).
drop policy if exists "Authenticated users can read all scores" on public.scores;
create policy "Authenticated users can read all scores"
  on public.scores for select
  to authenticated
  using (true);

-- A user may INSERT only their own score rows.
drop policy if exists "Users can insert their own scores" on public.scores;
create policy "Users can insert their own scores"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update or delete policies: scores are immutable once recorded.
