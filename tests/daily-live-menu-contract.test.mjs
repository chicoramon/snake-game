import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppSource } from './app-source.mjs';

const html = readAppSource();

test('selecting Daily Run fetches the authoritative live challenge', () => {
  assert.match(
    html,
    /onModeSelected:\s*mode\s*=>\s*\{[\s\S]*?if\s*\(mode\s*===\s*['"]daily['"]\)\s*refreshDailyChallenge\(\{\s*force:\s*true\s*\}\)/
  );
  assert.match(html, /Loading live Daily Run…/);
});

test('a stale failed Daily request cannot restore the local preview', () => {
  assert.match(
    html,
    /catch\s*\(error\)\s*\{\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*if\s*\(requestId\s*!==\s*dailyChallengeRequest\)\s*return/
  );
});

test('Daily Run reconciles after Safari restore or network recovery', () => {
  assert.match(html, /window\.addEventListener\(['"]online['"],\s*refreshVisibleDailyMenu\)/);
  assert.match(html, /event\.persisted\)\s*refreshVisibleDailyMenu\(\)/);
  assert.match(html, /document\.visibilityState\s*===\s*['"]visible['"]\)\s*refreshVisibleDailyMenu\(\)/);
});
