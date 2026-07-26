import { createClient } from 'npm:@supabase/supabase-js@2';

// Inlined for deployment through the Supabase Dashboard editor.
// Canonical source: ../functions/_shared/daily-validator.mjs
const DAILY_RULESET_VERSION = 'snake-rules-v1';
const UINT32_RANGE = 0x100000000;

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function initialSnake(cols, rows) {
  const x = Math.floor(cols / 2);
  const y = Math.floor(rows / 2);
  return [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
}

function placeFood(cols, rows, snake, random) {
  const occupied = new Set(snake.map(segment => `${segment.x},${segment.y}`));
  const free = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  return free[Math.min(free.length - 1, Math.floor(random() * free.length))];
}

function normalizeDirection(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  const x = Math.sign(value.x);
  const y = Math.sign(value.y);
  return Math.abs(x) + Math.abs(y) === 1 ? { x, y } : null;
}

function acceptDirection(current, requested) {
  const next = normalizeDirection(requested);
  if (!next || (current.x === -next.x && current.y === -next.y)) return { ...current };
  return next;
}

function validateDailyReplay(replay, challenge, submitted = {}) {
  const fail = reason => ({ verified: false, reason });
  if (!replay || typeof replay !== 'object') return fail('Replay is missing');
  if (replay.formatVersion !== 1) return fail('Unsupported replay format');
  if (replay.rulesetVersion !== challenge.rulesetVersion || replay.rulesetVersion !== DAILY_RULESET_VERSION) {
    return fail('Ruleset mismatch');
  }
  if (replay.mode !== 'daily') return fail('Mode mismatch');
  if ((Number(replay.seed) >>> 0) !== (Number(challenge.seed) >>> 0)) return fail('Seed mismatch');
  if (replay.theme !== challenge.theme) return fail('Theme mismatch');
  if (replay.board?.cols !== challenge.boardCols || replay.board?.rows !== challenge.boardRows) {
    return fail('Board mismatch');
  }
  if (!['time', 'collision'].includes(replay.finishReason)) return fail('Invalid finish reason');
  if (!Number.isInteger(replay.finalTick) || replay.finalTick < 1 || replay.finalTick > 1200) {
    return fail('Invalid replay length');
  }
  if (!Array.isArray(replay.inputs) || replay.inputs.length > 1200) return fail('Invalid inputs');

  const inputs = new Map();
  let previousTick = -1;
  for (const input of replay.inputs) {
    const direction = normalizeDirection(input);
    if (input?.type !== 'direction' || !Number.isInteger(input.tick) || input.tick < 0 || input.tick >= replay.finalTick || !direction) {
      return fail('Invalid direction input');
    }
    if (input.tick < previousTick) return fail('Inputs are out of order');
    previousTick = input.tick;
    inputs.set(input.tick, direction);
  }

  const random = seededRandom(challenge.seed);
  let snake = initialSnake(challenge.boardCols, challenge.boardRows);
  let direction = { x: 1, y: 0 };
  let food = placeFood(challenge.boardCols, challenge.boardRows, snake, random);
  let score = 0;
  let speed = 110;
  let elapsedMs = 0;
  let finalFoodMs = null;
  let alive = true;

  for (let tick = 0; tick < replay.finalTick; tick++) {
    if (!alive) return fail('Replay continues after collision');
    direction = acceptDirection(direction, inputs.get(tick));
    const stepMs = speed;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    elapsedMs += stepMs;
    const hitWall = head.x < 0 || head.x >= challenge.boardCols || head.y < 0 || head.y >= challenge.boardRows;
    const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (hitWall || hitSelf) {
      alive = false;
      continue;
    }

    snake = [{ ...head }, ...snake];
    const ate = Boolean(food && head.x === food.x && head.y === food.y);
    if (ate) {
      score++;
      finalFoodMs = elapsedMs;
      speed = Math.max(55, 110 - score * 2);
      food = placeFood(challenge.boardCols, challenge.boardRows, snake, random);
    } else {
      snake.pop();
    }
  }

  if (replay.finishReason === 'collision' && alive) return fail('Expected collision did not occur');
  if (replay.finishReason === 'time' && !alive) return fail('Unexpected collision');
  if (replay.finishReason === 'time' && (elapsedMs > challenge.durationMs || challenge.durationMs - elapsedMs >= speed)) {
    return fail('Run did not end at the daily time limit');
  }
  if (elapsedMs > challenge.durationMs + 110) return fail('Run exceeds the daily time limit');
  if (score !== replay.finalScore || score !== submitted.score) return fail('Score mismatch');
  if ((submitted.finalFoodMs ?? null) !== finalFoodMs) return fail('Final-food time mismatch');

  return {
    verified: true,
    reason: null,
    score,
    finalFoodMs,
    elapsedMs,
    finishReason: replay.finishReason
  };
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function projectKey(legacyName: string, keySetName: string) {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const keySet = JSON.parse(Deno.env.get(keySetName) || '{}');
    return keySet.default || Object.values(keySet)[0] || null;
  } catch {
    return null;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = projectKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
  const serviceKey = projectKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return json({ error: 'Daily Run service is not configured' }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Authentication required' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const attemptId = typeof body?.attemptId === 'string' ? body.attemptId : '';
  const runToken = typeof body?.runToken === 'string' ? body.runToken : '';
  const controlMethod = typeof body?.controlMethod === 'string' ? body.controlMethod : '';
  const replay = body?.replay;
  const finalFoodMs = body?.finalFoodMs == null ? null : Number(body.finalFoodMs);
  if (!attemptId || !runToken || !['dpad', 'turn', 'tap', 'keyboard', 'mixed'].includes(controlMethod)) {
    return json({ error: 'Incomplete Daily Run submission' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: attempt, error: attemptError } = await admin
    .from('daily_attempts')
    .select('id, player_id, attempt_number, run_token, token_expires_at, status, score, final_food_ms, challenge:daily_challenges(*)')
    .eq('id', attemptId)
    .eq('player_id', user.id)
    .maybeSingle();

  if (attemptError || !attempt) return json({ error: 'Daily attempt was not found' }, 404);
  if (attempt.run_token !== runToken) return json({ error: 'Invalid run token' }, 403);
  if (attempt.status === 'rejected') return json({ error: 'This attempt was rejected' }, 409);
  if (attempt.status === 'reserved' && Date.parse(attempt.token_expires_at) < Date.now()) {
    await admin.from('daily_attempts').update({
      status: 'rejected', verification_state: 'rejected', rejection_reason: 'Run token expired'
    }).eq('id', attempt.id);
    return json({ error: 'Daily attempt expired' }, 410);
  }

  const challengeRow = Array.isArray(attempt.challenge) ? attempt.challenge[0] : attempt.challenge;
  if (!challengeRow) return json({ error: 'Daily challenge was not found' }, 500);
  const challenge = {
    seed: Number(challengeRow.seed),
    theme: challengeRow.theme,
    durationMs: challengeRow.duration_ms,
    boardCols: challengeRow.board_cols,
    boardRows: challengeRow.board_rows,
    rulesetVersion: challengeRow.ruleset_version
  };

  const validation = validateDailyReplay(replay, challenge, {
    score: Number(replay?.finalScore),
    finalFoodMs
  });

  if (!validation.verified) {
    await admin.from('daily_attempts').update({
      status: 'rejected',
      verification_state: 'rejected',
      rejection_reason: validation.reason,
      replay,
      completed_at: new Date().toISOString()
    }).eq('id', attempt.id).eq('status', 'reserved');
    return json({ error: validation.reason || 'Replay verification failed' }, 422);
  }

  if (attempt.status === 'reserved') {
    const { error: updateError } = await admin.from('daily_attempts').update({
      status: 'verified',
      verification_state: 'verified',
      score: validation.score,
      final_food_ms: validation.finalFoodMs,
      finish_reason: validation.finishReason,
      control_method: controlMethod,
      replay,
      rejection_reason: null,
      completed_at: new Date().toISOString()
    }).eq('id', attempt.id).eq('status', 'reserved');
    if (updateError) return json({ error: 'Could not save the verified attempt' }, 500);
  }

  const [{ data: ranking }, { count: attemptsUsed }, { data: runConfig }] = await Promise.all([
    admin.from('daily_leaderboard')
      .select('leaderboard_rank, score, final_food_ms')
      .eq('challenge_date', challengeRow.challenge_date)
      .eq('player_id', user.id)
      .maybeSingle(),
    admin.from('daily_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challengeRow.id)
      .eq('player_id', user.id),
    admin.from('daily_run_config')
      .select('debug_unlimited_attempts')
      .eq('singleton', true)
      .maybeSingle()
  ]);

  const unlimitedRankedRuns = runConfig?.debug_unlimited_attempts === true;

  return json({
    verified: true,
    attemptNumber: attempt.attempt_number,
    attemptsRemaining: unlimitedRankedRuns ? -1 : Math.max(0, 3 - (attemptsUsed || 0)),
    score: validation.score,
    finalFoodMs: validation.finalFoodMs,
    leaderboardRank: ranking?.leaderboard_rank ?? null,
    personalBest: ranking?.score ?? validation.score
  });
});
