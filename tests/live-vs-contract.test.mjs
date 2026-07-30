import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Live Vs lobby and controller are present in the modular app', () => {
  const html = read('index.html');
  const main = read('src/main.js');

  for (const id of [
    'vs-live-btn',
    'live-vs-panel',
    'live-vs-create',
    'live-vs-join',
    'live-vs-ready',
    'live-vs-share',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(main, /createLiveVsController/);
  assert.match(main, /submitVersusResult/);
  assert.match(main, /invalidateVersusRun/);
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
  assert.doesNotMatch(sql, /(?:get|gen)_random_bytes\s*\(/);
  assert.match(sql, /floor\(random\(\) \* 4294967296\)::bigint/);
  assert.match(sql, /winner_player_id = v_rival_id/);
  assert.match(edge, /validateSeededTimedReplay/);
  assert.match(edge, /},\s*'versus'\);/);
  assert.doesNotMatch(dashboardEdge, /\.\.\/_shared\/daily-validator/);
  assert.match(dashboardEdge, /function validateSeededTimedReplay/);
});
