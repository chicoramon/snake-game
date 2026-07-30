import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Live Vs lobby and controller are present in the modular app', () => {
  const html = read('index.html');
  const main = read('src/main.js');
  const controller = read('src/ui/live-vs-controller.js');
  const debugConfig = read('src/config/debug.js');

  for (const id of [
    'vs-live-btn',
    'live-vs-panel',
    'live-vs-create',
    'live-vs-join',
    'live-vs-ready',
    'live-vs-share',
    'live-vs-session-score',
    'live-vs-last-round',
    'live-vs-history-list',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(main, /createLiveVsController/);
  assert.match(main, /submitVersusResult/);
  assert.match(main, /liveVsUi\.returnToLobby/);
  assert.match(main, /URLSearchParams\(window\.location\.search\)\.get\('vs'\)/);
  assert.match(controller, /searchParams\.set\('vs', code\)/);
  assert.match(controller, /navigator\.share\(\{\s*title:\s*'Snake Live Vs',\s*text,\s*url\s*\}\)/);
  assert.match(controller, /returnToLobby/);
  assert.match(main, /invalidateVersusRun/);
  assert.match(main, /latencyDiagnostics:\s*LIVE_VS_LATENCY_DEBUG/);
  assert.match(debugConfig, /DEFAULT_LIVE_VS_LATENCY_DEBUG\s*=\s*true/);
  assert.match(debugConfig, /vsdebug/);
});

test('Rival Ghost is rendered behind the local snake and remains cosmetic', () => {
  const renderer = read('src/rendering/canvas-renderer.js');
  const ghostIndex = renderer.indexOf('drawRivalGhost(rivalGhost);');
  const localSnakeIndex = renderer.indexOf('for (let i = snake.length - 1;', ghostIndex);

  assert.ok(ghostIndex >= 0, 'Rival Ghost renderer is missing');
  assert.ok(localSnakeIndex > ghostIndex, 'Rival Ghost must render behind the local snake');
  assert.match(renderer, /globalAlpha/);
  assert.match(renderer, /rivalGhost/);
});

test('Live Vs backend uses private participant rooms and verified replay results', () => {
  const sql = read('supabase-live-vs.sql');
  const edge = read('supabase/functions/submit-live-vs-result/index.ts');
  const dashboardEdge = read('supabase/dashboard/submit-live-vs-result-index.ts');

  assert.match(sql, /create policy "Live Vs participants receive Realtime"/);
  assert.match(sql, /create policy "Live Vs participants send Realtime"/);
  assert.match(sql, /create or replace function public\.create_live_vs_room/);
  assert.match(sql, /create or replace function public\.join_live_vs_room/);
  assert.match(sql, /create table if not exists public\.live_vs_rounds/);
  assert.match(sql, /create or replace function public\.finalize_live_vs_round/);
  assert.match(sql, /host_wins/);
  assert.match(sql, /guest_wins/);
  assert.match(sql, /round_number = round_number \+ 1/);
  assert.doesNotMatch(sql, /(?:get|gen)_random_bytes\s*\(/);
  assert.match(sql, /floor\(random\(\) \* 4294967296\)::bigint/);
  assert.match(sql, /winner_player_id = v_rival\.player_id/);
  assert.match(edge, /validateSeededTimedReplay/);
  assert.match(edge, /finalize_live_vs_round/);
  assert.match(edge, /},\s*'versus'\);/);
  assert.doesNotMatch(dashboardEdge, /\.\.\/_shared\/daily-validator/);
  assert.match(dashboardEdge, /function validateSeededTimedReplay/);
});
