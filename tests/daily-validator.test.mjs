import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  validateDailyReplay,
  validateSeededTimedReplay
} from '../supabase/functions/_shared/daily-validator.mjs';

const require = createRequire(import.meta.url);
const SnakeCore = require('../snake-core.js');
const challenge = {
  seed: SnakeCore.normalizeSeed('validator-test'),
  theme: 'default',
  durationMs: 60000,
  boardCols: 20,
  boardRows: 32,
  rulesetVersion: SnakeCore.RULESET_VERSION
};

const replay = SnakeCore.createReplay({
  seed: challenge.seed,
  mode: 'daily',
  theme: challenge.theme,
  cols: challenge.boardCols,
  rows: challenge.boardRows
});
const cycle = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
for (let tick = 0; tick < 545; tick++) SnakeCore.recordDirection(replay, tick, cycle[tick % cycle.length]);
SnakeCore.finalizeReplay(replay, { tick: 545, score: 0, reason: 'time' });

assert.equal(
  validateDailyReplay(replay, challenge, { score: 0, finalFoodMs: null }).verified,
  true
);

assert.equal(
  validateDailyReplay({ ...replay, finalScore: 99 }, challenge, { score: 99, finalFoodMs: null }).verified,
  false
);

assert.equal(
  validateDailyReplay({ ...replay, seed: replay.seed + 1 }, challenge, { score: 0, finalFoodMs: null }).verified,
  false
);

const collisionReplay = SnakeCore.createReplay({
  seed: challenge.seed,
  mode: 'daily',
  theme: challenge.theme,
  cols: challenge.boardCols,
  rows: challenge.boardRows
});
SnakeCore.finalizeReplay(collisionReplay, { tick: 10, score: 0, reason: 'collision' });
assert.equal(
  validateDailyReplay(collisionReplay, challenge, { score: 0, finalFoodMs: null }).verified,
  true
);

const versusReplay = { ...replay, mode: 'versus' };
assert.equal(
  validateSeededTimedReplay(versusReplay, challenge, { score: 0, finalFoodMs: null }, 'versus').verified,
  true
);

const fastChallenge = { ...challenge, speedMultiplier: 4 };
const fastReplay = SnakeCore.createReplay({
  seed: fastChallenge.seed,
  mode: 'versus',
  theme: fastChallenge.theme,
  cols: fastChallenge.boardCols,
  rows: fastChallenge.boardRows
});
for (let tick = 0; tick < 2142; tick++) {
  SnakeCore.recordDirection(fastReplay, tick, cycle[tick % cycle.length]);
}
SnakeCore.finalizeReplay(fastReplay, { tick: 2142, score: 0, reason: 'time' });
assert.equal(
  validateSeededTimedReplay(fastReplay, fastChallenge, { score: 0, finalFoodMs: null }, 'versus').verified,
  true,
  'x4 rooms must permit and verify the larger deterministic tick stream'
);

console.log('daily validator tests passed');
