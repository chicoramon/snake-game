-- Live Vs persistent rooms, continuous rounds, and Realtime authorization.
-- Run this entire file in the Supabase SQL editor before deploying the matching
-- submit-live-vs-result Edge Function.

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
  stage_reveal_at timestamptz,
  starts_at timestamptz,
  round_number integer not null default 1 check (round_number > 0),
  host_wins integer not null default 0 check (host_wins >= 0),
  guest_wins integer not null default 0 check (guest_wins >= 0),
  draws integer not null default 0 check (draws >= 0),
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
  theme_choice text,
  theme_resolved text,
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

create table if not exists public.live_vs_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.live_vs_matches(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  seed bigint not null check (seed between 0 and 4294967295),
  theme text not null,
  starts_at timestamptz,
  completed_at timestamptz not null default now(),
  winner_player_id uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('host', 'guest', 'draw', 'forfeit')),
  host_score integer not null default 0 check (host_score >= 0),
  guest_score integer not null default 0 check (guest_score >= 0),
  host_final_food_ms integer,
  guest_final_food_ms integer,
  host_finish_reason text,
  guest_finish_reason text,
  unique (match_id, round_number)
);

-- Safe reruns for projects upgraded from the first Live Vs release.
alter table public.live_vs_matches add column if not exists completed_at timestamptz;
alter table public.live_vs_matches add column if not exists round_number integer not null default 1;
alter table public.live_vs_matches add column if not exists host_wins integer not null default 0;
alter table public.live_vs_matches add column if not exists guest_wins integer not null default 0;
alter table public.live_vs_matches add column if not exists draws integer not null default 0;
alter table public.live_vs_matches add column if not exists stage_reveal_at timestamptz;
alter table public.live_vs_players add column if not exists control_method text;
alter table public.live_vs_players add column if not exists last_seen_at timestamptz not null default now();
alter table public.live_vs_players add column if not exists theme_choice text;
alter table public.live_vs_players add column if not exists theme_resolved text;

create index if not exists live_vs_matches_status_expires_idx
  on public.live_vs_matches (status, expires_at);
create index if not exists live_vs_players_player_idx
  on public.live_vs_players (player_id, joined_at desc);
create index if not exists live_vs_rounds_match_number_idx
  on public.live_vs_rounds (match_id, round_number desc);

alter table public.live_vs_matches enable row level security;
alter table public.live_vs_players enable row level security;
alter table public.live_vs_rounds enable row level security;

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
drop policy if exists "Live Vs participants read rounds" on public.live_vs_rounds;
create policy "Live Vs participants read rounds"
  on public.live_vs_rounds for select to authenticated
  using (public.is_live_vs_participant(match_id));

