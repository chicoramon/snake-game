import test from 'node:test';
import assert from 'node:assert/strict';
import {
  jetTrailIntensity,
  reachedSonicBoom,
  speedProgress
} from '../src/game/speed-effects.js';

test('speed progress follows the active interval curve', () => {
  assert.equal(speedProgress({ speed: 110, baseInterval: 110, minInterval: 55 }), 0);
  assert.equal(speedProgress({ speed: 55, baseInterval: 110, minInterval: 55 }), 1);
  assert.equal(speedProgress({ speed: 82.5, baseInterval: 110, minInterval: 55 }), 0.5);
});

test('scaled Vs curves produce the same normalized progress', () => {
  assert.equal(speedProgress({ speed: 27.5, baseInterval: 55, minInterval: 27.5 }), 1);
  assert.equal(speedProgress({ speed: 14, baseInterval: 28, minInterval: 14 }), 1);
  assert.equal(speedProgress({ speed: 28, baseInterval: 28, minInterval: 14 }), 0);
});

test('jet trail builds near the cap and sonic boom only qualifies at the cap', () => {
  assert.equal(jetTrailIntensity(0.7), 0);
  assert.ok(Math.abs(jetTrailIntensity(0.8) - 0.5) < 1e-9);
  assert.equal(jetTrailIntensity(0.9), 1);
  assert.equal(jetTrailIntensity(1), 1);
  assert.equal(reachedSonicBoom(0.999), false);
  assert.equal(reachedSonicBoom(1), true);
});
