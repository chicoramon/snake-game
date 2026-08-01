-- Player Career + autonomous Arcade Announcer foundation.
-- Run once in the Supabase SQL editor before deploying the corresponding app build.

create table if not exists public.player_run_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  run_id uuid not null,
  mode text not null,
  theme text not null,
  control_method text not null,
  score integer not null,
  active_ms integer not null,
  distance_cells integer not null,
  turns integer not null,
  longest_snake integer not null,
  finish_reason text not null,
  collision_cause text,
  verification_source text not null default 'client_fun',
  completed_at timestamptz not null default now(),
  unique (player_id, run_id),
  constraint player_run_stats_mode_check check (mode in ('classic', 'sprint', 'daily', 'versus')),
  constraint player_run_stats_control_check check (control_method in ('dpad', 'turn', 'tap', 'keyboard', 'mixed', 'unknown')),
  constraint player_run_stats_finish_check check (finish_reason in ('collision', 'time', 'interrupted', 'unknown')),
  constraint player_run_stats_collision_check check (collision_cause is null or collision_cause in ('wall', 'self', 'unknown'))
);

create index if not exists player_run_stats_player_completed_idx
  on public.player_run_stats (player_id, completed_at desc);
create index if not exists player_run_stats_player_theme_idx
  on public.player_run_stats (player_id, theme);
create index if not exists player_run_stats_player_control_idx
  on public.player_run_stats (player_id, control_method);

create table if not exists public.player_career_stats (
  player_id uuid primary key references public.player_profiles(id) on delete cascade,
  total_runs bigint not null default 0,
  total_food bigint not null default 0,
  active_ms bigint not null default 0,
  total_deaths bigint not null default 0,
  wall_deaths bigint not null default 0,
  self_deaths bigint not null default 0,
  timed_finishes bigint not null default 0,
  interrupted_runs bigint not null default 0,
  distance_cells bigint not null default 0,
  total_turns bigint not null default 0,
  longest_snake integer not null default 3,
  updated_at timestamptz not null default now()
);

alter table public.player_run_stats enable row level security;
alter table public.player_career_stats enable row level security;
revoke all on public.player_run_stats from public, anon, authenticated;
revoke all on public.player_career_stats from public, anon, authenticated;
grant select on public.player_career_stats to authenticated;

drop policy if exists "Players read their own career" on public.player_career_stats;
create policy "Players read their own career"
  on public.player_career_stats for select to authenticated
  using (player_id = auth.uid());