revoke all on public.live_vs_matches from anon, authenticated;
revoke all on public.live_vs_players from anon, authenticated;
revoke all on public.live_vs_rounds from anon, authenticated;
revoke all on function public.is_live_vs_participant(uuid) from public;
grant execute on function public.is_live_vs_participant(uuid) to authenticated;
grant select on public.live_vs_matches to authenticated;
grant select on public.live_vs_players to authenticated;
grant select on public.live_vs_rounds to authenticated;

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
    'stageRevealAt', m.stage_reveal_at,
    'startsAt', m.starts_at,
    'serverNow', now(),
    'roundNumber', m.round_number,
    'hostWins', m.host_wins,
    'guestWins', m.guest_wins,
    'draws', m.draws,
    'winnerPlayerId', m.winner_player_id,
    'outcome', m.outcome,
    'expiresAt', m.expires_at,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'playerId', p.player_id,
        'seat', p.seat,
        'ready', p.ready,
        'themeChoice', case
          when p.player_id = auth.uid()
            or m.status in ('countdown', 'running', 'verifying', 'complete')
          then p.theme_choice
          else null
        end,
        'themeResolved', case
          when m.status in ('countdown', 'running', 'verifying', 'complete')
          then p.theme_resolved
          else null
        end,
        'connectionState', p.connection_state,
        'score', p.score,
        'finalFoodMs', p.final_food_ms,
        'finishReason', p.finish_reason,
        'controlMethod', p.control_method,
        'verificationState', p.verification_state,
        'initials', profile.initials,
        'playerCode', profile.player_code,
        'displayName', profile.display_name
      ) order by p.seat)
      from public.live_vs_players p
      left join public.player_profiles profile on profile.id = p.player_id
      where p.match_id = m.id
    ), '[]'::jsonb),
    'lastRound', (
      select jsonb_build_object(
        'roundNumber', r.round_number,
        'winnerPlayerId', r.winner_player_id,
        'outcome', r.outcome,
        'hostScore', r.host_score,
        'guestScore', r.guest_score,
        'hostFinalFoodMs', r.host_final_food_ms,
        'guestFinalFoodMs', r.guest_final_food_ms,
        'completedAt', r.completed_at
      )
      from public.live_vs_rounds r
      where r.match_id = m.id
      order by r.round_number desc
      limit 1
    ),
    'recentRounds', coalesce((
      select jsonb_agg(history.payload order by history.round_number desc)
      from (
        select r.round_number, jsonb_build_object(
          'roundNumber', r.round_number,
          'winnerPlayerId', r.winner_player_id,
          'outcome', r.outcome,
          'theme', r.theme,
          'hostScore', r.host_score,
          'guestScore', r.guest_score,
          'hostFinalFoodMs', r.host_final_food_ms,
          'guestFinalFoodMs', r.guest_final_food_ms,
          'completedAt', r.completed_at
        ) as payload
        from public.live_vs_rounds r
        where r.match_id = m.id
        order by r.round_number desc
        limit 5
      ) history
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
    v_code := upper(substr(md5(
      random()::text || clock_timestamp()::text || v_uid::text || v_attempt::text
    ), 1, 6));
    begin
      insert into public.live_vs_matches (
        room_code, host_player_id, seed, theme, ruleset_version
      ) values (
        v_code, v_uid, floor(random() * 4294967296)::bigint, p_theme, 'snake-rules-v1'
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
  v_is_member boolean;
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
  if v_match.status in ('cancelled', 'expired') then raise exception 'This room is closed'; end if;

  select exists (
    select 1 from public.live_vs_players
    where match_id = v_match.id and player_id = v_uid
  ) into v_is_member;

  if not v_is_member then
    if v_match.status <> 'waiting' then raise exception 'This battle session has already started'; end if;
    if exists (select 1 from public.live_vs_players where match_id = v_match.id and seat = 2) then
      raise exception 'This room is full';
    end if;
    insert into public.live_vs_players (match_id, player_id, seat)
    values (v_match.id, v_uid, 2);
    update public.live_vs_matches
    set updated_at = now()
    where id = v_match.id;
  else
    update public.live_vs_players
    set connection_state = 'online', last_seen_at = now()
    where match_id = v_match.id and player_id = v_uid;
  end if;

  update public.live_vs_matches
  set expires_at = now() + interval '30 minutes', updated_at = now()
  where id = v_match.id;
  return public.live_vs_room_snapshot(v_match.id);
end;
$$;

create or replace function public.get_live_vs_room(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_vs_players
  set last_seen_at = now(),
      connection_state = case when connection_state = 'forfeit' then connection_state else 'online' end
  where match_id = p_match_id and player_id = auth.uid();
  if not found then raise exception 'You are not a participant in this room'; end if;

  update public.live_vs_matches
  set expires_at = now() + interval '30 minutes'
  where id = p_match_id and status not in ('cancelled', 'expired');
  return public.live_vs_room_snapshot(p_match_id);
end;
$$;

create or replace function public.live_vs_theme_pool()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array[
    'default', 'mario', 'zelda', 'streetfighter', 'dk', 'sonic',
    'tetris', 'halo', 'contra', 'lego', 'simpsons', 'got'
  ]::text[];
$$;

create or replace function public.select_live_vs_stage(
  p_match_id uuid,
  p_theme_choice text,
  p_locked boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.live_vs_matches%rowtype;
  v_pool text[] := public.live_vs_theme_pool();
  v_host_choice text;
  v_guest_choice text;
  v_host_theme text;
  v_guest_theme text;
  v_final_theme text;
  v_player_count integer;
  v_ready_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  p_theme_choice := lower(trim(coalesce(p_theme_choice, '')));
  if p_theme_choice <> 'random' and not (p_theme_choice = any(v_pool)) then
    raise exception 'Invalid Vs Casual stage';
  end if;

  select * into v_match
  from public.live_vs_matches
  where id = p_match_id and status in ('waiting', 'complete')
  for update;
  if v_match.id is null then raise exception 'Room is no longer accepting stage selections'; end if;

  if v_match.status = 'complete' then
    update public.live_vs_matches
    set round_number = round_number + 1,
        seed = floor(random() * 4294967296)::bigint,
        winner_player_id = null,
        outcome = null,
        completed_at = null,
        stage_reveal_at = null,
        starts_at = null,
        status = 'waiting',
        updated_at = now()
    where id = p_match_id
    returning * into v_match;

    update public.live_vs_players
    set ready = false,
        theme_choice = null,
        theme_resolved = null,
        score = null,
        final_food_ms = null,
        finish_reason = null,
        control_method = null,
        replay = null,
        verification_state = 'pending',
        rejection_reason = null,
        submitted_at = null
    where match_id = p_match_id;
  end if;

  update public.live_vs_players
  set ready = p_locked,
      theme_choice = p_theme_choice,
      theme_resolved = null,
      connection_state = 'online',
      last_seen_at = now()
  where match_id = p_match_id and player_id = v_uid;
  if not found then raise exception 'You are not a participant in this room'; end if;

  select count(*), count(*) filter (where ready)
  into v_player_count, v_ready_count
  from public.live_vs_players
  where match_id = p_match_id and connection_state <> 'forfeit';

  if v_player_count = 2 and v_ready_count = 2 then
    select theme_choice into v_host_choice
    from public.live_vs_players where match_id = p_match_id and seat = 1;
    select theme_choice into v_guest_choice
    from public.live_vs_players where match_id = p_match_id and seat = 2;

    v_host_theme := case when v_host_choice = 'random'
      then v_pool[1 + (v_match.seed % array_length(v_pool, 1))::integer]
      else v_host_choice end;
    v_guest_theme := case when v_guest_choice = 'random'
      then v_pool[1 + ((v_match.seed / array_length(v_pool, 1)) % array_length(v_pool, 1))::integer]
      else v_guest_choice end;
    v_final_theme := case
      when v_host_theme = v_guest_theme then v_host_theme
      when (v_match.seed % 2) = 0 then v_host_theme
      else v_guest_theme
    end;

    update public.live_vs_players
    set theme_resolved = case
      when seat = 1 then v_host_theme
      else v_guest_theme
    end
    where match_id = p_match_id;

    update public.live_vs_matches
    set status = 'countdown',
        theme = v_final_theme,
        stage_reveal_at = now(),
        starts_at = now() + case
          when v_host_theme = v_guest_theme then interval '4.2 seconds'
          else interval '5.8 seconds'
        end,
        expires_at = now() + interval '30 minutes',
        updated_at = now()
    where id = p_match_id;
  end if;

  return public.live_vs_room_snapshot(p_match_id);
end;
$$;

-- Backward-compatible wrapper for clients from the first Live Vs build.
create or replace function public.set_live_vs_ready(p_match_id uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_choice text;
begin
  select coalesce(theme_choice, 'random') into v_choice
  from public.live_vs_players
  where match_id = p_match_id and player_id = auth.uid();
  return public.select_live_vs_stage(p_match_id, v_choice, p_ready);
end;
$$;

-- Called only by the Edge Function with the service-role key. The row lock and
-- unique round key make finalization atomic and idempotent if both devices poll
-- or retry at the same time.
create or replace function public.finalize_live_vs_round(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.live_vs_matches%rowtype;
  v_host public.live_vs_players%rowtype;
  v_guest public.live_vs_players%rowtype;
  v_outcome text;
  v_winner uuid;
  v_inserted uuid;
begin
  select * into v_match from public.live_vs_matches where id = p_match_id for update;
  if v_match.id is null then raise exception 'Match not found'; end if;

  select * into v_host from public.live_vs_players
  where match_id = p_match_id and seat = 1;
  select * into v_guest from public.live_vs_players
  where match_id = p_match_id and seat = 2;

  if v_host.player_id is null or v_guest.player_id is null then
    raise exception 'Both fighters are required';
  end if;
  if v_host.verification_state <> 'verified' or v_guest.verification_state <> 'verified' then
    update public.live_vs_matches
    set status = 'verifying', updated_at = now()
    where id = p_match_id and status not in ('complete', 'cancelled', 'expired');
    return jsonb_build_object('complete', false, 'status', 'verifying');
  end if;

  if v_host.score > v_guest.score then
    v_outcome := 'host'; v_winner := v_host.player_id;
  elsif v_guest.score > v_host.score then
    v_outcome := 'guest'; v_winner := v_guest.player_id;
  elsif coalesce(v_host.final_food_ms, 2147483647) < coalesce(v_guest.final_food_ms, 2147483647) then
    v_outcome := 'host'; v_winner := v_host.player_id;
  elsif coalesce(v_guest.final_food_ms, 2147483647) < coalesce(v_host.final_food_ms, 2147483647) then
    v_outcome := 'guest'; v_winner := v_guest.player_id;
  else
    v_outcome := 'draw'; v_winner := null;
  end if;

  insert into public.live_vs_rounds (
    match_id, round_number, seed, theme, starts_at, winner_player_id, outcome,
    host_score, guest_score, host_final_food_ms, guest_final_food_ms,
    host_finish_reason, guest_finish_reason
  ) values (
    p_match_id, v_match.round_number, v_match.seed, v_match.theme, v_match.starts_at,
    v_winner, v_outcome, v_host.score, v_guest.score,
    v_host.final_food_ms, v_guest.final_food_ms,
    v_host.finish_reason, v_guest.finish_reason
  )
  on conflict (match_id, round_number) do nothing
  returning id into v_inserted;

  if v_inserted is not null then
    update public.live_vs_matches
    set host_wins = host_wins + case when v_outcome = 'host' then 1 else 0 end,
        guest_wins = guest_wins + case when v_outcome = 'guest' then 1 else 0 end,
        draws = draws + case when v_outcome = 'draw' then 1 else 0 end
    where id = p_match_id;
  end if;

  update public.live_vs_matches
  set status = 'complete',
      winner_player_id = v_winner,
      outcome = v_outcome,
      completed_at = coalesce(completed_at, now()),
      expires_at = now() + interval '30 minutes',
      updated_at = now()
  where id = p_match_id;
  update public.live_vs_players set ready = false where match_id = p_match_id;

  return jsonb_build_object(
    'complete', true,
    'outcome', v_outcome,
    'winnerPlayerId', v_winner,
    'roundNumber', v_match.round_number
  );
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
  v_match public.live_vs_matches%rowtype;
  v_rival public.live_vs_players%rowtype;
  v_mine public.live_vs_players%rowtype;
  v_round_id uuid;
begin
  select * into v_match from public.live_vs_matches where id = p_match_id for update;
  select * into v_mine from public.live_vs_players
  where match_id = p_match_id and player_id = v_uid;
  if v_mine.player_id is null then return; end if;

  update public.live_vs_players
  set connection_state = 'forfeit', ready = false, last_seen_at = now()
  where match_id = p_match_id and player_id = v_uid;

  if v_match.status in ('waiting', 'complete')
     or (v_match.status = 'countdown' and (v_match.starts_at is null or now() < v_match.starts_at)) then
    update public.live_vs_matches
    set status = 'cancelled', updated_at = now()
    where id = p_match_id;
  elsif v_match.status in ('countdown', 'running', 'verifying') then
    select * into v_rival from public.live_vs_players
    where match_id = p_match_id and player_id <> v_uid limit 1;

    insert into public.live_vs_rounds (
      match_id, round_number, seed, theme, starts_at, winner_player_id, outcome,
      host_score, guest_score, host_final_food_ms, guest_final_food_ms,
      host_finish_reason, guest_finish_reason
    ) values (
      p_match_id, v_match.round_number, v_match.seed, v_match.theme, v_match.starts_at,
      v_rival.player_id, 'forfeit',
      case when v_mine.seat = 1 then coalesce(v_mine.score, 0) else coalesce(v_rival.score, 0) end,
      case when v_mine.seat = 2 then coalesce(v_mine.score, 0) else coalesce(v_rival.score, 0) end,
      case when v_mine.seat = 1 then v_mine.final_food_ms else v_rival.final_food_ms end,
      case when v_mine.seat = 2 then v_mine.final_food_ms else v_rival.final_food_ms end,
      case when v_mine.seat = 1 then 'forfeit' else v_rival.finish_reason end,
      case when v_mine.seat = 2 then 'forfeit' else v_rival.finish_reason end
    ) on conflict (match_id, round_number) do nothing
    returning id into v_round_id;

    update public.live_vs_matches
    set status = 'complete',
        winner_player_id = v_rival.player_id,
        outcome = 'forfeit',
        host_wins = host_wins + case when v_round_id is not null and v_rival.seat = 1 then 1 else 0 end,
        guest_wins = guest_wins + case when v_round_id is not null and v_rival.seat = 2 then 1 else 0 end,
        completed_at = now(),
        updated_at = now()
    where id = p_match_id;
    update public.live_vs_players set ready = false where match_id = p_match_id;
  end if;
end;
$$;

revoke all on function public.live_vs_room_snapshot(uuid) from public;
revoke all on function public.create_live_vs_room(text) from public;
revoke all on function public.join_live_vs_room(text) from public;
revoke all on function public.get_live_vs_room(uuid) from public;
revoke all on function public.set_live_vs_ready(uuid, boolean) from public;
revoke all on function public.live_vs_theme_pool() from public;
revoke all on function public.select_live_vs_stage(uuid, text, boolean) from public;
revoke all on function public.finalize_live_vs_round(uuid) from public;
revoke all on function public.leave_live_vs_room(uuid) from public;
grant execute on function public.create_live_vs_room(text) to authenticated;
grant execute on function public.join_live_vs_room(text) to authenticated;
grant execute on function public.get_live_vs_room(uuid) to authenticated;
grant execute on function public.set_live_vs_ready(uuid, boolean) to authenticated;
grant execute on function public.select_live_vs_stage(uuid, text, boolean) to authenticated;
grant execute on function public.leave_live_vs_room(uuid) to authenticated;
grant execute on function public.finalize_live_vs_round(uuid) to service_role;

-- Private Realtime topics use "vs:<match uuid>".
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
      where match_id = substring(p_topic from 4)::uuid and player_id = auth.uid()
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
