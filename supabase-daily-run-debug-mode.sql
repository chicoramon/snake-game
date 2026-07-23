-- Temporary Daily Run debugging switch.
-- Prerequisite: rerun the current supabase-daily-run.sql once so the config
-- table and unlimited-attempt-aware RPC definitions are installed.

-- Enable unlimited ranked attempts. The RPCs return -1 as the explicit
-- unlimited sentinel, and the client labels the mode as DEBUG.
update public.daily_run_config
set debug_unlimited_attempts = true,
    updated_at = now()
where singleton = true;

select debug_unlimited_attempts, updated_at
from public.daily_run_config
where singleton = true;

-- Before production launch, disable debug mode with:
--
-- update public.daily_run_config
-- set debug_unlimited_attempts = false,
--     updated_at = now()
-- where singleton = true;
