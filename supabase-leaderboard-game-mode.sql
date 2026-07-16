-- Run once in the Supabase SQL editor after the control-method migration.
-- Existing scores remain Classic scores; new runs are Classic or Sprint 60.

alter table public.leaderboard
  add column if not exists game_mode text;

update public.leaderboard
set game_mode = 'classic'
where game_mode is null;

alter table public.leaderboard
  alter column game_mode set default 'classic',
  alter column game_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leaderboard_game_mode_check'
      and conrelid = 'public.leaderboard'::regclass
  ) then
    alter table public.leaderboard
      add constraint leaderboard_game_mode_check
      check (game_mode in ('classic', 'sprint'));
  end if;
end $$;

create index if not exists leaderboard_mode_control_score_idx
  on public.leaderboard (game_mode, control_method, score desc, created_at asc);

create index if not exists leaderboard_mode_control_theme_score_idx
  on public.leaderboard (game_mode, control_method, theme, score desc, created_at asc);

create index if not exists leaderboard_mode_score_idx
  on public.leaderboard (game_mode, score desc, created_at asc);

create index if not exists leaderboard_mode_theme_score_idx
  on public.leaderboard (game_mode, theme, score desc, created_at asc);

comment on column public.leaderboard.game_mode is
  'Ranked game mode: classic or sprint. Sprint runs last 60 seconds of active play.';
