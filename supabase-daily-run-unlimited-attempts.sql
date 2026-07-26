-- Daily Run rollout: make every verified run ranked, with no daily attempt cap.
-- Safe to run after the currently deployed supabase-daily-run.sql.
--
-- The existing server switch is retained so this policy can be reversed without
-- another schema migration. The player-facing game treats this as the permanent
-- Daily Run policy rather than a debug mode.

alter table public.daily_run_config
  alter column debug_unlimited_attempts set default true;

insert into public.daily_run_config (
  singleton,
  debug_unlimited_attempts,
  updated_at
)
values (
  true,
  true,
  now()
)
on conflict (singleton) do update
set debug_unlimited_attempts = excluded.debug_unlimited_attempts,
    updated_at = excluded.updated_at;
