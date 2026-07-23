-- Daily Run archive and lifetime competitive statistics.
-- Safe to run after supabase-daily-run.sql.

create or replace view public.daily_leaderboard_days as
with day_entries as (
  select
    challenge_date,
    count(*)::bigint as participant_count,
    max(score)::integer as top_score
  from public.daily_leaderboard
  group by challenge_date
), winners as (
  select
    challenge_date,
    name as winner_name,
    player_code as winner_player_code,
    player_id as winner_player_id,
    score as winning_score,
    final_food_ms as winning_final_food_ms,
    control_method as winning_control_method,
    completed_at as winning_completed_at
  from public.daily_leaderboard
  where leaderboard_rank = 1
)
select
  c.challenge_date,
  greatest(1, (c.challenge_date - date '2026-01-01') + 1) as challenge_number,
  c.theme,
  coalesce(e.participant_count, 0)::bigint as participant_count,
  w.winner_name,
  w.winner_player_code,
  w.winner_player_id,
  coalesce(w.winning_score, e.top_score) as winning_score,
  w.winning_final_food_ms,
  w.winning_control_method,
  w.winning_completed_at
from public.daily_challenges c
left join day_entries e on e.challenge_date = c.challenge_date
left join winners w on w.challenge_date = c.challenge_date;

create or replace view public.daily_player_stats as
with entries as (
  select *
  from public.daily_leaderboard
  where challenge_date < (now() at time zone 'utc')::date
), global_dates as (
  select max(challenge_date) as latest_ranked_date from entries
), player_totals as (
  select
    player_id,
    count(*)::bigint as days_played,
    count(*) filter (where leaderboard_rank = 1)::bigint as wins,
    count(*) filter (where leaderboard_rank <= 3)::bigint as podiums,
    count(*) filter (where leaderboard_rank <= 10)::bigint as top_tens,
    min(leaderboard_rank)::bigint as best_finish,
    round(avg(leaderboard_rank)::numeric, 2) as average_finish,
    max(score)::integer as best_score,
    sum(score)::bigint as total_score,
    max(challenge_date) as last_played_date
  from entries
  group by player_id
), participation_numbered as (
  select
    player_id,
    challenge_date,
    challenge_date - (row_number() over (
      partition by player_id order by challenge_date
    ))::integer as streak_group
  from entries
), participation_islands as (
  select
    player_id,
    min(challenge_date) as streak_start,
    max(challenge_date) as streak_end,
    count(*)::bigint as streak_length
  from participation_numbered
  group by player_id, streak_group
), participation_stats as (
  select
    i.player_id,
    max(i.streak_length)::bigint as longest_play_streak,
    coalesce(max(i.streak_length) filter (
      where i.streak_end = g.latest_ranked_date
    ), 0)::bigint as current_play_streak
  from participation_islands i
  cross join global_dates g
  group by i.player_id
), win_numbered as (
  select
    player_id,
    challenge_date,
    challenge_date - (row_number() over (
      partition by player_id order by challenge_date
    ))::integer as streak_group
  from entries
  where leaderboard_rank = 1
), win_islands as (
  select
    player_id,
    min(challenge_date) as streak_start,
    max(challenge_date) as streak_end,
    count(*)::bigint as streak_length
  from win_numbered
  group by player_id, streak_group
), win_stats as (
  select
    i.player_id,
    max(i.streak_length)::bigint as longest_win_streak,
    coalesce(max(i.streak_length) filter (
      where i.streak_end = g.latest_ranked_date
    ), 0)::bigint as current_win_streak
  from win_islands i
  cross join global_dates g
  group by i.player_id
)
select
  p.id as player_id,
  p.initials as name,
  p.player_code,
  t.days_played,
  t.wins,
  t.podiums,
  t.top_tens,
  t.best_finish,
  t.average_finish,
  t.best_score,
  t.total_score,
  round((100 * t.wins::numeric / nullif(t.days_played, 0)), 1) as win_rate_pct,
  coalesce(ps.current_play_streak, 0)::bigint as current_play_streak,
  coalesce(ps.longest_play_streak, 0)::bigint as longest_play_streak,
  coalesce(ws.current_win_streak, 0)::bigint as current_win_streak,
  coalesce(ws.longest_win_streak, 0)::bigint as longest_win_streak,
  t.last_played_date
from player_totals t
join public.player_profiles p on p.id = t.player_id
left join participation_stats ps on ps.player_id = t.player_id
left join win_stats ws on ws.player_id = t.player_id;

revoke all on public.daily_leaderboard_days from public;
revoke all on public.daily_player_stats from public;
grant select on public.daily_leaderboard_days to anon, authenticated;
grant select on public.daily_player_stats to anon, authenticated;

comment on view public.daily_leaderboard_days is
  'One row per Daily Run challenge for archive navigation, including winner and participation summary.';

comment on view public.daily_player_stats is
  'Lifetime Daily Run records including wins, podiums, win rate, participation streaks, and winning streaks.';
