-- First-class Bluetooth / USB controller input support.
-- Run once in the Supabase SQL editor, then redeploy the Daily Run and
-- Live Vs submission Edge Functions from this same source revision.

alter table if exists public.leaderboard
  drop constraint if exists leaderboard_control_method_check;
alter table if exists public.leaderboard
  add constraint leaderboard_control_method_check
  check (control_method in ('dpad', 'turn', 'tap', 'keyboard', 'controller', 'legacy'));

alter table if exists public.daily_attempts
  drop constraint if exists daily_attempts_control_method_check;
alter table if exists public.daily_attempts
  add constraint daily_attempts_control_method_check
  check (control_method is null or control_method in ('dpad', 'turn', 'tap', 'keyboard', 'controller', 'mixed'));

alter table if exists public.player_run_stats
  drop constraint if exists player_run_stats_control_check;
alter table if exists public.player_run_stats
  add constraint player_run_stats_control_check
  check (control_method in ('dpad', 'turn', 'tap', 'keyboard', 'controller', 'mixed', 'unknown'));

-- Preserve the currently deployed function bodies and extend only their
-- explicit control-method allow-lists. The guarded replacement makes this
-- migration safe across the current dashboard and CLI deployments.
do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.submit_best_score(integer,text,text,text,uuid)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    '(''dpad'', ''turn'', ''tap'', ''keyboard'')',
    '(''dpad'', ''turn'', ''tap'', ''keyboard'', ''controller'')'
  );
  if v_updated = v_definition and position('controller' in v_definition) = 0 then
    raise exception 'Could not extend submit_best_score control-method validation';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.submit_career_run(jsonb)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    '(''dpad'', ''turn'', ''tap'', ''keyboard'', ''mixed'', ''unknown'')',
    '(''dpad'', ''turn'', ''tap'', ''keyboard'', ''controller'', ''mixed'', ''unknown'')'
  );
  if v_updated = v_definition and position('controller' in v_definition) = 0 then
    raise exception 'Could not extend submit_career_run control-method validation';
  end if;
  execute v_updated;
end;
$$;

comment on column public.leaderboard.control_method is
  'Ranked input category: dpad, turn, tap, keyboard, controller, or legacy for pre-migration scores.';
