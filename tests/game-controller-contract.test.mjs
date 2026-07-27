import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controllerSource = readFileSync(new URL('../src/game/game-controller.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('game controller owns animation-frame lifetime and a clamped simulation clock', () => {
  assert.match(controllerSource, /export function createGameController/);
  assert.match(controllerSource, /const dt = Math\.min\(rawDt, 100\)/);
  assert.match(controllerSource, /function start\(callback\)/);
  assert.match(controllerSource, /function stop\(\)/);
  assert.match(controllerSource, /function resetClock\(\)/);
});

test('main delegates frame scheduling and clock resets to the game controller', () => {
  assert.match(mainSource, /const gameController = createGameController\(\)/);
  assert.match(mainSource, /gameController\.start\(runGameFrame\)/);
  assert.match(mainSource, /function runGameFrame\(\{ rawDt, dt, clock \}\)/);
  assert.match(mainSource, /gameController\.resetClock\(\)/);
});
