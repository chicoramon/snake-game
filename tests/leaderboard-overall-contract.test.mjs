import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAppSource } from './app-source.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(testDir, '..');
const sql = readFileSync(join(rootDir, 'supabase-leaderboard-overall-best.sql'), 'utf8');
const html = readAppSource();
const leaderboardServiceSource = readFileSync(join(rootDir, 'src', 'leaderboard', 'leaderboard-service.js'), 'utf8');

test('overall leaderboard is deduplicated, ranked, and counted on the server', () => {
  assert.match(sql, /create or replace function public\.get_overall_leaderboard/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /when l\.player_id is not null then 'player:' \|\| l\.player_id::text/i);
  assert.match(sql, /partition by f\.player_key/i);
  assert.match(sql, /where player_best_order = 1/i);
  assert.match(sql, /count\(\*\) over \(\) as total_count/i);
  assert.match(sql, /b\.score desc,\s*b\.created_at asc/i);
  assert.match(
    sql,
    /grant execute on function public\.get_overall_leaderboard\(text, text, integer, integer\)\s+to anon, authenticated/i
  );
});

test('only the non-Daily ALL control filter uses the overall leaderboard RPC', () => {
  assert.match(html, /leaderboardService\.fetchPage\(\{/);
  assert.match(leaderboardServiceSource, /if \(gameMode === 'daily'\)/);
  assert.match(leaderboardServiceSource, /if \(control === 'all'\)/);
  assert.match(leaderboardServiceSource, /rpc\('get_overall_leaderboard'/);
  assert.match(leaderboardServiceSource, /p_game_mode: gameMode/);
  assert.match(leaderboardServiceSource, /p_theme: theme === 'all' \? null : theme/);
  assert.match(leaderboardServiceSource, /count: rows\.length > 0 \? Number\(rows\[0\]\.total_count\) : 0/);
});
