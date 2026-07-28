import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveGameSession } from '../src/game/live-game-session.js';

function createRenderer() {
  return {
    effects: false,
    updates: [],
    draws: [],
    hasActiveEffects() { return this.effects; },
    update(dt) { this.updates.push(dt); },
    draw(interpolation) { this.draws.push(interpolation); },
    updateFps() {}
  };
}

test('live session advances normal gameplay with a single accumulated frame delta', () => {
  const renderer = createRenderer();
  const state = { alive: true, paused: false, countdownActive: false, runGameMode: 'classic', speed: 50 };
  let ticks = 0;
  const session = createLiveGameSession({ renderer, getState: () => state, onTick: () => { ticks++; } });

  assert.equal(session.frame({ rawDt: 100, dt: 100, clock: { tickAccum: 0 } }), true);
  assert.equal(ticks, 2);
  assert.deepEqual(renderer.updates, [100]);
});

test('live session stops only after gameplay and visual effects are both inactive', () => {
  const renderer = createRenderer();
  const state = { alive: false, paused: false, countdownActive: false, runGameMode: 'classic', speed: 50 };
  const session = createLiveGameSession({ renderer, getState: () => state, onTick: () => {} });
  assert.equal(session.frame({ rawDt: 16, dt: 16, clock: { tickAccum: 0 } }), false);

  renderer.effects = true;
  assert.equal(session.frame({ rawDt: 16, dt: 16, clock: { tickAccum: 0 } }), true);
  assert.equal(renderer.draws.length, 1);
});
