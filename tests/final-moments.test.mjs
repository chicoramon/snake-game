import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFinalMomentsRecorder,
  finalMomentsCaption,
  replaySourceTime,
  sampleFinalMoments
} from '../src/replay/final-moments.js';

const state = score => ({
  snake: [{ x: score + 2, y: 3 }, { x: score + 1, y: 3 }],
  direction: { x: 1, y: 0 },
  food: { x: 9, y: 9 },
  score,
  speed: 100,
  remainingMs: 5000,
  themeId: 'default'
});

test('final-moments recorder retains only the rolling window and freezes immutable snapshots', () => {
  const recorder = createFinalMomentsRecorder({ windowMs: 2000 });
  recorder.begin({ mode: 'classic' });
  recorder.capture(state(0));
  for (let second = 1; second <= 5; second++) {
    recorder.advance(1000);
    recorder.capture(state(second));
  }
  const clip = recorder.freeze({ score: 5, reason: 'collision' });
  assert.ok(clip.snapshots.length <= 4);
  assert.equal(clip.snapshots.at(-1).score, 5);
  assert.equal(clip.snapshots[0].atMs, 0);
  assert.equal(Object.isFrozen(clip.snapshots[0].snake), true);
});

test('playback stretches the final source moments and samples between snapshots', () => {
  const clip = {
    durationMs: 8000,
    snapshots: [
      { atMs: 0, score: 1 },
      { atMs: 4000, score: 2 },
      { atMs: 8000, score: 3 }
    ]
  };
  assert.equal(replaySourceTime(clip, 4800), 7600);
  assert.equal(replaySourceTime(clip, 6000), 8000);
  const sample = sampleFinalMoments(clip, 6000);
  assert.equal(sample.previous.score, 2);
  assert.equal(sample.current.score, 3);
  assert.equal(sample.interpolation, 0.5);
});

test('replay captions recognize a record and a one-bite heartbreak', () => {
  assert.equal(finalMomentsCaption({ score: 31, topScore: 30 }), 'NEW #1');
  assert.equal(finalMomentsCaption({ score: 30, topScore: 30 }), 'ONE BITE SHORT');
});
