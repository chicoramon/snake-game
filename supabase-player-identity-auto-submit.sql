-- Run once in the Supabase SQL editor after the control-method and game-mode
-- migrations, before deploying the matching HTML update.
--
-- Dashboard prerequisites:
--   Authentication > Providers > Allow anonymous sign-ins: ON
--   Authentication > Settings > Manual identity linking: ON
--   Email provider: ON, using an 8-digit OTP email template
--   Custom SMTP: optional for now; add later if broader email delivery is needed
--
-- Existing leaderboard rows remain public legacy records. New authenticated
-- players keep one personal best per game mode and control method.

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  initials text not null,
  player_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_profiles_initials_check
    check (initials ~ '^[A-Z0-9]{1,3}$'),
  constraint player_profiles_code_check
    check (player_code ~ '^[A-F0-9]{4}$')
);

alter table public.player_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_profiles'
      and policyname = 'Players can read their own profile'
  ) then
    create policy "Players can read their own profile"
      on public.player_profiles for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;
end $$;

revoke all on public.player_profiles from anon;
revoke insert, update, delete on public.player_profiles from authenticated;
grant select on public.player_profiles to authenticated;

alter table public.leaderboard
  add column if not exists player_id uuid references auth.users(id) on delete set null,
  add column if not exists player_code text,
  add column if not exists run_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists leaderboard_player_mode_control_best_uidx
  on public.leaderboard (player_id, game_mode, control_method);

create index if not exists leaderboard_player_lookup_idx
  on public.leaderboard (player_id, game_mode, control_method);

alter table public.leaderboard enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard'
      and policyname = 'Leaderboard scores are public'
  ) then
    create policy "Leaderboard scores are public"
      on public.leaderboard for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- New writes go through submit_best_score(), which derives ownership and the
-- public display identity on the server. The browser cannot write another
-- player's rows directly.
revoke insert, update, delete on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

create or replace function public.set_player_initials(p_initials text)
returns table (initials text, player_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_initials text := upper(trim(p_initials));
  v_code text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_initials !~ '^[A-Z0-9]{1,3}$' then
    raise exception 'Initials must contain 1 to 3 letters or numbers';
  end if;

  v_code := upper(substr(replace(v_uid::text, '-', ''), 1, 4));

  insert into public.player_profiles (id, initials, player_code)
  values (v_uid, v_initials, v_code)
  on conflict (id) do update
    set initials = excluded.initials,
        updated_at = now();

  update public.leaderboard
  set name = v_initials,
      player_code = v_code,
      updated_at = now()
  where player_id = v_uid;

  return query select v_initials, v_code;
end;
$$;

-- The return shape includes authoritative mode-wide placement. PostgreSQL cannot
-- change a function's OUT columns with CREATE OR REPLACE, so drop this exact
-- signature before recreating it.
drop function if exists public.submit_best_score(integer, text, text, text, uuid);

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

  -- Serialize submissions within one game mode so two simultaneous clients
  -- cannot both be told they established the undisputed mode-wide #1 record.
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

revoke all on function public.set_player_initials(text) from public, anon;
grant execute on function public.set_player_initials(text) to authenticated;

revoke all on function public.submit_best_score(integer, text, text, text, uuid)
  from public, anon;
grant execute on function public.submit_best_score(integer, text, text, text, uuid)
  to authenticated;

comment on table public.player_profiles is
  'Private player identity profile keyed by Supabase Auth user ID.';

comment on column public.leaderboard.player_code is
  'Short public discriminator shown beside duplicate arcade initials.';

comment on function public.submit_best_score(integer, text, text, text, uuid) is
  'Atomically keeps one authenticated personal best and returns confirmed mode-wide rank and undisputed new-top metadata.';
