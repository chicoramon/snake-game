-- Run once in the Supabase SQL editor before deploying the updated game.
-- Existing scores remain visible under ALL as LEGACY; new scores use one of
-- D-PAD, TURN, or KEYBOARD.

alter table public.leaderboard
  add column if not exists control_method text;

update public.leaderboard
set control_method = 'legacy'
where control_method is null;

alter table public.leaderboard
  alter column control_method set default 'legacy',
  alter column control_method set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leaderboard_control_method_check'
      and conrelid = 'public.leaderboard'::regclass
  ) then
    alter table public.leaderboard
      add constraint leaderboard_control_method_check
      check (control_method in ('dpad', 'turn', 'keyboard', 'legacy'));
  end if;
end $$;

create index if not exists leaderboard_control_score_idx
  on public.leaderboard (control_method, score desc, created_at asc);

create index if not exists leaderboard_control_theme_score_idx
  on public.leaderboard (control_method, theme, score desc, created_at asc);

comment on column public.leaderboard.control_method is
  'Ranked input category: dpad, turn, keyboard, or legacy for pre-migration scores.';
