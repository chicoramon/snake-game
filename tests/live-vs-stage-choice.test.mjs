import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCurrentStageChoice } from '../src/ui/live-vs-controller.js';

test('a newly selected Vs stage overrides the previous round snapshot', () => {
  assert.equal(resolveCurrentStageChoice('sonic', 'mario'), 'sonic');
});

test('the synchronized server choice remains a fallback before local selection', () => {
  assert.equal(resolveCurrentStageChoice(null, 'zelda'), 'zelda');
  assert.equal(resolveCurrentStageChoice(null, null), null);
});
