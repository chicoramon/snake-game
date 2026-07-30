import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLiveVsService,
  isValidRoomCode,
  normalizeRoomCode
} from '../src/versus/live-vs-service.js';

test('Live Vs normalizes six-character private room codes', () => {
  assert.equal(normalizeRoomCode(' ab-12cd! '), 'AB12CD');
  assert.equal(isValidRoomCode('ab12cd'), true);
  assert.equal(isValidRoomCode('TOO-LONG'), false);
});

test('Live Vs room actions use authenticated RPCs', async () => {
  const calls = [];
  const supabase = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: { id: 'match-1', code: 'ABC123' }, error: null };
    }
  };
  const service = createLiveVsService({ supabase, getPlayerId: () => 'player-1' });
  await service.createRoom('sonic');
  await service.joinRoom('abc123');
  await service.selectStage('match-1', 'random', true);
  assert.deepEqual(calls, [
    ['create_live_vs_room', { p_theme: 'sonic' }],
    ['join_live_vs_room', { p_room_code: 'ABC123' }],
    ['select_live_vs_stage', {
      p_match_id: 'match-1',
      p_theme_choice: 'random',
      p_locked: true
    }]
  ]);
});

test('Live Vs submits the full replay to server verification', async () => {
  let invocation;
  const supabase = {
    rpc: async () => ({ data: {}, error: null }),
    functions: {
      invoke: async (name, options) => {
        invocation = [name, options];
        return { data: { verified: true, status: 'verifying' }, error: null };
      }
    }
  };
  const service = createLiveVsService({ supabase, getPlayerId: () => 'player-1' });
  const replay = { mode: 'versus', inputs: [] };
  await service.submitResult({
    matchId: 'match-1',
    roundNumber: 3,
    controlMethod: 'tap',
    replay,
    finalFoodMs: 3210
  });
  assert.deepEqual(invocation, [
    'submit-live-vs-result',
    { body: { matchId: 'match-1', roundNumber: 3, controlMethod: 'tap', replay, finalFoodMs: 3210 } }
  ]);
});

test('Live Vs measures server round-trip latency without trusting browser connection hints', async () => {
  const times = [1000, 1047];
  const supabase = {
    rpc: async () => ({ data: { id: 'match-1' }, error: null })
  };
  const service = createLiveVsService({
    supabase,
    getPlayerId: () => 'player-1',
    now: () => times.shift()
  });
  const sample = await service.measureLatency('match-1');
  assert.equal(sample.latencyMs, 47);
  assert.equal(sample.room.id, 'match-1');
});

test('Rival Ghost transport is capped at ten broadcasts per second', async () => {
  let time = 1000;
  const sent = [];
  const channel = {
    on() { return this; },
    subscribe(callback) { callback('SUBSCRIBED'); return this; },
    track: async () => {},
    send: async message => sent.push(message),
    presenceState: () => ({})
  };
  const supabase = {
    rpc: async () => ({ data: {}, error: null }),
    channel: () => channel,
    removeChannel: async () => {}
  };
  const service = createLiveVsService({
    supabase,
    getPlayerId: () => 'player-1',
    now: () => time
  });
  await service.connect('match-1');
  const state = {
    matchId: 'match-1',
    tick: 1,
    snake: [{ x: 1, y: 2 }],
    direction: { x: 1, y: 0 },
    food: { x: 7, y: 8 },
    score: 0,
    remainingMs: 12345,
    alive: true
  };
  assert.equal(await service.broadcastGhost(state), true);
  time += 50;
  assert.equal(await service.broadcastGhost(state), false);
  assert.equal(await service.broadcastGhost({ ...state, alive: false, force: true }), true);
  time += 100;
  assert.equal(await service.broadcastGhost(state), true);
  assert.equal(await service.broadcastLatency({ matchId: 'match-1', latencyMs: 63.7 }), true);
  assert.equal(sent.filter(message => message.event === 'ghost-state').length, 3);
  const firstGhost = sent.find(message => message.event === 'ghost-state').payload;
  assert.deepEqual(firstGhost.food, [7, 8]);
  assert.equal(firstGhost.remainingMs, 12345);
  assert.equal(sent.find(message => message.event === 'latency-state').payload.latencyMs, 64);
});
