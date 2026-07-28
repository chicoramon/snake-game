import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUN_COUNTDOWN_MS,
  SPRINT_DURATION_MS,
  accumulateDailyFrame,
  advanceCountdown,
  advanceSprintTimer,
  createTimedRunState,
  formatTimedRunTime,
  isTimedMode,
  modeHudLabel
} from '../src/game/run-modes.js';

test('competitive modes retain their labels, duration, and countdown rules', () => {
  assert.equal(modeHudLabel('classic'), 'CLASSIC');
  assert.equal(modeHudLabel('sprint'), 'SPRINT');
  assert.equal(modeHudLabel('daily'), 'DAILY');
  assert.equal(isTimedMode('classic'), false);
  assert.equal(isTimedMode('sprint'), true);
  assert.deepEqual(createTimedRunState({ mode: 'sprint' }), {
    durationMs: SPRINT_DURATION_MS,
    remainingMs: SPRINT_DURATION_MS,
    countdownMs: RUN_COUNTDOWN_MS
  });
});

test('timed clocks never become negative and retain the existing display format', () => {
  assert.equal(advanceCountdown(200, 300), 0);
  assert.equal(advanceSprintTimer(500, 125), 375);
  assert.equal(formatTimedRunTime(60_000), '1:00');
  assert.equal(formatTimedRunTime(1), '0:01');
});

test('Daily Run accepts only simulation time remaining in its fixed window', () => {
  assert.deepEqual(accumulateDailyFrame({
    durationMs: 60_000,
    elapsedMs: 59_950,
    tickAccum: 25,
    frameMs: 100
  }), {
    acceptedMs: 25,
    tickAccum: 50,
    remainingMs: 0
  });
});
