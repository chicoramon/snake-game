-- Run once in the Supabase SQL editor before deploying player-preference sync.
-- Preferences remain private because player_profiles can only be read by its owner.

alter table public.player_profiles
  add column if not exists preferences jsonb;

create or replace function public.set_player_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_preferences jsonb := jsonb_strip_nulls(p_preferences);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_preferences is null or jsonb_typeof(v_preferences) <> 'object' then
    raise exception 'Preferences must be a JSON object';
  end if;

  if v_preferences ->> 'version' <> '1' then
    raise exception 'Unsupported preferences version';
  end if;

  if octet_length(v_preferences::text) > 8192 then
    raise exception 'Preferences payload is too large';
  end if;

  update public.player_profiles
  set preferences = v_preferences,
      updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'Player initials required';
  end if;

  return v_preferences;
end;
$$;

revoke all on function public.set_player_preferences(jsonb) from public, anon;
grant execute on function public.set_player_preferences(jsonb) to authenticated;

comment on column public.player_profiles.preferences is
  'Private, versioned gameplay and presentation preferences restored with the player account.';

comment on function public.set_player_preferences(jsonb) is
  'Stores the authenticated player owner''s private versioned preferences.';
