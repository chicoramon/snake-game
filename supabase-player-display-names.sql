-- Optional public display names and safe leaderboard player cards.
-- Run after supabase-player-identity-auto-submit.sql.

alter table public.player_profiles
  add column if not exists display_name text;

alter table public.player_profiles
  drop constraint if exists player_profiles_display_name_check;

alter table public.player_profiles
  add constraint player_profiles_display_name_check
  check (
    display_name is null
    or (
      char_length(display_name) between 2 and 20
      and display_name = btrim(display_name)
      and display_name !~ '[[:cntrl:]<>]'
    )
  );

drop function if exists public.set_player_display_name(text);

create or replace function public.set_player_display_name(p_display_name text)
returns table (display_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_display_name text := regexp_replace(
    btrim(coalesce(p_display_name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.player_profiles p
    where p.id = v_uid
  ) then
    raise exception 'Player initials required';
  end if;

  if v_display_name = '' then
    v_display_name := null;
  elsif char_length(v_display_name) < 2 or char_length(v_display_name) > 20 then
    raise exception 'Display name must contain 2 to 20 characters';
  elsif v_display_name ~ '[[:cntrl:]<>]' then
    raise exception 'Display name contains unsupported characters';
  end if;

  update public.player_profiles p
  set display_name = v_display_name,
      updated_at = now()
  where p.id = v_uid;

  return query select v_display_name;
end;
$$;

drop function if exists public.get_public_player_card(uuid);

create or replace function public.get_public_player_card(p_player_id uuid)
returns table (
  display_name text,
  initials text,
  player_code text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.display_name,
    p.initials,
    p.player_code
  from public.player_profiles p
  where p.id = p_player_id
  limit 1;
$$;

revoke all on function public.set_player_display_name(text)
  from public, anon;
grant execute on function public.set_player_display_name(text)
  to authenticated;

revoke all on function public.get_public_player_card(uuid)
  from public;
grant execute on function public.get_public_player_card(uuid)
  to anon, authenticated;

comment on column public.player_profiles.display_name is
  'Optional public player name, revealed through the limited public player-card function.';

comment on function public.set_player_display_name(text) is
  'Sets or clears the authenticated player public display name.';

comment on function public.get_public_player_card(uuid) is
  'Returns only the deliberately public display identity fields for one player UUID.';
