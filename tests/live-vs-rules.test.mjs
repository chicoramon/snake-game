import test from 'node:test';
import assert from 'node:assert/strict';
import {
  liveVsFormatLabel,
  liveVsGhostInterval,
  liveVsSeriesTarget,
  normalizeLiveVsRoomSettings,
  scaleLiveVsInterval
} from '../src/versus/live-vs-rules.js';

test('Vs Casual room settings normalize to safe competitive defaults', () => {
  assert.deepEqual(normalizeLiveVsRoomSettings(), {
    matchFormat: 'continuous',
    speedMultiplier: 1,
    allowKeyboard: true,
    rivalGhostEnabled: true
  });
  assert.deepEqual(normalizeLiveVsRoomSettings({
    matchFormat: 'best_of_7',
    speedMultiplier: 4,
    allowKeyboard: false,
    rivalGhostEnabled: false
  }), {
    matchFormat: 'best_of_7',
    speedMultiplier: 4,
    allowKeyboard: false,
    rivalGhostEnabled: false
  });
});

test('series targets and full speed-curve scaling are deterministic', () => {
  assert.equal(liveVsSeriesTarget('best_of_3'), 2);
  assert.equal(liveVsSeriesTarget('best_of_7'), 4);
  assert.equal(liveVsSeriesTarget('continuous'), 0);
  assert.equal(liveVsFormatLabel('best_of_5'), 'BEST OF 5');
  assert.equal(scaleLiveVsInterval(110, 2), 55);
  assert.equal(scaleLiveVsInterval(108, 4), 27);
  assert.equal(scaleLiveVsInterval(55, 4), 14);
});

test('ghost transport increases its update rate with room speed', () => {
  assert.equal(liveVsGhostInterval(1), 67);
  assert.equal(liveVsGhostInterval(2), 40);
  assert.equal(liveVsGhostInterval(4), 25);
});
