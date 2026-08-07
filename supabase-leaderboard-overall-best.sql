-- Make the non-Daily ALL leaderboard show one overall best row per player
-- across control methods. Run this after:
--   1. supabase-player-identity-auto-submit.sql
--   2. supabase-tap-control-method.sql
--
-- Owned rows are deduplicated by the authoritative Supabase Auth player_id.
-- Legacy rows have no safe identity key, so they remain separate archive rows.

create or replace function public.get_overall_leaderboard(
  p_game_mode text,
  p_theme text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  leaderboard_rank bigint,
  total_count bigint,
  name text,
  score integer,
  theme text,
  control_method text,
  game_mode text,
  created_at timestamptz,
  player_id uuid,
  player_code text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with filtered as (
    select
      case
        when l.player_id is not null then 'player:' || l.player_id::text
        else 'legacy:' || row_number() over (
          order by
            l.score desc,
            l.created_at asc,
            l.name asc,
            l.control_method asc,
            l.theme asc
        )::text
      end as player_key,
      l.name,
      l.score,
      l.theme,
      l.control_method,
      l.game_mode,
      l.created_at,
      l.player_id,
      l.player_code
    from public.leaderboard l
    where l.game_mode = p_game_mode
      and (p_theme is null or l.theme = p_theme)
  ),
  player_rows as (
    select
      f.*,
      row_number() over (
        partition by f.player_key
        order by
          f.score desc,
          f.created_at asc,
          f.control_method asc,
          f.theme asc
      ) as player_best_order
    from filtered f
  ),
  overall_bests as (
    select *
    from player_rows
    where player_best_order = 1
  ),
  ranked as (
    select
      row_number() over (
        order by
          b.score desc,
          b.created_at asc,
          b.player_key asc
      ) as leaderboard_rank,
      count(*) over () as total_count,
      b.name,
      b.score,
      b.theme,
      b.control_method,
      b.game_mode,
      b.created_at,
      b.player_id,
      b.player_code
    from overall_bests b
  )
  select
    r.leaderboard_rank,
    r.total_count,
    r.name,
    r.score,
    r.theme,
    r.control_method,
    r.game_mode,
    r.created_at,
    r.player_id,
    r.player_code
  from ranked r
  order by r.leaderboard_rank
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_overall_leaderboard(text, text, integer, integer)
  from public;
grant execute on function public.get_overall_leaderboard(text, text, integer, integer)
  to anon, authenticated;

comment on function public.get_overall_leaderboard(text, text, integer, integer) is
  'Returns the mode-wide non-Daily leaderboard with one highest-scoring row per owned player across control methods, ranked and paginated after deduplication.';

-- Keep the rank returned immediately after a score submission consistent with
-- the ALL leaderboard. personal_best remains the submitted control method's
-- best, while leaderboard_rank represents the player's best score in the mode.
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
  v_overall_rank integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_score is null or p_score < 1 or p_score > 1000000 then
    raise exception 'Invalid score';
  end if;

  if p_control_method not in ('dpad', 'turn', 'tap', 'keyboard', 'controller') then
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

  with mode_rows as (
    select
      case
        when l.player_id is not null then 'player:' || l.player_id::text
        else 'legacy:' || row_number() over (
          order by
            l.score desc,
            l.created_at asc,
            l.name asc,
            l.control_method asc,
            l.theme asc
        )::text
      end as player_key,
      l.score,
      l.created_at,
      l.control_method,
      l.theme,
      l.player_id
    from public.leaderboard l
    where l.game_mode = p_game_mode
  ),
  player_rows as (
    select
      m.*,
      row_number() over (
        partition by m.player_key
        order by
          m.score desc,
          m.created_at asc,
          m.control_method asc,
          m.theme asc
      ) as player_best_order
    from mode_rows m
  ),
  ranked_entries as (
    select
      p.player_id,
      row_number() over (
        order by
          p.score desc,
          p.created_at asc,
          p.player_key asc
      )::integer as leaderboard_rank
    from player_rows p
    where p.player_best_order = 1
  )
  select r.leaderboard_rank into v_overall_rank
  from ranked_entries r
  where r.player_id = v_uid;

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
      v_overall_rank as leaderboard_rank
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

comment on function public.submit_best_score(integer, text, text, text, uuid) is
  'Atomically keeps one authenticated control-method best and returns the player mode-wide overall rank and undisputed new-top metadata.';
