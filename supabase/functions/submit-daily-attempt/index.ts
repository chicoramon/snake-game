import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateDailyReplay } from '../_shared/daily-validator.mjs';

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
