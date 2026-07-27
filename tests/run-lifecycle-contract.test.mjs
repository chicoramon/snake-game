import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lifecycleSource = readFileSync(new URL('../src/game/run-lifecycle.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('run lifecycle owns ordered start and finish boundaries', () => {
  assert.match(lifecycleSource, /export function createRunLifecycle/);
  assert.match(lifecycleSource, /function begin\(/);
  assert.match(lifecycleSource, /controller\.stop\(\)/);
  assert.match(lifecycleSource, /controller\.start\(frame\)/);
  assert.match(lifecycleSource, /function finish\(/);
  assert.match(lifecycleSource, /schedule\(showResult/);
});

test('main delegates run transitions while retaining UI and Daily callbacks', () => {
  assert.match(mainSource, /const runLifecycle = createRunLifecycle\(\{ controller: gameController \}\)/);
  assert.match(mainSource, /runLifecycle\.begin\(\{/);
  assert.match(mainSource, /reset: \(\) => reset\(true\)/);
  assert.match(mainSource, /runLifecycle\.finish\(\{/);
  assert.match(mainSource, /showResult: \(\) => showRunResult\(reason\)/);
});
