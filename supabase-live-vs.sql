-- Live Vs rooms and Realtime authorization.
-- Run this file in the Supabase SQL editor before enabling the Live Vs menu.

create extension if not exists pgcrypto;

create table if not exists public.live_vs_matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_player_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'countdown', 'running', 'verifying', 'complete', 'cancelled', 'expired')),
  seed bigint not null check (seed between 0 and 4294967295),
  theme text not null,
  duration_ms integer not null default 60000 check (duration_ms between 10000 and 300000),
  ruleset_version text not null default 'snake-rules-v1',
  board_cols integer not null default 20,
  board_rows integer not null default 32,
  starts_at timestamptz,
  winner_player_id uuid references auth.users(id) on delete set null,
  outcome text check (outcome is null or outcome in ('host', 'guest', 'draw', 'forfeit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create table if not exists public.live_vs_players (
  match_id uuid not null references public.live_vs_matches(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat in (1, 2)),
  ready boolean not null default false,
  connection_state text not null default 'online'
    check (connection_state in ('online', 'reconnecting', 'offline', 'forfeit')),
  score integer check (score is null or score >= 0),
  final_food_ms integer check (final_food_ms is null or final_food_ms >= 0),
  finish_reason text,
  control_method text,
  replay jsonb,
  verification_state text not null default 'pending'
    check (verification_state in ('pending', 'submitted', 'verified', 'rejected')),
  rejection_reason text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key (match_id, player_id),
  unique (match_id, seat)
);

-- Keep this script safe to rerun if a development version of the tables was
-- created before these lifecycle fields were introduced.
alter table public.live_vs_matches
  add column if not exists completed_at timestamptz;
alter table public.live_vs_players
  add column if not exists control_method text;
alter table public.live_vs_players
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists live_vs_matches_status_expires_idx
  on public.live_vs_matches (status, expires_at);
create index if not exists live_vs_players_player_idx
  on public.live_vs_players (player_id, joined_at desc);

alter table public.live_vs_matches enable row level security;
alter table public.live_vs_players enable row level security;

create or replace function public.is_live_vs_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.live_vs_players
    where match_id = p_match_id and player_id = auth.uid()
  );
$$;

drop policy if exists "Live Vs participants read matches" on public.live_vs_matches;
create policy "Live Vs participants read matches"
  on public.live_vs_matches for select to authenticated
  using (public.is_live_vs_participant(id));

drop policy if exists "Live Vs participants read players" on public.live_vs_players;
create policy "Live Vs participants read players"
  on public.live_vs_players for select to authenticated
  using (public.is_live_vs_participant(match_id));

revoke all on public.live_vs_matches from anon, authenticated;
revoke all on public.live_vs_players from anon, authenticated;
revoke all on function public.is_live_vs_participant(uuid) from public;
grant execute on function public.is_live_vs_participant(uuid) to authenticated;
grant select on public.live_vs_matches to authenticated;
grant select on public.live_vs_players to authenticated;

create or replace function public.live_vs_room_snapshot(p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id,
    'code', m.room_code,
    'status', m.status,
    'seed', m.seed,
    'theme', m.theme,
    'durationMs', m.duration_ms,
    'rulesetVersion', m.ruleset_version,
    'boardCols', m.board_cols,
    'boardRows', m.board_rows,
    'startsAt', m.starts_at,
    'serverNow', now(),
    'winnerPlayerId', m.winner_player_id,
    'outcome', m.outcome,
    'expiresAt', m.expires_at,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'playerId', p.player_id,
        'seat', p.seat,
        'ready', p.ready,
        'connectionState', p.connection_state,
        'score', p.score,
        'finalFoodMs', p.final_food_ms,
        'verificationState', p.verification_state,
        'initials', profile.initials,
        'playerCode', profile.player_code,
        'displayName', profile.display_name
      ) order by p.seat)
      from public.live_vs_players p
      left join public.player_profiles profile on profile.id = p.player_id
      where p.match_id = m.id
    ), '[]'::jsonb)
  )
  from public.live_vs_matches m
  where m.id = p_match_id
    and exists (
      select 1 from public.live_vs_players mine
      where mine.match_id = m.id and mine.player_id = auth.uid()
    );
$$;

create or replace function public.create_live_vs_room(p_theme text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.player_profiles where id = v_uid) then
    raise exception 'Choose arcade initials before creating a Vs room';
  end if;
  if p_theme is null or p_theme !~ '^[a-z0-9_-]{1,32}$' then
    raise exception 'Invalid theme';
  end if;

  loop
    v_attempt := v_attempt + 1;
    -- Use PostgreSQL built-ins only. Some hosted Supabase projects expose
    -- pgcrypto outside a SECURITY DEFINER function's search path, which makes
    -- gen_random_bytes/get_random_bytes unavailable at runtime.
    v_code := upper(substr(md5(
      random()::text
      || clock_timestamp()::text
      || v_uid::text
      || v_attempt::text
    ), 1, 6));
    begin
      insert into public.live_vs_matches (
        room_code, host_player_id, seed, theme, ruleset_version
      ) values (
        v_code,
        v_uid,
        floor(random() * 4294967296)::bigint,
        p_theme,
        'snake-rules-v1'
      )
      returning id into v_match_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 8 then raise; end if;
    end;
  end loop;

  insert into public.live_vs_players (match_id, player_id, seat)
  values (v_match_id, v_uid, 1);

  return public.live_vs_room_snapshot(v_match_id);
