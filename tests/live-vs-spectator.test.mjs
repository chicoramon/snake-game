import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeSpectatorSnapshot,
  interpolateRivalGhost,
  spectatorFeedStatus,
  spectatorRemainingMs
} from '../src/versus/live-vs-spectator.js';

test('spectator snapshots decode the full rival board without entering game logic', () => {
  const previous = decodeSpectatorSnapshot({
    snake: [[2, 3], [1, 3]],
    direction: [1, 0],
    food: [8, 9],
    score: 4,
    remainingMs: 42000,
    alive: true,
    sequence: 1,
    receivedAt: 1000
  });
  const next = decodeSpectatorSnapshot({
    snake: [[3, 3], [2, 3]],
    direction: [1, 0],
    food: [12, 14],
    score: 5,
    remainingMs: 41900,
    alive: true,
    sequence: 2,
    intervalMs: 40,
    receivedAt: 1100
  }, previous);

  assert.deepEqual(next.snake[0], { x: 3, y: 3 });
  assert.deepEqual(next.previousSnake, previous.snake);
  assert.deepEqual(next.food, { x: 12, y: 14 });
  assert.deepEqual(next.direction, { x: 1, y: 0 });
  assert.equal(next.score, 5);
  assert.equal(next.intervalMs, 40);
});

test('rival ghosts interpolate every render frame and extrapolate only briefly', () => {
  const snapshot = decodeSpectatorSnapshot({
    snake: [[3, 3], [2, 3]],
    direction: [1, 0],
    sequence: 2,
    intervalMs: 40,
    receivedAt: 1100
  }, decodeSpectatorSnapshot({
    snake: [[2, 3], [1, 3]],
    direction: [1, 0],
    sequence: 1,
    receivedAt: 1060
  }));

  assert.equal(interpolateRivalGhost(snapshot, 1120).snake[0].x, 2.5);
  const late = interpolateRivalGhost(snapshot, 1200);
  assert.equal(late.progress, 1.35);
  assert.equal(late.snake[0].x, 3.35);
  assert.equal(late.extrapolating, true);
});

test('rival ghosts snap instead of sweeping across a material correction', () => {
  const previous = decodeSpectatorSnapshot({
    snake: [[2, 3]], direction: [1, 0], sequence: 1, receivedAt: 1000
  });
  const corrected = decodeSpectatorSnapshot({
    snake: [[12, 18]], direction: [1, 0], sequence: 5, receivedAt: 1040
  }, previous);

  assert.deepEqual(corrected.previousSnake, corrected.snake);
  assert.deepEqual(interpolateRivalGhost(corrected, 1060).snake, corrected.snake);
});

test('spectator clock and signal state advance locally between rival packets', () => {
  const snapshot = decodeSpectatorSnapshot({
    snake: [[3, 3]],
    direction: [0, 1],
    food: [4, 4],
    remainingMs: 10000,
    receivedAt: 5000
  });

  assert.equal(spectatorRemainingMs(snapshot, 5250), 9750);
  assert.equal(spectatorFeedStatus(snapshot, 6000), 'live');
  assert.equal(spectatorFeedStatus(snapshot, 7000), 'reconnecting');
  assert.equal(spectatorFeedStatus(snapshot, 11000), 'signal-lost');
});
