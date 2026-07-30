import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Live Vs lobby and controller are present in the modular app', () => {
  const html = read('index.html');
  const main = read('src/main.js');
  const controller = read('src/ui/live-vs-controller.js');
  const debugConfig = read('src/config/debug.js');
  const styles = read('src/styles/game.css');

  for (const id of [
    'vs-live-btn',
    'live-vs-panel',
    'live-vs-create',
    'live-vs-join',
    'live-vs-ready',
    'live-vs-share',
    'live-vs-session-score',
    'live-vs-last-round',
    'live-vs-history-count',
    'live-vs-history-list',
    'live-vs-waiting',
    'live-vs-waiting-score',
    'live-vs-waiting-status',
    'live-vs-stage-select',
    'live-vs-stage-grid',
    'live-vs-stage-reveal',
    'live-vs-host-stage',
    'live-vs-guest-stage',
    'live-vs-roulette-stage',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(main, /createLiveVsController/);
  assert.match(main, /submitVersusResult/);
  assert.match(main, /liveVsUi\.returnToLobby/);
  assert.match(main, /const URL_PARAMS = new URLSearchParams\(window\.location\.search\)/);
  assert.match(main, /const invitedLiveVsCode = URL_PARAMS\.get\('vs'\)/);
  assert.match(main, /if \(!invitedLiveVsCode && !GOLDEN_BACKDOOR\) whatsNewView\.scheduleInitialOpen\(\)/);
  assert.match(main, /if \(!invitedLiveVsCode && !GOLDEN_BACKDOOR\) onboardingView\.scheduleInitialOpen\(\)/);
  assert.match(main, /Promise\.resolve\(startPlayerIdentity\(\)\)[\s\S]*?\.then\(waitForPlayerIdentity\)[\s\S]*?liveVsUi\.openInvite\(invitedLiveVsCode\)/);
  assert.doesNotMatch(main, /playerIdentityPromise\s*[\r\n]+\s*\.catch\(\(\) => \{\}\)\s*[\r\n]+\s*\.then\(\(\) => liveVsUi\.openInvite/);
  assert.match(controller, /searchParams\.set\('vs', code\)/);
  assert.match(controller, /navigator\.share\(\{\s*title:\s*'Snake Vs Casual',\s*text,\s*url\s*\}\)/);
  assert.match(controller, /returnToLobby/);
  assert.match(controller, /waitForRival/);
  assert.match(controller, /service\.selectStage\(room\.id, choice, !mine\.ready\)/);
  assert.match(controller, /resolveCurrentStageChoice\(localStageChoice, mine\.themeChoice\)/);
  assert.match(controller, /stageRevealAt/);
  assert.match(controller, /ARENA ROULETTE/);
  assert.match(controller, /\['random', \{ name: 'Random'/);
  assert.match(controller, /cloneThemeArtwork/);
  assert.match(controller, /getElementById\(`ti-\$\{id\}`\)/);
  assert.match(controller, /theme-random-btn \.theme-icon/);
  assert.match(controller, /player\?\.ready \? 'READY'/);
  assert.match(controller, /const GAMEPLAY_COUNTDOWN_MS = 3000/);
  assert.match(controller, /startMs - GAMEPLAY_COUNTDOWN_MS/);
  assert.match(controller, /boardLaunchMs - ROULETTE_RESULT_HOLD_MS/);
  assert.match(controller, /completedRound \? localStageChoice/);
  assert.match(controller, /historyList\.replaceChildren\(\.\.\.cards\)/);
  assert.doesNotMatch(styles, /\.live-vs-stage-option::before/);
  assert.match(styles, /\.live-vs-stage-art > img/);
  assert.match(styles, /\.live-vs-history summary/);
  assert.match(styles, /max-height: 178px/);
  assert.ok(
    html.indexOf('id="live-vs-ready"') < html.indexOf('id="live-vs-last-round"'),
    'The next-round Ready action must remain above the archived results'
  );
  assert.match(main, /invalidateVersusRun/);
  assert.match(main, /latencyDiagnostics:\s*LIVE_VS_LATENCY_DEBUG/);
  assert.match(debugConfig, /DEFAULT_LIVE_VS_LATENCY_DEBUG\s*=\s*true/);
  assert.match(debugConfig, /vsdebug/);
});

test('Live Vs uses explicit waiting and departure lifecycle states', () => {
  const main = read('src/main.js');
  const controller = read('src/ui/live-vs-controller.js');

  assert.match(main, /liveVsUi\.waitForRival\(\{\s*score,\s*interrupted:/);
  assert.match(main, /onLeave:\s*\(\)\s*=>\s*returnFromVersusToMainMenu/);
  assert.match(main, /runGameMode = gameMode;[\s\S]*?reset\(false\);[\s\S]*?overlay\.classList\.remove\('hidden'\)/);
  assert.match(controller, /connectionState === 'forfeit'/);
  assert.match(controller, /LEFT ARENA/);
  assert.match(controller, /left the battle room\. This session is closed\./);
  assert.match(controller, /await service\.leaveRoom\(room\.id\);[\s\S]*?await service\.announceRoomRefresh\(room\.id\);[\s\S]*?onLeave\?\.\(departedRoom\)/);
  assert.doesNotMatch(controller, /if \(leave && room\?\.id && !startNotified\)/);
});

test('Rival Ghost is rendered behind the local snake and remains cosmetic', () => {
  const renderer = read('src/rendering/canvas-renderer.js');
  const ghostIndex = renderer.indexOf('drawRivalGhost(rivalGhost);');
  const localSnakeIndex = renderer.indexOf('for (let i = snake.length - 1;', ghostIndex);

  assert.ok(ghostIndex >= 0, 'Rival Ghost renderer is missing');
  assert.ok(localSnakeIndex > ghostIndex, 'Rival Ghost must render behind the local snake');
  assert.match(renderer, /globalAlpha/);
  assert.match(renderer, /rivalGhost/);
  assert.match(renderer, /triggerRivalTombstone/);
  assert.match(renderer, /drawTombstones\(\)/);
  assert.match(renderer, /showTombstone/);
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
  assert.match(sql, /create or replace function public\.select_live_vs_stage/);
  assert.match(sql, /create or replace function public\.live_vs_theme_pool/);
  assert.match(sql, /stage_reveal_at/);
  assert.match(sql, /theme_choice/);
  assert.match(sql, /theme_resolved/);
  assert.match(sql, /when v_host_theme = v_guest_theme then v_host_theme/);
  assert.match(sql, /when \(v_match\.seed % 2\) = 0 then v_host_theme/);
  assert.match(sql, /then interval '4\.2 seconds'/);
  assert.match(sql, /else interval '5\.8 seconds'/);
  assert.match(sql, /'theme', r\.theme/);
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
