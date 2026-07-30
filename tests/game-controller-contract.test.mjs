import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controllerSource = readFileSync(new URL('../src/game/game-controller.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sessionSource = readFileSync(new URL('../src/game/live-game-session.js', import.meta.url), 'utf8');

test('game controller owns animation-frame lifetime and a clamped simulation clock', () => {
  assert.match(controllerSource, /export function createGameController/);
  assert.match(controllerSource, /const dt = Math\.min\(rawDt, 100\)/);
  assert.match(controllerSource, /function start\(callback\)/);
  assert.match(controllerSource, /function stop\(\)/);
  assert.match(controllerSource, /function resetClock\(\)/);
});

test('main delegates frame scheduling and clock resets to the game controller', () => {
  assert.match(mainSource, /const gameController = createGameController\(\)/);
  assert.match(mainSource, /const runLifecycle = createRunLifecycle\(\{ controller: gameController \}\)/);
  assert.match(mainSource, /frame: liveGameSession\.frame/);
  assert.match(sessionSource, /export function createLiveGameSession/);
  assert.match(sessionSource, /function frame\(\{ rawDt, dt, clock \}\)/);
  assert.match(mainSource, /gameController\.resetClock\(\)/);
});

test('leaving the page pauses regular runs and invalidates unpausable competitive runs', () => {
  assert.match(mainSource, /function pauseForInactivity\(event\) \{/);
  assert.match(mainSource, /const isFreshVisibleBlur = event\?\.type === 'blur'/);
  assert.match(mainSource, /if \(runGameMode === 'daily'\) \{\s+invalidateDailyRun\(\);\s+return;/);
  assert.match(mainSource, /if \(!alive \|\| runGameMode === 'daily' \|\| runGameMode === 'versus'\) return;/);
  assert.match(mainSource, /pauseBtn\.hidden = competitivePauseDisabled;/);
  assert.match(mainSource, /pauseBtn\.disabled = competitivePauseDisabled;/);
  assert.match(mainSource, /function invalidateDailyRun\(\) \{/);
  assert.match(mainSource, /function invalidateVersusRun\(\) \{/);
  assert.match(mainSource, /showRunResult\('interrupted'\)/);
  assert.match(mainSource, /document\.visibilityState !== 'visible'\) pauseForInactivity\(\)/);
  assert.match(mainSource, /window\.addEventListener\('pagehide', pauseForInactivity, \{ capture: true \}\)/);
  assert.match(mainSource, /window\.addEventListener\('blur', pauseForInactivity, \{ capture: true \}\)/);
});
