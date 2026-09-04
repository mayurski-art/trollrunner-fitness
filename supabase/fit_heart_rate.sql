-- ============================================================================
-- TROLLRUNNER FITNESS — add avg_heart_rate (bpm) to activities. Run ONCE in
-- the shared Supabase project → SQL Editor. Idempotent — safe to re-run.
--
-- Backs the Running Fitness card's Efficiency Factor (pace / heart rate),
-- which needs real HR to mean anything — see src/lib/coach/efficiency.ts.
-- Sane human range only; this is average HR for a session, not a live feed.
-- ============================================================================

alter table public.fit_activities
  add column if not exists avg_heart_rate smallint check (avg_heart_rate between 30 and 230);
