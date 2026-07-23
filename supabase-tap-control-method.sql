-- Enable the TAP control method in the already-deployed leaderboard and
-- Daily Run schema. Run this once in the Supabase SQL Editor.

alter table public.leaderboard
  drop constraint if exists leaderboard_control_method_check;

alter table public.leaderboard
  add constraint leaderboard_control_method_check
  check (control_method in ('dpad', 'turn', 'tap', 'keyboard', 'legacy'));

alter table public.daily_attempts
  drop constraint if exists daily_attempts_control_method_check;

alter table public.daily_attempts
  add constraint daily_attempts_control_method_check
  check (control_method is null or control_method in ('dpad', 'turn', 'tap', 'keyboard', 'mixed'));

create or replace function public.submit_best_score(
  p_score integer,
  p_theme text,
  p_control_method text,
  p_game_mode text,
  p_run_id uuid
)
returns table (
  accepted boolean,
  personal_best integer,
  is_new_top boolean,
  previous_top_score integer,
  leaderboard_rank integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.player_profiles%rowtype;
  v_previous_top integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_score is null or p_score < 1 or p_score > 1000000 then
    raise exception 'Invalid score';
  end if;

  if p_control_method not in ('dpad', 'turn', 'tap', 'keyboard') then
    raise exception 'Invalid control method';
  end if;

  if p_game_mode not in ('classic', 'sprint') then
    raise exception 'Invalid game mode';
  end if;

  if p_theme is null or p_theme !~ '^[a-z0-9_]{1,32}$' then
    raise exception 'Invalid theme';
  end if;

  if p_run_id is null then
    raise exception 'Run ID required';
  end if;

  select * into v_profile
  from public.player_profiles
  where id = v_uid;

  if not found then
    raise exception 'Player initials required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('snake-leaderboard:' || p_game_mode, 0)
  );

  select max(l.score) into v_previous_top
  from public.leaderboard l
  where l.game_mode = p_game_mode;

  insert into public.leaderboard (
    name, score, theme, control_method, game_mode,
    player_id, player_code, run_id, created_at, updated_at
  ) values (
    v_profile.initials, p_score, p_theme, p_control_method, p_game_mode,
    v_uid, v_profile.player_code, p_run_id, now(), now()
  )
  on conflict (player_id, game_mode, control_method) do update
    set name = excluded.name,
        score = excluded.score,
        theme = excluded.theme,
        player_code = excluded.player_code,
        run_id = excluded.run_id,
        created_at = now(),
        updated_at = now()
    where excluded.score > public.leaderboard.score;

  return query
    select
      (l.run_id = p_run_id and l.score = p_score) as accepted,
      l.score as personal_best,
      (
        l.run_id = p_run_id
        and l.score = p_score
        and p_score > coalesce(v_previous_top, 0)
      ) as is_new_top,
      v_previous_top as previous_top_score,
      (
        1 + (
          select count(*)::integer
          from public.leaderboard ranked
          where ranked.game_mode = p_game_mode
            and ranked.score > l.score
        )
      )::integer as leaderboard_rank
    from public.leaderboard l
    where l.player_id = v_uid
      and l.game_mode = p_game_mode
      and l.control_method = p_control_method;
end;
$$;

revoke all on function public.submit_best_score(integer, text, text, text, uuid)
  from public, anon;
grant execute on function public.submit_best_score(integer, text, text, text, uuid)
  to authenticated;

comment on column public.leaderboard.control_method is
  'Ranked input category: dpad, turn, tap, keyboard, or legacy for pre-migration scores.';
