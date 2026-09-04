-- ============================================================================
-- TROLLRUNNER FITNESS — body weight log. Run ONCE in the shared Supabase
-- project → SQL Editor. Idempotent — safe to re-run.
--
-- Separate from fit_profiles.weight_kg, which is a single onboarding
-- snapshot, not a time series. This backs the Body Mass card's weight trend.
-- Owner-only RLS, same model as fit_activities.
-- ============================================================================

create table if not exists public.fit_body_weight (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  logged_at     timestamptz not null default now(),
  weight_lb     numeric not null check (weight_lb > 0 and weight_lb < 1000),
  created_at    timestamptz not null default now()
);

create index if not exists fit_body_weight_user_logged_idx
  on public.fit_body_weight (user_id, logged_at desc);

alter table public.fit_body_weight enable row level security;

drop policy if exists fit_body_weight_owner on public.fit_body_weight;
create policy fit_body_weight_owner on public.fit_body_weight
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.fit_body_weight from anon;
grant select, insert, update, delete on public.fit_body_weight to authenticated;
