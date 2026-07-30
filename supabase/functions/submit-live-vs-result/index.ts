import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateSeededTimedReplay } from '../_shared/daily-validator.mjs';

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
