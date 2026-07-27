import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('live gameplay advances through the replay-validated SnakeCore rules', () => {
  assert.match(mainSource, /const nextState = SnakeCore\.advanceState\(/);
  assert.match(mainSource, /foodPlacement: runGameMode === 'daily' \? 'free-cells' : 'rejection'/);
  assert.match(mainSource, /if \(nextState\.event === 'collision'\)/);
  assert.match(mainSource, /if \(nextState\.event === 'eat'\)/);
  assert.match(mainSource, /food: eatenFood, theme: T/);
});
