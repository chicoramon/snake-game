-- Legacy compatibility alias for the permanent unlimited Daily Run policy.
-- New deployments should use supabase-daily-run-unlimited-attempts.sql.

-- Enable unlimited ranked runs. The RPCs return -1 as the internal unlimited
-- sentinel; the client presents this as the normal Daily Run policy.
update public.daily_run_config
set debug_unlimited_attempts = true,
    updated_at = now()
where singleton = true;

select debug_unlimited_attempts, updated_at
from public.daily_run_config
where singleton = true;
