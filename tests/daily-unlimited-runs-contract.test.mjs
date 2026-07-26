import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAppSource } from './app-source.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(testDir, '..');
const read = path => readFileSync(join(rootDir, path), 'utf8');

const html = readAppSource();
const canonicalSql = read('supabase-daily-run.sql');
const rolloutSql = read('supabase-daily-run-unlimited-attempts.sql');
const edgeFunction = read('supabase/functions/submit-daily-attempt/index.ts');
const dashboardFunction = read('supabase/dashboard/submit-daily-attempt-index.ts');

test('Daily Run enables unlimited ranked runs for existing and clean installations', () => {
  assert.match(canonicalSql, /debug_unlimited_attempts boolean not null default true/i);
  assert.match(
    canonicalSql,
    /on conflict \(singleton\) do update\s+set debug_unlimited_attempts = true/i
  );
  assert.match(
    rolloutSql,
    /alter column debug_unlimited_attempts set default true/i
  );
  assert.match(
    rolloutSql,
    /on conflict \(singleton\) do update\s+set debug_unlimited_attempts = excluded\.debug_unlimited_attempts/i
  );
});

test('both Edge Function entrypoints return the unlimited sentinel', () => {
  for (const source of [edgeFunction, dashboardFunction]) {
    assert.match(source, /const unlimitedRankedRuns = runConfig\?\.debug_unlimited_attempts === true/);
    assert.match(source, /attemptsRemaining: unlimitedRankedRuns \? -1/);
  }
});

test('Daily Run presents unlimited ranked runs without debug or three-run wording', () => {
  assert.match(html, /Every run is ranked\. Play as many times as you like before the UTC day ends\./);
  assert.match(html, /return `Ranked run #\$\{number\}`/);
  assert.match(html, /\? 'Unlimited ranked runs'/);
  assert.match(html, /Daily Run now offers unlimited ranked runs until the UTC day ends\./);
  assert.doesNotMatch(html, /DEBUG • Unlimited ranked attempts|three ranked attempts|ranked attempt \$\{number\}\/3/i);
});

test('the proposed Daily speed increase remains deferred', () => {
  assert.match(html, /const BASE_INTERVAL = 110/);
  assert.match(html, /const MIN_INTERVAL = 55/);
  assert.match(edgeFunction, /attemptsRemaining: unlimitedRankedRuns \? -1/);
});
