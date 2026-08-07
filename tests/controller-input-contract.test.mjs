import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('controller is a first-class ranked input across the browser and backend', () => {
  const main = read('../src/main.js');
  const leaderboard = read('../src/ui/leaderboard-controller.js');
  const daily = read('../supabase/functions/submit-daily-attempt/index.ts');
  const versus = read('../supabase/functions/submit-live-vs-result/index.ts');
  const migration = read('../supabase-controller-input.sql');

  assert.match(main, /controller: 'CONTROLLER'/);
  assert.match(main, /RECORD_METHODS = \[[^\]]*'controller'/);
  assert.match(leaderboard, /\['all', 'dpad', 'turn', 'tap', 'keyboard', 'controller'\]/);
  assert.match(daily, /'keyboard', 'controller', 'mixed'/);
  assert.match(versus, /'keyboard', 'controller', 'mixed'/);
  assert.match(migration, /submit_best_score/);
  assert.match(migration, /daily_attempts_control_method_check/);
  assert.match(migration, /player_run_stats_control_check/);
});
