import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const serviceSource = fs.readFileSync(new URL('../src/daily/daily-run-service.js', import.meta.url), 'utf8');
const edgeSource = fs.readFileSync(
  new URL('../supabase/functions/submit-daily-attempt/index.ts', import.meta.url),
  'utf8'
);
const dashboardEdgeSource = fs.readFileSync(
  new URL('../supabase/dashboard/submit-daily-attempt-index.ts', import.meta.url),
  'utf8'
);

test('a late Daily response can only settle the attempt that initiated it', () => {
  assert.match(mainSource, /const submittingAttempt = dailyAttempt;/);
  assert.match(mainSource, /submittingAttempt\.submitted = true;/);
  assert.match(mainSource, /if \(dailyAttempt !== submittingAttempt\)/);
  assert.doesNotMatch(mainSource, /dailyAttempt\.submitted = true;/);
});

test('Daily verification requires a persisted row for the same attempt', () => {
  assert.match(serviceSource, /data\.persisted !== true/);
  assert.match(serviceSource, /data\.attemptId !== payload\?\.attemptId/);
  for (const source of [edgeSource, dashboardEdgeSource]) {
    assert.match(source, /\.select\('id, attempt_number, status, verification_state, score, final_food_ms'\)/);
    assert.match(source, /persistedAttempt\.status !== 'verified'/);
    assert.match(source, /persisted: true/);
    assert.match(source, /attemptId: persistedAttempt\.id/);
  }
});
