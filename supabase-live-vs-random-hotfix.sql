-- Live Vs random-generator compatibility hotfix.
-- Run this in the Supabase SQL Editor if supabase-live-vs.sql was deployed
-- before the built-in-only room-code and seed generator was introduced.

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

revoke all on function public.create_live_vs_room(text) from public;
grant execute on function public.create_live_vs_room(text) to authenticated;
