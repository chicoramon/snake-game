const PROFILE_MIGRATION_ERROR_CODES = new Set(['42703', 'PGRST204']);

function getClientOrThrow(getClient) {
  const client = getClient?.();
  if (!client) throw new Error('Leaderboard unavailable');
  return client;
}

export function createLeaderboardService({ getClient } = {}) {
  async function fetchRecordTopScore(gameMode) {
    const client = getClientOrThrow(getClient);
    const { data, error } = await client.from('leaderboard')
      .select('score')
      .eq('game_mode', gameMode)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw error;
    return data?.length ? Number(data[0].score) : 0;
  }

  async function submitBestScore(payload) {
    const client = getClientOrThrow(getClient);
    const { data, error } = await client.rpc('submit_best_score', payload);
    if (error) throw error;
    return data;
  }

  async function fetchPublicPlayerCard(playerId) {
    const client = getClientOrThrow(getClient);
    const { data, error } = await client.rpc('get_public_player_card', { p_player_id: playerId });
    if (error) throw error;
    return Array.isArray(data) ? data[0] || null : data || null;
  }

  async function loadDailyArchive() {
    const client = getClientOrThrow(getClient);
    const [daysResult, statsResult] = await Promise.all([
      client.from('daily_leaderboard_days')
        .select('challenge_date, challenge_number, theme, participant_count, winner_name, winner_player_code, winner_player_id, winning_score, winning_final_food_ms')
        .order('challenge_date', { ascending: false })
        .limit(400),
      client.from('daily_player_stats')
        .select('player_id, name, player_code, days_played, wins, podiums, top_tens, best_finish, win_rate_pct, current_play_streak, longest_play_streak, current_win_streak, longest_win_streak')
        .limit(500)
    ]);
    return { daysResult, statsResult };
  }

  async function fetchPage({ gameMode, control, theme, date, limit, offset }) {
    const client = getClientOrThrow(getClient);
    const from = offset;
    const to = from + limit - 1;

    if (gameMode === 'daily') {
      return client.from('daily_leaderboard')
        .select('challenge_date, name, player_code, player_id, score, final_food_ms, control_method, theme, attempt_number, completed_at, leaderboard_rank', { count: 'exact' })
        .eq('challenge_date', date)
        .order('leaderboard_rank', { ascending: true })
        .range(from, to);
    }

    if (control === 'all') {
      const rpcResult = await client.rpc('get_overall_leaderboard', {
        p_game_mode: gameMode,
        p_theme: theme === 'all' ? null : theme,
        p_limit: limit,
        p_offset: from
      });
      const rows = Array.isArray(rpcResult.data) ? rpcResult.data : [];
      return { ...rpcResult, data: rows, count: rows.length > 0 ? Number(rows[0].total_count) : 0 };
    }

    const runQuery = columns => {
      let query = client.from('leaderboard')
        .select(columns, { count: 'exact' })
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .range(from, to)
        .eq('game_mode', gameMode);
      if (control !== 'all') query = query.eq('control_method', control);
      if (theme !== 'all') query = query.eq('theme', theme);
      return query;
    };

    let result = await runQuery('name, score, theme, control_method, game_mode, created_at, player_id, player_code');
    if (PROFILE_MIGRATION_ERROR_CODES.has(result.error?.code)) {
      result = await runQuery('name, score, theme, control_method, game_mode, created_at');
    }
    return result;
  }

  return { fetchRecordTopScore, submitBestScore, fetchPublicPlayerCard, loadDailyArchive, fetchPage };
}
