function firstRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

export function createDailyRunService({
  getClient,
  getUser,
  getThemes,
  getCurrentDate,
  boardCols,
  boardRows,
  rulesetVersion,
  defaultDurationMs
}) {
  function requireClient() {
    const client = getClient?.();
    if (!client || !getUser?.()) throw new Error('Player session unavailable');
    return client;
  }

  function mapChallenge(row, { authoritative = true } = {}) {
    if (!row) return null;
    const date = String(row.challenge_date || row.date || getCurrentDate());
    const themes = getThemes?.() || {};
    const theme = themes[row.theme] ? row.theme : 'default';
    return {
      id: row.challenge_id == null ? null : Number(row.challenge_id),
      date,
      number: Number(row.challenge_number) || 1,
      seed: Number(row.seed) >>> 0,
      theme,
      durationMs: Number(row.duration_ms) || defaultDurationMs,
      boardCols: Number(row.board_cols) || boardCols,
      boardRows: Number(row.board_rows) || boardRows,
      rulesetVersion: row.ruleset_version || rulesetVersion,
      attemptsUsed: Number(row.attempts_used) || 0,
      attemptsRemaining: Number(row.attempts_remaining) < 0
        ? -1
        : Math.max(0, Number(row.attempts_remaining) || 0),
      bestKey: `snake_daily_best_${date}`,
      authoritative
    };
  }

  function validateChallenge(challenge) {
    if (!challenge || challenge.rulesetVersion !== rulesetVersion ||
      challenge.boardCols !== boardCols || challenge.boardRows !== boardRows) {
      throw new Error('Daily challenge uses an unsupported ruleset or board');
    }
    return challenge;
  }

  async function loadChallenge() {
    const { data, error } = await requireClient().rpc('get_daily_challenge');
    if (error) throw error;
    return validateChallenge(mapChallenge(firstRow(data)));
  }

  async function reserveAttempt(requestId) {
    const { data, error } = await requireClient().rpc('start_daily_attempt', {
      p_request_id: requestId
    });
    if (error) throw error;
    const row = firstRow(data);
    if (!row) throw new Error('Daily attempt reservation returned no data');
    const attemptsUsed = Number(row.attempts_remaining) < 0
      ? Number(row.attempt_number) || 0
      : (row.ranked ? 3 - Number(row.attempts_remaining) : 3);
    return {
      challenge: validateChallenge(mapChallenge({ ...row, attempts_used: attemptsUsed })),
      attempt: {
        ranked: row.ranked === true,
        preview: false,
        id: row.attempt_id || null,
        number: row.attempt_number == null ? null : Number(row.attempt_number),
        attemptsRemaining: Number(row.attempts_remaining) < 0
          ? -1
          : Math.max(0, Number(row.attempts_remaining) || 0),
        runToken: row.run_token || null,
        submitted: false,
        result: null
      }
    };
  }

  async function submitAttempt(payload) {
    const { data, error } = await requireClient().functions.invoke('submit-daily-attempt', { body: payload });
    if (error) {
      let details = null;
      try { details = await error.context?.json(); } catch (_) {}
      throw new Error(details?.error || error.message || 'Daily submission failed');
    }
    if (!data?.verified) throw new Error(data?.error || 'Daily replay was not verified');
    return data;
  }

  return { mapChallenge, loadChallenge, reserveAttempt, submitAttempt };
}