end;
$$;

create or replace function public.join_live_vs_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.live_vs_matches%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.player_profiles where id = v_uid) then
    raise exception 'Choose arcade initials before joining a Vs room';
  end if;

  select * into v_match
  from public.live_vs_matches
  where room_code = upper(trim(p_room_code))
  for update;

  if v_match.id is null then raise exception 'Room not found'; end if;
  if v_match.expires_at <= now() then
    update public.live_vs_matches set status = 'expired', updated_at = now() where id = v_match.id;
    raise exception 'This room has expired';
  end if;
  if v_match.status <> 'waiting' then raise exception 'This match has already started'; end if;

  if not exists (
    select 1 from public.live_vs_players
    where match_id = v_match.id and player_id = v_uid
  ) then
    if exists (select 1 from public.live_vs_players where match_id = v_match.id and seat = 2) then
      raise exception 'This room is full';
    end if;
    insert into public.live_vs_players (match_id, player_id, seat)
    values (v_match.id, v_uid, 2);
  end if;

  return public.live_vs_room_snapshot(v_match.id);
end;
$$;

create or replace function public.get_live_vs_room(p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.live_vs_room_snapshot(p_match_id);
$$;

create or replace function public.set_live_vs_ready(p_match_id uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_player_count integer;
  v_ready_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  perform 1 from public.live_vs_matches
  where id = p_match_id and status in ('waiting', 'countdown')
  for update;
  if not found then raise exception 'Room is no longer accepting ready changes'; end if;

  update public.live_vs_players
  set ready = p_ready
  where match_id = p_match_id and player_id = v_uid;
  if not found then raise exception 'You are not a participant in this room'; end if;

  select count(*), count(*) filter (where ready)
  into v_player_count, v_ready_count
  from public.live_vs_players
  where match_id = p_match_id;

  if v_player_count = 2 and v_ready_count = 2 then
    update public.live_vs_matches
    set status = 'countdown',
        starts_at = coalesce(starts_at, now() + interval '5 seconds'),
        updated_at = now()
    where id = p_match_id;
  elsif (v_player_count < 2 or v_ready_count < 2) then
    update public.live_vs_matches
    set status = 'waiting', starts_at = null, updated_at = now()
    where id = p_match_id and status = 'countdown';
  end if;

  return public.live_vs_room_snapshot(p_match_id);
end;
$$;

create or replace function public.leave_live_vs_room(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_starts_at timestamptz;
  v_rival_id uuid;
begin
  select status, starts_at
    into v_status, v_starts_at
  from public.live_vs_matches
  where id = p_match_id
  for update;

  if not exists (
    select 1 from public.live_vs_players where match_id = p_match_id and player_id = v_uid
  ) then return; end if;

  update public.live_vs_players
  set connection_state = 'forfeit',
      last_seen_at = now()
  where match_id = p_match_id and player_id = v_uid;

  -- A departure before the synchronized start cancels the unopened room.
  -- Once starts_at has arrived, departure is a competitive forfeit even if
  -- the stored status still says countdown.
  if v_status = 'waiting'
     or (
       v_status = 'countdown'
       and (v_starts_at is null or now() < v_starts_at)
     ) then
    update public.live_vs_matches set status = 'cancelled', updated_at = now() where id = p_match_id;
  elsif v_status in ('countdown', 'running', 'verifying') then
    select player_id
      into v_rival_id
    from public.live_vs_players
    where match_id = p_match_id
      and player_id <> v_uid
    limit 1;

    update public.live_vs_matches
    set status = 'complete',
        winner_player_id = v_rival_id,
        outcome = 'forfeit',
        completed_at = now(),
        updated_at = now()
    where id = p_match_id;
  end if;
end;
$$;

revoke all on function public.live_vs_room_snapshot(uuid) from public;
revoke all on function public.create_live_vs_room(text) from public;
revoke all on function public.join_live_vs_room(text) from public;
revoke all on function public.get_live_vs_room(uuid) from public;
revoke all on function public.set_live_vs_ready(uuid, boolean) from public;
revoke all on function public.leave_live_vs_room(uuid) from public;
grant execute on function public.create_live_vs_room(text) to authenticated;
grant execute on function public.join_live_vs_room(text) to authenticated;
grant execute on function public.get_live_vs_room(uuid) to authenticated;
grant execute on function public.set_live_vs_ready(uuid, boolean) to authenticated;
grant execute on function public.leave_live_vs_room(uuid) to authenticated;

-- Private Realtime channel authorization. Channel topics use "vs:<match uuid>".
create or replace function public.is_live_vs_topic_participant(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_topic ~ '^vs:[0-9a-f-]{36}$' then exists (
      select 1 from public.live_vs_players
      where match_id = substring(p_topic from 4)::uuid
        and player_id = auth.uid()
    )
    else false
  end;
$$;

revoke all on function public.is_live_vs_topic_participant(text) from public;
grant execute on function public.is_live_vs_topic_participant(text) to authenticated;

drop policy if exists "Live Vs participants receive Realtime" on realtime.messages;
create policy "Live Vs participants receive Realtime"
  on realtime.messages for select to authenticated
  using (public.is_live_vs_topic_participant(realtime.topic()));

drop policy if exists "Live Vs participants send Realtime" on realtime.messages;
create policy "Live Vs participants send Realtime"
  on realtime.messages for insert to authenticated
  with check (public.is_live_vs_topic_participant(realtime.topic()));