create or replace function public.submit_career_run(p_run jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_run_id uuid;
  v_mode text := lower(coalesce(p_run ->> 'mode', ''));
  v_theme text := lower(coalesce(p_run ->> 'theme', ''));
  v_control text := lower(coalesce(p_run ->> 'controlMethod', 'unknown'));
  v_score integer := coalesce((p_run ->> 'score')::integer, 0);
  v_active_ms integer := coalesce((p_run ->> 'activeMs')::integer, 0);
  v_distance integer := coalesce((p_run ->> 'distanceCells')::integer, 0);
  v_turns integer := coalesce((p_run ->> 'turns')::integer, 0);
  v_longest integer := coalesce((p_run ->> 'longestSnake')::integer, 3);
  v_finish text := lower(coalesce(p_run ->> 'finishReason', 'unknown'));
  v_collision text := nullif(lower(coalesce(p_run ->> 'collisionCause', '')), '');
  v_inserted boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_run is null or jsonb_typeof(p_run) <> 'object' then raise exception 'Run payload required'; end if;
  if octet_length(p_run::text) > 4096 then raise exception 'Run payload too large'; end if;
  if not exists (select 1 from public.player_profiles where id = v_uid) then
    raise exception 'Player initials required';
  end if;

  begin
    v_run_id := (p_run ->> 'runId')::uuid;
  exception when others then
    raise exception 'Valid run ID required';
  end;

  if v_mode not in ('classic', 'sprint', 'daily', 'versus') then raise exception 'Invalid game mode'; end if;
  if v_theme !~ '^[a-z0-9_-]{1,32}$' then raise exception 'Invalid theme'; end if;
  if v_control not in ('dpad', 'turn', 'tap', 'keyboard', 'mixed', 'unknown') then raise exception 'Invalid control method'; end if;
  if v_finish not in ('collision', 'time', 'interrupted', 'unknown') then raise exception 'Invalid finish reason'; end if;
  if v_collision is not null and v_collision not in ('wall', 'self', 'unknown') then raise exception 'Invalid collision cause'; end if;
  if v_score < 0 or v_score > 640 then raise exception 'Invalid score'; end if;
  if v_active_ms < 0 or v_active_ms > 86400000 then raise exception 'Invalid active time'; end if;
  if v_distance < 0 or v_distance > 1000000 then raise exception 'Invalid distance'; end if;
  if v_turns < 0 or v_turns > v_distance + 1 then raise exception 'Invalid turn count'; end if;
  if v_longest <> v_score + 3 then raise exception 'Invalid snake length'; end if;
  if v_finish <> 'collision' then v_collision := null; end if;

  insert into public.player_run_stats (
    player_id, run_id, mode, theme, control_method, score, active_ms,
    distance_cells, turns, longest_snake, finish_reason, collision_cause
  ) values (
    v_uid, v_run_id, v_mode, v_theme, v_control, v_score, v_active_ms,
    v_distance, v_turns, v_longest, v_finish, v_collision
  )
  on conflict (player_id, run_id) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object('accepted', false, 'duplicate', true, 'run_id', v_run_id);
  end if;

  insert into public.player_career_stats (
    player_id, total_runs, total_food, active_ms, total_deaths, wall_deaths,
    self_deaths, timed_finishes, interrupted_runs, distance_cells, total_turns,
    longest_snake, updated_at
  ) values (
    v_uid, 1, v_score, v_active_ms,
    case when v_finish = 'collision' then 1 else 0 end,
    case when v_collision = 'wall' then 1 else 0 end,
    case when v_collision = 'self' then 1 else 0 end,
    case when v_finish = 'time' then 1 else 0 end,
    case when v_finish = 'interrupted' then 1 else 0 end,
    v_distance, v_turns, v_longest, now()
  )
  on conflict (player_id) do update set
    total_runs = player_career_stats.total_runs + 1,
    total_food = player_career_stats.total_food + excluded.total_food,
    active_ms = player_career_stats.active_ms + excluded.active_ms,
    total_deaths = player_career_stats.total_deaths + excluded.total_deaths,
    wall_deaths = player_career_stats.wall_deaths + excluded.wall_deaths,
    self_deaths = player_career_stats.self_deaths + excluded.self_deaths,
    timed_finishes = player_career_stats.timed_finishes + excluded.timed_finishes,
    interrupted_runs = player_career_stats.interrupted_runs + excluded.interrupted_runs,
    distance_cells = player_career_stats.distance_cells + excluded.distance_cells,
    total_turns = player_career_stats.total_turns + excluded.total_turns,
    longest_snake = greatest(player_career_stats.longest_snake, excluded.longest_snake),
    updated_at = now();

  return jsonb_build_object('accepted', true, 'duplicate', false, 'run_id', v_run_id);
end;
$$;

create or replace function public.get_player_career_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with totals as (
    select s.* from public.player_career_stats s where s.player_id = auth.uid()
  ), favorite_theme as (
    select theme, count(*) as uses
    from public.player_run_stats where player_id = auth.uid()
    group by theme order by uses desc, theme limit 1
  ), favorite_control as (
    select control_method, count(*) as uses
    from public.player_run_stats where player_id = auth.uid() and control_method <> 'mixed'
    group by control_method order by uses desc, control_method limit 1
  )
  select jsonb_build_object(
    'total_runs', coalesce(t.total_runs, 0),
    'total_food', coalesce(t.total_food, 0),
    'active_ms', coalesce(t.active_ms, 0),
    'total_deaths', coalesce(t.total_deaths, 0),
    'wall_deaths', coalesce(t.wall_deaths, 0),
    'self_deaths', coalesce(t.self_deaths, 0),
    'timed_finishes', coalesce(t.timed_finishes, 0),
    'interrupted_runs', coalesce(t.interrupted_runs, 0),
    'distance_cells', coalesce(t.distance_cells, 0),
    'total_turns', coalesce(t.total_turns, 0),
    'longest_snake', coalesce(t.longest_snake, 3),
    'favorite_theme', ft.theme,
    'favorite_control', fc.control_method,
    'tracking_since', (select min(completed_at) from public.player_run_stats where player_id = auth.uid())
  )
  from (select 1) seed
  left join totals t on true
  left join favorite_theme ft on true
  left join favorite_control fc on true;
$$;

revoke all on function public.submit_career_run(jsonb) from public, anon;
revoke all on function public.get_player_career_stats() from public, anon;
grant execute on function public.submit_career_run(jsonb) to authenticated;
grant execute on function public.get_player_career_stats() to authenticated;

-- The generator writes complete batches. Players can only read published,
-- currently active lines through the catalog RPC below.
create table if not exists public.arcade_announcer_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source text not null default 'gemini',
  model text,
  prompt_version text not null,
  status text not null default 'draft',
  quality_report jsonb not null default '{}'::jsonb,
  active_from timestamptz,
  active_until timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint arcade_announcer_pack_status_check check (status in ('draft', 'published', 'rejected', 'retired'))
);

