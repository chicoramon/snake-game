import { createClient } from 'npm:@supabase/supabase-js@2';

// Inlined for deployment through the Supabase Dashboard editor.
// Canonical validator: ../functions/_shared/daily-validator.mjs
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

function validateSeededTimedReplay(replay, challenge, submitted = {}, expectedMode = 'daily') {
  const fail = reason => ({ verified: false, reason });
  if (!replay || typeof replay !== 'object') return fail('Replay is missing');
  if (replay.formatVersion !== 1) return fail('Unsupported replay format');
  if (replay.rulesetVersion !== challenge.rulesetVersion || replay.rulesetVersion !== DAILY_RULESET_VERSION) {
    return fail('Ruleset mismatch');
  }
  if (replay.mode !== expectedMode) return fail('Mode mismatch');
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
    return fail('Run did not end at the time limit');
  }
  if (elapsedMs > challenge.durationMs + 110) return fail('Run exceeds the time limit');
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

function validateDailyReplay(replay, challenge, submitted = {}) {
  return validateSeededTimedReplay(replay, challenge, submitted, 'daily');
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
    return json({ error: 'Live Vs service is not configured' }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Authentication required' }, 401);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400); }

  const matchId = typeof body?.matchId === 'string' ? body.matchId : '';
  const roundNumber = Number(body?.roundNumber);
  const controlMethod = typeof body?.controlMethod === 'string' ? body.controlMethod : '';
  const replay = body?.replay;
  const finalFoodMs = body?.finalFoodMs == null ? null : Number(body.finalFoodMs);
  if (!matchId || !Number.isInteger(roundNumber) || roundNumber < 1
      || !['dpad', 'turn', 'tap', 'keyboard', 'mixed'].includes(controlMethod)) {
    return json({ error: 'Incomplete Live Vs submission' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const [{ data: match, error: matchError }, { data: participant, error: playerError }] = await Promise.all([
    admin.from('live_vs_matches').select('*').eq('id', matchId).maybeSingle(),
    admin.from('live_vs_players').select('*').eq('match_id', matchId).eq('player_id', user.id).maybeSingle()
  ]);
  if (matchError || !match) return json({ error: 'Live Vs match was not found' }, 404);
  if (playerError || !participant) return json({ error: 'You are not a participant in this match' }, 403);
  if (Number(match.round_number) !== roundNumber) {
    return json({ error: 'This result belongs to an earlier Vs round' }, 409);
  }
  if (!['countdown', 'running', 'verifying', 'complete'].includes(match.status)) {
    return json({ error: 'Live Vs match is not accepting results' }, 409);
  }
  if (match.status === 'complete' && match.outcome === 'forfeit') {
    return json({
      verified: true,
      status: 'complete',
      score: participant.score,
      finalFoodMs: participant.final_food_ms,
      winnerPlayerId: match.winner_player_id,
      outcome: 'forfeit'
    });
  }
  if (participant.verification_state === 'rejected') {
    return json({ error: participant.rejection_reason || 'This result was rejected' }, 409);
  }

  const challenge = {
    seed: Number(match.seed),
    theme: match.theme,
    durationMs: match.duration_ms,
    boardCols: match.board_cols,
    boardRows: match.board_rows,
    rulesetVersion: match.ruleset_version
  };
  const validation = validateSeededTimedReplay(replay, challenge, {
    score: Number(replay?.finalScore),
    finalFoodMs
  }, 'versus');

  if (!validation.verified) {
    await admin.from('live_vs_players').update({
      verification_state: 'rejected',
      rejection_reason: validation.reason,
      replay,
      submitted_at: new Date().toISOString()
    }).eq('match_id', matchId).eq('player_id', user.id);
    return json({ error: validation.reason || 'Replay verification failed' }, 422);
  }

  const { error: updateError } = await admin.from('live_vs_players').update({
    score: validation.score,
    final_food_ms: validation.finalFoodMs,
    finish_reason: validation.finishReason,
    control_method: controlMethod,
    replay,
    verification_state: 'verified',
    rejection_reason: null,
    submitted_at: new Date().toISOString()
  }).eq('match_id', matchId).eq('player_id', user.id);
  if (updateError) return json({ error: 'Could not save the verified result' }, 500);

  const { data: finalization, error: finalizationError } = await admin.rpc(
    'finalize_live_vs_round',
    { p_match_id: matchId }
  );
  if (finalizationError) {
    console.error('Live Vs round finalization failed', finalizationError);
    return json({ error: 'Could not finalize the verified round' }, 500);
  }
  const status = finalization?.complete ? 'complete' : 'verifying';

  return json({
    verified: true,
    status,
    score: validation.score,
    finalFoodMs: validation.finalFoodMs,
    winnerPlayerId: finalization?.winnerPlayerId || null,
    outcome: finalization?.outcome || null,
    roundNumber
  });
});
