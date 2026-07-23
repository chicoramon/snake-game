'use strict';

const assert = require('node:assert/strict');
const SnakeCore = require('../snake-core.js');

function runDeterministicScenario(seed) {
  const random = SnakeCore.createSeededRandom(seed);
  let state = {
    snake: SnakeCore.createInitialSnake(20, 32),
    direction: { x: 1, y: 0 },
    food: { x: 11, y: 16 },
    score: 0,
    speed: 110,
    alive: true
  };
  const options = {
    cols: 20,
    rows: 32,
    baseInterval: 110,
    minInterval: 55,
    foodPlacement: 'free-cells'
  };
  const inputs = new Map([
    [2, { x: 0, y: 1 }],
    [5, { x: -1, y: 0 }],
    [8, { x: 0, y: -1 }]
  ]);

  for (let tick = 0; tick < 12 && state.alive; tick++) {
    state = SnakeCore.advanceState(state, inputs.get(tick) || state.direction, options, random);
  }
  return state;
}

assert.equal(SnakeCore.RULESET_VERSION, 'snake-rules-v1');
assert.equal(SnakeCore.normalizeSeed('2026-07-22'), SnakeCore.normalizeSeed('2026-07-22'));

const firstRun = runDeterministicScenario('daily-001');
const repeatedRun = runDeterministicScenario('daily-001');
const differentRun = runDeterministicScenario('daily-002');

assert.deepEqual(repeatedRun, firstRun, 'same seed and inputs must reproduce the same state');
assert.notDeepEqual(differentRun.food, firstRun.food, 'different seeds should alter gameplay food placement');
assert.equal(firstRun.score, 1);

let dailyRandomCalls = 0;
const dailyFood = SnakeCore.placeFoodFromFreeCells({
  cols: 4,
  rows: 2,
  snake: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  random: () => { dailyRandomCalls++; return 0.5; }
});
assert.deepEqual(dailyFood, { x: 1, y: 1 });
assert.equal(dailyRandomCalls, 1, 'Daily placement must consume exactly one random value');

const nativeValues = [0.25, 0.5];
const nativeRandom = SnakeCore.createNativeRandom(() => nativeValues.shift());
assert.deepEqual(
  SnakeCore.placeFood({ cols: 20, rows: 32, snake: [], random: nativeRandom }),
  { x: 5, y: 16 },
  'unseeded modes must preserve the existing two-random-call placement behavior'
);

const replay = SnakeCore.createReplay({ seed: 'daily-001', cols: 20, rows: 32, mode: 'daily' });
assert.equal(SnakeCore.recordDirection(replay, 4, { x: 0, y: -1 }), true);
assert.equal(SnakeCore.recordDirection(replay, 5, { x: 0, y: -1 }), false);
SnakeCore.finalizeReplay(replay, { tick: 12, score: 1, reason: 'time' });
assert.deepEqual(replay.inputs, [{ tick: 4, type: 'direction', x: 0, y: -1 }]);
assert.equal(replay.finalTick, 12);
assert.equal(replay.finalScore, 1);

const simulatedReplay = SnakeCore.createReplay({ seed: 'round-trip', cols: 20, rows: 32, mode: 'daily' });
SnakeCore.recordDirection(simulatedReplay, 3, { x: 0, y: 1 });
SnakeCore.recordDirection(simulatedReplay, 7, { x: -1, y: 0 });
SnakeCore.finalizeReplay(simulatedReplay, { tick: 14, score: 0, reason: 'time' });
const replayResult = SnakeCore.simulateReplay(simulatedReplay, { baseInterval: 110, minInterval: 55 });
assert.equal(replayResult.verified, true, 'a seeded Daily replay must verify through re-simulation');
simulatedReplay.finalScore = 99;
assert.equal(
  SnakeCore.simulateReplay(simulatedReplay, { baseInterval: 110, minInterval: 55 }).verified,
  false,
  'a forged final score must fail replay verification'
);

console.log('snake-core deterministic tests passed');
