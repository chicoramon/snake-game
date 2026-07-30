import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAppSource } from './app-source.mjs';

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(testDir, '..');
const sql = readFileSync(join(rootDir, 'supabase-player-display-names.sql'), 'utf8');
const html = readAppSource();
const playerProfileServiceSource = readFileSync(join(rootDir, 'src', 'player', 'player-profile-service.js'), 'utf8');
const playerAuthServiceSource = readFileSync(join(rootDir, 'src', 'player', 'player-auth-service.js'), 'utf8');
const leaderboardServiceSource = readFileSync(join(rootDir, 'src', 'leaderboard', 'leaderboard-service.js'), 'utf8');
const playerIdentitySource = readFileSync(join(rootDir, 'src', 'player', 'player-identity-controller.js'), 'utf8');
const leaderboardUiSource = readFileSync(join(rootDir, 'src', 'ui', 'leaderboard-controller.js'), 'utf8');

test('display-name migration validates writes and exposes only the public card fields', () => {
  assert.match(sql, /add column if not exists display_name text/i);
  assert.match(sql, /char_length\(display_name\) between 2 and 20/i);
  assert.match(sql, /create or replace function public\.set_player_display_name\(p_display_name text\)/i);
  assert.match(sql, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(sql, /where p\.id = v_uid/i);
  assert.match(sql, /create or replace function public\.get_public_player_card\(p_player_id uuid\)/i);
  assert.match(
    sql,
    /returns table \(\s*display_name text,\s*initials text,\s*player_code text\s*\)/i
  );
  assert.doesNotMatch(sql, /returns table \([^)]*email/is);
  assert.match(
    sql,
    /grant execute on function public\.get_public_player_card\(uuid\)\s+to anon, authenticated/i
  );
});

test('Player menu supports saving and clearing an optional display name', () => {
  assert.match(html, /id="player-display-name-input"[^>]*maxlength="20"/i);
  assert.match(html, /id="player-display-name-save"/i);
  assert.match(playerIdentitySource, /async function saveDisplayName\(value\)/);
  assert.match(playerIdentitySource, /profileService\.saveDisplayName\(currentUser, displayName\)/);
  assert.match(playerProfileServiceSource, /rpc\('set_player_display_name'/);
  assert.match(playerProfileServiceSource, /p_display_name: displayName \|\| null/);
  assert.match(html, /id: '2026-07-24-player-cards'/);
});

test('email restoration cannot let a stale anonymous session overwrite its player profile', () => {
  assert.match(html, /let playerIdentityRevision = 0/);
  assert.match(playerIdentitySource, /async function loadProfile\(user = getState\(\)\.currentUser, revision = getState\(\)\.playerIdentityRevision\)/);
  assert.match(playerIdentitySource, /profileService\.loadProfile\(user\)/);
  assert.match(playerProfileServiceSource, /\.eq\('id', user\.id\)/);
  assert.match(playerIdentitySource, /revision !== getState\(\)\.playerIdentityRevision \|\| getState\(\)\.currentUser\?\.id !== user\.id/);
  assert.match(playerIdentitySource, /activeSession = await authService\.getSession\(\)/);
  assert.match(playerAuthServiceSource, /onAuthStateChange/);
  assert.match(playerIdentitySource, /activeSession\?\.user\?\.id \|\| null\) !== \(eventSession\?\.user\?\.id \|\| null/);
  assert.match(playerIdentitySource, /setState\(\{ playerIdentityPromise: syncPromise \}\)/);
  assert.match(playerIdentitySource, /currentSession\?\.user\?\.id === session\.user\.id/);
});

test('main menu gently invites named players to add a public display name', () => {
  assert.match(html, /id="player-add-name-badge"[^>]*hidden[^>]*>ADD NAME</i);
  assert.match(html, /id="display-name-invite"[^>]*hidden/i);
  assert.match(html, /Give <span id="display-name-invite-id"><\/span> a public name\?/i);
  assert.match(html, /const DISPLAY_NAME_INVITE_SNOOZE_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(html, /const DISPLAY_NAME_INVITE_MAX_DISMISSALS = 2/);
  assert.match(html, /state\.dismissals < DISPLAY_NAME_INVITE_MAX_DISMISSALS/);
  assert.match(html, /inviteAdd\?\.addEventListener\('click', \(\) => onOpen\?\.\(\{ focusDisplayName: true \}\)\)/);
  assert.match(html, /onOpen: openPlayerPanel/);
  assert.match(html, /playerDisplayNameInput\.focus\(\{ preventScroll: true \}\)/);
});

test("display-name invitation never competes with gameplay or automatic What's New", () => {
  assert.match(html, /displayNameInviteSuppressedThisSession = FORCE_WHATS_NEW\s+\|\| !!invitedLiveVsCode\s+\|\| !whatsNewView\.hasSeenCurrentRelease\(\)/);
  assert.match(html, /open\(\{ suppressDisplayNameInvite: true \}\)/);
  assert.match(html, /&& !alive\s+&& !overlay\.classList\.contains\('hidden'\)/);
  assert.match(html, /displayNameInviteSuppressedThisSession = true;\s+displayNameInvite\.hidden = true;\s+overlay\.classList\.add\('hidden'\)/);
  assert.match(html, /if \(playerProfile\.display_name\) completeDisplayNameInvitation\(\)/);
});

test('all leaderboard identity surfaces use the public player-card interaction', () => {
  assert.match(html, /id="public-player-card-panel"/i);
  assert.match(leaderboardUiSource, /function leaderboardPlayerIdentity\(row\)/);
  assert.match(leaderboardUiSource, /class="lb-player-link"[^>]*data-player-id=/);
  assert.match(leaderboardUiSource, /leaderboardService\.fetchPublicPlayerCard\(playerId\)/);
  assert.match(leaderboardServiceSource, /rpc\('get_public_player_card'/);
  assert.match(leaderboardUiSource, /leaderboardOverlay\.addEventListener\('click'/);
  assert.match(leaderboardUiSource, /const identity = leaderboardPlayerIdentity\(row\)/);
  assert.match(leaderboardUiSource, /class="daily-legend-player">\$\{leaderboardPlayerIdentity\(row\)\}/);
  assert.match(leaderboardUiSource, /Current leader \$\{leader\}/);
  assert.match(leaderboardUiSource, /Winner \$\{winner\}/);
});

test("What's New contains player-facing news rather than build details", () => {
  const bulletin = html.match(/const WHATS_NEW_RELEASES = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1] || '';
  assert.ok(bulletin, "What's New release catalog is missing");
  assert.doesNotMatch(bulletin, /service worker|cache|deployment|backend|bug fix|build/i);
  assert.match(html, /Keep every item player-facing: new\s+\/\/ features, modes, controls, themes, options/);
});

test("What's New initially renders only the latest update with a dated archive", () => {
  assert.match(html, /const latest = releases\?\.\[0\]/);
  assert.match(html, /releases\.slice\(1\)/);
  assert.match(html, /toggle\.id = 'whats-new-older-toggle'/);
  assert.match(html, /toggle\.setAttribute\('aria-expanded', 'false'\)/);
  assert.match(html, /archive\.hidden = true/);
  assert.match(html, /document\.createElement\('details'\)/);
  assert.match(html, /document\.createElement\('time'\)/);
  assert.match(html, /date\.dateTime = release\.id\.slice\(0, 10\)/);
});

test('Daily leaderboard controller receives its Daily Run dependencies explicitly', () => {
  assert.match(leaderboardUiSource, /refreshDailyChallenge,/);
  assert.match(leaderboardUiSource, /ensureDailyChallenge,/);
  assert.match(leaderboardUiSource, /formatDailyFoodTime/);
  assert.match(html, /refreshDailyChallenge,\s+ensureDailyChallenge,\s+formatDailyFoodTime/);
});
