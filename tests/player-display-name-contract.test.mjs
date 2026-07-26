import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(testDir, '..');
const sql = readFileSync(join(rootDir, 'supabase-player-display-names.sql'), 'utf8');
const html = readFileSync(join(rootDir, 'snake-game-turn.html'), 'utf8');

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
  assert.match(html, /async function savePlayerDisplayName\(value\)/);
  assert.match(html, /sb\.rpc\('set_player_display_name'/);
  assert.match(html, /p_display_name: displayName \|\| null/);
  assert.match(html, /id: '2026-07-24-player-cards'/);
});

test('main menu gently invites named players to add a public display name', () => {
  assert.match(html, /id="player-add-name-badge"[^>]*hidden[^>]*>ADD NAME</i);
  assert.match(html, /id="display-name-invite"[^>]*hidden/i);
  assert.match(html, /Give <span id="display-name-invite-id"><\/span> a public name\?/i);
  assert.match(html, /const DISPLAY_NAME_INVITE_SNOOZE_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(html, /const DISPLAY_NAME_INVITE_MAX_DISMISSALS = 2/);
  assert.match(html, /state\.dismissals < DISPLAY_NAME_INVITE_MAX_DISMISSALS/);
  assert.match(html, /displayNameInviteAdd\.addEventListener\('click', \(\) => openPlayerPanel\(\{ focusDisplayName: true \}\)\)/);
  assert.match(html, /playerDisplayNameInput\.focus\(\{ preventScroll: true \}\)/);
});

test("display-name invitation never competes with gameplay or automatic What's New", () => {
  assert.match(html, /let displayNameInviteSuppressedThisSession = FORCE_WHATS_NEW \|\| !hasSeenCurrentRelease\(\)/);
  assert.match(html, /openWhatsNew\(\{ suppressDisplayNameInvite: true \}\)/);
  assert.match(html, /&& !alive\s+&& !overlay\.classList\.contains\('hidden'\)/);
  assert.match(html, /displayNameInviteSuppressedThisSession = true;\s+displayNameInvite\.hidden = true;\s+overlay\.classList\.add\('hidden'\)/);
  assert.match(html, /if \(playerProfile\.display_name\) completeDisplayNameInvitation\(\)/);
});

test('all leaderboard identity surfaces use the public player-card interaction', () => {
  assert.match(html, /id="public-player-card-panel"/i);
  assert.match(html, /function leaderboardPlayerIdentity\(row\)/);
  assert.match(html, /class="lb-player-link"[^>]*data-player-id=/);
  assert.match(html, /sb\.rpc\('get_public_player_card'/);
  assert.match(html, /leaderboardOverlay\.addEventListener\('click'/);
  assert.match(html, /const identity = leaderboardPlayerIdentity\(row\)/);
  assert.match(html, /class="daily-legend-player">\$\{leaderboardPlayerIdentity\(row\)\}/);
  assert.match(html, /Current leader \$\{leader\}/);
  assert.match(html, /Winner \$\{winner\}/);
});

test("What's New contains player-facing news rather than build details", () => {
  const bulletin = html.match(/const WHATS_NEW_RELEASES = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1] || '';
  assert.ok(bulletin, "What's New release catalog is missing");
  assert.doesNotMatch(bulletin, /service worker|cache|deployment|backend|bug fix|build/i);
  assert.match(html, /Keep every item player-facing: new\s+\/\/ features, modes, controls, themes, options/);
});

test("What's New initially renders only the latest update with a dated archive", () => {
  assert.match(html, /const latestRelease = WHATS_NEW_RELEASES\[0\]/);
  assert.match(html, /WHATS_NEW_RELEASES\.slice\(1\)/);
  assert.match(html, /toggle\.id = 'whats-new-older-toggle'/);
  assert.match(html, /archive\.hidden = true/);
  assert.match(html, /document\.createElement\('details'\)/);
  assert.match(html, /document\.createElement\('time'\)/);
  assert.match(html, /date\.dateTime = release\.id\.slice\(0, 10\)/);
});