create table if not exists public.arcade_announcer_lines (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.arcade_announcer_packs(id) on delete cascade,
  message_key text not null unique,
  family_key text not null,
  category text not null,
  template text not null,
  conditions jsonb not null default '{}'::jsonb,
  weight numeric(8,4) not null default 1,
  cooldown_days integer not null default 30,
  max_impressions integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint arcade_announcer_line_key_check check (message_key ~ '^[a-z0-9:_-]{3,120}$'),
  constraint arcade_announcer_family_key_check check (family_key ~ '^[a-z0-9:_-]{2,80}$'),
  constraint arcade_announcer_category_check check (category in ('career', 'food', 'time', 'runs', 'deaths', 'distance', 'controls', 'daily', 'versus', 'theme')),
  constraint arcade_announcer_template_length_check check (char_length(template) between 8 and 240),
  constraint arcade_announcer_cooldown_check check (cooldown_days between 1 and 365)
);

create index if not exists arcade_announcer_lines_pack_active_idx
  on public.arcade_announcer_lines (pack_id, active, category);

create table if not exists public.player_announcer_history (
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  message_key text not null,
  family_key text not null,
  impressions integer not null default 1,
  first_shown_at timestamptz not null default now(),
  last_shown_at timestamptz not null default now(),
  primary key (player_id, message_key)
);

alter table public.arcade_announcer_packs enable row level security;
alter table public.arcade_announcer_lines enable row level security;
alter table public.player_announcer_history enable row level security;
revoke all on public.arcade_announcer_packs from public, anon, authenticated;
revoke all on public.arcade_announcer_lines from public, anon, authenticated;
revoke all on public.player_announcer_history from public, anon, authenticated;

create or replace function public.get_arcade_announcer_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'messageKey', l.message_key,
    'familyKey', l.family_key,
    'category', l.category,
    'template', l.template,
    'conditions', l.conditions,
    'weight', l.weight,
    'cooldownDays', l.cooldown_days,
    'maxImpressions', l.max_impressions
  ) order by p.published_at desc, l.message_key), '[]'::jsonb)
  from public.arcade_announcer_lines l
  join public.arcade_announcer_packs p on p.id = l.pack_id
  where l.active
    and p.status = 'published'
    and (p.active_from is null or p.active_from <= now())
    and (p.active_until is null or p.active_until > now());
$$;

create or replace function public.get_player_announcer_history()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'messageKey', message_key,
    'familyKey', family_key,
    'impressions', impressions,
    'lastShownAt', last_shown_at
  ) order by last_shown_at desc), '[]'::jsonb)
  from (
    select * from public.player_announcer_history
    where player_id = auth.uid()
    order by last_shown_at desc limit 250
  ) recent;
$$;

create or replace function public.record_arcade_announcer_impression(
  p_message_key text,
  p_family_key text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_message_key !~ '^[a-z0-9:_-]{3,120}$' or p_family_key !~ '^[a-z0-9:_-]{2,80}$' then
    raise exception 'Invalid announcer key';
  end if;
  insert into public.player_announcer_history (player_id, message_key, family_key)
  values (v_uid, p_message_key, p_family_key)
  on conflict (player_id, message_key) do update set
    impressions = player_announcer_history.impressions + 1,
    last_shown_at = now();
end;
$$;

-- Switch content packs in one database transaction. If this function fails,
-- the previous published pack remains live and the new pack stays a draft.
create or replace function public.publish_arcade_announcer_pack(p_pack_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.arcade_announcer_packs
    where id = p_pack_id and status = 'draft'
  ) then
    raise exception 'Publishable draft pack not found';
  end if;
  if (select count(*) from public.arcade_announcer_lines where pack_id = p_pack_id and active) < 20 then
    raise exception 'Pack does not contain enough active lines';
  end if;

  update public.arcade_announcer_packs
  set status = 'retired', active_until = now()
  where status = 'published' and id <> p_pack_id;

  update public.arcade_announcer_packs
  set status = 'published', active_from = now(), active_until = null, published_at = now()
  where id = p_pack_id;
end;
$$;

revoke all on function public.get_arcade_announcer_catalog() from public, anon;
revoke all on function public.get_player_announcer_history() from public, anon;
revoke all on function public.record_arcade_announcer_impression(text, text) from public, anon;
revoke all on function public.publish_arcade_announcer_pack(uuid) from public, anon, authenticated;
grant execute on function public.get_arcade_announcer_catalog() to authenticated;
grant execute on function public.get_player_announcer_history() to authenticated;
grant execute on function public.record_arcade_announcer_impression(text, text) to authenticated;
grant execute on function public.publish_arcade_announcer_pack(uuid) to service_role;

comment on table public.player_run_stats is
  'Idempotent, non-competitive lifetime run telemetry. Verified Daily and Live Vs rankings remain authoritative elsewhere.';
comment on table public.arcade_announcer_packs is
  'Autonomously generated announcer batches. Only batches that pass deterministic and model safety gates become published.';
