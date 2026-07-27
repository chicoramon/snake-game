import { createAudioEngine } from './audio/audio-engine.js';
import { THEMES, FOOD_SPRITES, THEME_ICON_URLS, buildMusicArc } from './themes/catalog.js';
import { validateThemeCatalog } from './themes/validate-theme.js';

validateThemeCatalog(THEMES, FOOD_SPRITES);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (new URLSearchParams(location.search).has('debug')) document.body.classList.add('debug');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const shareBtn = document.getElementById('shareBtn');
const lbBtn = document.getElementById('lbBtn');
const namePrompt = document.getElementById('namePrompt');
const nameInput = document.getElementById('nameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const scoreMethodLabel = document.getElementById('scoreMethodLabel');
const dailyChallengeInfo = document.getElementById('dailyChallengeInfo');
const dailyRulesDialog = document.getElementById('dailyRulesDialog');
const dailyRulesBegin = document.getElementById('dailyRulesBegin');
const dailyRulesLater = document.getElementById('dailyRulesLater');
const dailyRulesFootnote = document.getElementById('dailyRulesFootnote');
const leaderboardOverlay = document.getElementById('leaderboardOverlay');
const lbGameModeFilters = document.getElementById('lbGameModeFilters');
const lbControlFilters = document.getElementById('lbControlFilters');
const lbThemeFilters = document.getElementById('lbThemeFilters');
const lbBody = document.getElementById('lbBody');
const lbLoading = document.getElementById('lbLoading');
const lbEmpty = document.getElementById('lbEmpty');
const lbTable = document.getElementById('lbTable');
const lbPagination = document.getElementById('lbPagination');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
const lbPageInfo = document.getElementById('lbPageInfo');
const lbBack = document.getElementById('lbBack');
const playerBtn = document.getElementById('player-btn');
const playerMenuLabel = document.getElementById('player-menu-label');
const playerAddNameBadge = document.getElementById('player-add-name-badge');
const displayNameInvite = document.getElementById('display-name-invite');
const displayNameInviteId = document.getElementById('display-name-invite-id');
const displayNameInviteAdd = document.getElementById('display-name-invite-add');
const displayNameInviteLater = document.getElementById('display-name-invite-later');
const playerPanel = document.getElementById('player-panel');
const playerIdentityStatus = document.getElementById('player-identity-status');
const playerProfileSetup = document.getElementById('player-profile-setup');
const playerInitialsInput = document.getElementById('player-initials-input');
const playerInitialsSave = document.getElementById('player-initials-save');
const playerDisplaySetup = document.getElementById('player-display-setup');
const playerDisplayNameInput = document.getElementById('player-display-name-input');
const playerDisplayNameSave = document.getElementById('player-display-name-save');
const autoSubmitToggle = document.getElementById('auto-submit-toggle');
const playerAccountSetup = document.getElementById('player-account-setup');
const playerEmailInput = document.getElementById('player-email-input');
const playerSaveEmail = document.getElementById('player-save-email');
const playerRestoreEmail = document.getElementById('player-restore-email');
const playerOtpGroup = document.getElementById('player-otp-group');
const playerOtpInput = document.getElementById('player-otp-input');
const playerVerifyOtp = document.getElementById('player-verify-otp');
const playerMessage = document.getElementById('player-message');
const playerBack = document.getElementById('player-back');
const publicPlayerCardPanel = document.getElementById('public-player-card-panel');
const publicPlayerCardName = document.getElementById('public-player-card-name');
const publicPlayerArcadeId = document.getElementById('public-player-arcade-id');
const publicPlayerCardMessage = document.getElementById('public-player-card-message');
const publicPlayerCardClose = document.getElementById('public-player-card-close');
const whatsNewBtn = document.getElementById('whats-new-btn');
const whatsNewBadge = document.getElementById('whats-new-badge');
const whatsNewPanel = document.getElementById('whats-new-panel');
const whatsNewCurrent = document.getElementById('whats-new-current');
const whatsNewReleases = document.getElementById('whats-new-releases');
const whatsNewClose = document.getElementById('whats-new-close');
const overlayTitle = document.getElementById('overlayTitle');
const themeLabel = document.getElementById('themeLabel');
const overlayMsg = document.getElementById('overlayMsg');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hudMode = document.getElementById('hud-mode');
const timerBlock = document.getElementById('timer-block');
const timerEl = document.getElementById('timer');
const countdownDisplay = document.getElementById('countdownDisplay');
const recordChaseEl = document.getElementById('record-chase');
const recordCelebrationEl = document.getElementById('record-celebration');
const recordFireworksCanvas = document.getElementById('record-fireworks');
const recordBannerCopy = document.getElementById('record-banner-copy');

// Add the newest release first and change its id whenever a release should
// trigger the one-time update bulletin. Keep every item player-facing: new
// features, modes, controls, themes, options, and competitive experiences only.
// Do not include bugs, fixes, caching, builds, deployments, or backend details.
const WHATS_NEW_RELEASES = Object.freeze([
  {
    id: '2026-07-24-player-cards',
    version: 'Update 2026.07.24',
    title: 'Player Cards & Fairer Rankings',
    items: [
      'Add an optional public display name from the Player menu.',
      'Tap a player’s initials in any leaderboard to see their public player card.',
      'The ALL leaderboard now shows every player once, using their strongest score across control methods.',
      'Daily Run now offers unlimited ranked runs until the UTC day ends.'
    ]
  },
  {
    id: '2026-07-23-tap-turn',
    version: 'Update 2026.07.23',
    title: 'Tap Turn & Daily Challenges',
    items: [
      'New TAP controls: tap the left or right half of the board to turn with no buttons covering the action.',
      'Daily Run now shows the time remaining in today’s worldwide challenge.',
      'The record chase warns when the undisputed top score is within reach and celebrates a new number one at game over.'
    ]
  },
  {
    id: '2026-07-21-random-pwa',
    version: 'Update 2026.07.21',
    title: 'Random Mode & New Worlds',
    items: [
      'RANDOM theme mode rolls a different complete theme whenever you press Play.',
      'New Simpsons, LEGO, and Game of Thrones themes bring distinct characters, food, visuals, and evolving 8-bit music.',
      'The Game of Thrones theme transforms the snake into a fire-breathing dragon.'
    ]
  }
]);
const CURRENT_RELEASE_ID = WHATS_NEW_RELEASES[0].id;
const WHATS_NEW_SEEN_KEY = 'snake_whats_new_seen';
const FORCE_WHATS_NEW = new URLSearchParams(location.search).has('whatsnew');
const DISPLAY_NAME_INVITE_KEY = 'snake_display_name_invite_v1';
const DISPLAY_NAME_INVITE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const DISPLAY_NAME_INVITE_MAX_DISMISSALS = 2;
let displayNameInviteSuppressedThisSession = FORCE_WHATS_NEW || !hasSeenCurrentRelease();

function hasSeenCurrentRelease() {
  try { return localStorage.getItem(WHATS_NEW_SEEN_KEY) === CURRENT_RELEASE_ID; }
  catch { return false; }
}

function markCurrentReleaseSeen() {
  try { localStorage.setItem(WHATS_NEW_SEEN_KEY, CURRENT_RELEASE_ID); } catch {}
  whatsNewBadge.hidden = true;
}

function renderWhatsNew() {
  const latestRelease = WHATS_NEW_RELEASES[0];
  whatsNewCurrent.textContent = `Latest release • ${latestRelease.version}`;
  whatsNewReleases.replaceChildren();

  const createReleaseSection = release => {
    const section = document.createElement('section');
    section.className = 'whats-new-release';
    const heading = document.createElement('h3');
    heading.textContent = release.title;
    const meta = document.createElement('div');
    meta.className = 'whats-new-release-meta';
    meta.textContent = release.version;
    const list = document.createElement('ul');
    release.items.forEach(item => {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.appendChild(entry);
    });
    section.append(heading, meta, list);
    return section;
  };

  whatsNewReleases.appendChild(createReleaseSection(latestRelease));

  const olderReleases = WHATS_NEW_RELEASES.slice(1);
  if (!olderReleases.length) return;

  const toggle = document.createElement('button');
  toggle.id = 'whats-new-older-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = `View Older Updates (${olderReleases.length})`;

  const archive = document.createElement('div');
  archive.className = 'whats-new-archive';
  archive.hidden = true;

  olderReleases.forEach(release => {
    const entry = document.createElement('details');
    const summary = document.createElement('summary');
    const date = document.createElement('time');
    date.dateTime = release.id.slice(0, 10);
    date.textContent = release.version.replace(/^Update\s+/i, '');
    const title = document.createElement('span');
    title.textContent = release.title;
    summary.append(date, title);
    entry.append(summary, createReleaseSection(release));
    archive.appendChild(entry);
  });

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded
      ? `View Older Updates (${olderReleases.length})`
      : 'Hide Older Updates';
    archive.hidden = expanded;
  });

  whatsNewReleases.append(toggle, archive);
}

function readDisplayNameInviteState() {
  try {
    const key = `${DISPLAY_NAME_INVITE_KEY}:${currentUser?.id || 'device'}`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      dismissals: Math.max(0, Number(saved.dismissals) || 0),
      snoozedUntil: Math.max(0, Number(saved.snoozedUntil) || 0),
      completed: saved.completed === true
    };
  } catch {
    return { dismissals: 0, snoozedUntil: 0, completed: false };
  }
}

function writeDisplayNameInviteState(state) {
  try {
    const key = `${DISPLAY_NAME_INVITE_KEY}:${currentUser?.id || 'device'}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}
}

function isDisplayNameMissing() {
  return !!playerProfile && !(playerProfile.display_name || '').trim();
}

function renderDisplayNameInvitation() {
  const missingName = isDisplayNameMissing();
  playerAddNameBadge.hidden = !missingName;
  if (missingName) displayNameInviteId.textContent = playerDisplayName();

  const state = readDisplayNameInviteState();
  const canInvite = missingName
    && !state.completed
    && state.dismissals < DISPLAY_NAME_INVITE_MAX_DISMISSALS
    && state.snoozedUntil <= Date.now()
    && !displayNameInviteSuppressedThisSession
    && !alive
    && !overlay.classList.contains('hidden')
    && !whatsNewPanel.classList.contains('visible')
    && !playerPanel.classList.contains('visible');
  displayNameInvite.hidden = !canInvite;
}

function snoozeDisplayNameInvitation() {
  const state = readDisplayNameInviteState();
  state.dismissals = Math.min(DISPLAY_NAME_INVITE_MAX_DISMISSALS, state.dismissals + 1);
  state.snoozedUntil = Date.now() + DISPLAY_NAME_INVITE_SNOOZE_MS;
  writeDisplayNameInviteState(state);
  displayNameInvite.hidden = true;
}

function completeDisplayNameInvitation() {
  const state = readDisplayNameInviteState();
  state.completed = true;
  state.snoozedUntil = 0;
  writeDisplayNameInviteState(state);
  displayNameInvite.hidden = true;
}

function openWhatsNew({ suppressDisplayNameInvite = false } = {}) {
  if (alive || overlay.classList.contains('hidden')) return;
  if (suppressDisplayNameInvite) displayNameInviteSuppressedThisSession = true;
  displayNameInvite.hidden = true;
  renderWhatsNew();
  whatsNewPanel.classList.add('visible');
  whatsNewPanel.setAttribute('aria-hidden', 'false');
  whatsNewClose.focus();
}

function closeWhatsNew({ restoreFocus = true } = {}) {
  markCurrentReleaseSeen();
  whatsNewPanel.classList.remove('visible');
  whatsNewPanel.setAttribute('aria-hidden', 'true');
  renderDisplayNameInvitation();
  if (restoreFocus) whatsNewBtn.focus();
}

whatsNewBadge.hidden = !FORCE_WHATS_NEW && hasSeenCurrentRelease();
whatsNewBtn.addEventListener('click', () => openWhatsNew());
whatsNewClose.addEventListener('click', () => closeWhatsNew());
whatsNewPanel.addEventListener('click', event => {
  if (event.target === whatsNewPanel) closeWhatsNew();
});
whatsNewPanel.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeWhatsNew();
});
setTimeout(() => {
  if (FORCE_WHATS_NEW || !hasSeenCurrentRelease()) {
    openWhatsNew({ suppressDisplayNameInvite: true });
  } else {
    renderDisplayNameInvitation();
  }
}, 350);

// --- Responsive canvas ---
const CELL = 20;
const BOARD_COLS = 20;
const BOARD_ROWS = 32;
const COLS = BOARD_COLS;
const ROWS = BOARD_ROWS;
const canvasW = COLS * CELL;
const canvasH = ROWS * CELL;
let scale = 1;

function getViewportHeight() {
  const vp = window.visualViewport;
  return vp ? vp.height : window.innerHeight;
}

function getViewportWidth() {
  const vp = window.visualViewport;
  return vp ? vp.width : window.innerWidth;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const barH = document.getElementById('score-bar').offsetHeight;
  const vpHeight = getViewportHeight();
  const vpWidth = getViewportWidth();
  // Account for body safe-area padding (side padding for landscape notches)
  const cs = getComputedStyle(document.body);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBot = parseFloat(cs.paddingBottom) || 0;
  const padLeft = parseFloat(cs.paddingLeft) || 0;
  const padRight = parseFloat(cs.paddingRight) || 0;
  const maxW = Math.max(CELL, vpWidth - padLeft - padRight - 10);
  const maxH = Math.max(CELL, vpHeight - barH - padTop - padBot - 6);

  // Keep one logical board on every device so runs and scores are comparable.
  scale = Math.min(maxW / canvasW, maxH / canvasH);
  canvas.style.width = (canvasW * scale) + 'px';
  canvas.style.height = (canvasH * scale) + 'px';
  canvas.style.marginTop = barH + 'px';
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', () => { resize(); if (alive) draw(); });
// Also handle mobile URL bar show/hide (visualViewport)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => { resize(); if (alive) draw(); });
}

// --- State ---
let snake, dir, nextDir, food, score, best, speed, alive, paused;
let runControlMethod = null;
let runUsesMixedControls = false;
let currentRunId = null;
const GAME_RULESET_VERSION = SnakeCore.RULESET_VERSION;
let gameplayRandom = SnakeCore.createNativeRandom();
let runSeed = null;
let runTick = 0;
let runReplay = null;
let recordTargets = Object.create(null);
let recordTargetScore = null;
let recordTargetMethod = null;
let recordTargetRequest = 0;
let recordTargetPromise = Promise.resolve();
let recordBrokenThisRun = false;
let recordResultVisible = false;
let recordCelebrationShown = false;
let lastTick = 0, tickAccum = 0;
let animationFrameId = null;
let gameMode = localStorage.getItem('snake_game_mode') || 'classic';
if (!['classic', 'sprint', 'daily'].includes(gameMode)) gameMode = 'classic';
let runGameMode = gameMode;
let countdownActive = false;
let countdownRemainingMs = 0;
let sprintRemainingMs = 60000;
let lastTimerSecond = 60;
let dailyChallenge = null;
let dailyTickElapsedMs = 0;
let dailyLastFoodElapsedMs = null;
let dailyAttempt = null;
let dailyStartPending = false;
let dailyChallengeRequest = 0;
let dailyChallengeLoading = false;
let dailyReservationRequestId = null;
const DAILY_RULES_SEEN_KEY = 'snake_daily_rules_seen_v2';

const BEST_KEYS = { classic: 'snakeBest120', sprint: 'snakeBest120_sprint' };
const bestScores = {
  classic: parseInt(localStorage.getItem(BEST_KEYS.classic)) || 0,
  sprint: parseInt(localStorage.getItem(BEST_KEYS.sprint)) || 0,
  daily: 0
};
best = bestScores[gameMode];
bestEl.textContent = best;

const BASE_INTERVAL = 110;  // ms per game step
const MIN_INTERVAL = 55;
const SPRINT_DURATION_MS = 60000;
const SPRINT_COUNTDOWN_MS = 3000;

// ============================================================
// THEME SYSTEM
// ============================================================

// 8-bit dark-fantasy arrangement for the marquee dragon theme. The score
// stays original while leaning into a low C-minor fifth ostinato, grouped
// 3+3+2 motion, climbing modal sequences, and a long resolving cadence.
Object.assign(THEMES.got.music, {
  bass: [
    buildMusicArc(
      [65.41,0,0,98,0,0,130.81,0,65.41,0,0,98,0,0,155.56,0],
      [65.41,0,0,98,0,0,130.81,0,103.83,0,0,155.56,0,0,207.65,0],
      [116.54,0,0,174.61,0,0,233.08,0,98,0,0,146.83,0,0,196,0],
      [65.41,0,0,98,0,0,130.81,0,65.41,0,0,98,0,0,0,0]
    ),
    buildMusicArc(
      [65.41,0,98,130.81,0,98,155.56,0,65.41,0,98,130.81,0,116.54,98,0],
      [103.83,0,155.56,207.65,0,155.56,233.08,0,103.83,0,155.56,207.65,0,196,155.56,0],
      [116.54,0,174.61,233.08,0,174.61,261.63,0,98,0,146.83,196,0,174.61,146.83,0],
      [65.41,0,98,130.81,0,155.56,130.81,0,103.83,0,98,0,65.41,0,0,0]
    ),
    buildMusicArc(
      [65.41,98,130.81,98,155.56,130.81,98,0,65.41,98,130.81,155.56,174.61,155.56,130.81,98],
      [103.83,155.56,207.65,155.56,233.08,207.65,155.56,0,116.54,174.61,233.08,261.63,233.08,196,174.61,0],
      [98,146.83,196,146.83,233.08,196,174.61,0,103.83,155.56,207.65,233.08,261.63,233.08,207.65,155.56],
      [65.41,98,130.81,155.56,196,174.61,155.56,130.81,103.83,98,87.31,73.42,65.41,0,0,0]
    ),
    buildMusicArc(
      [65.41,98,130.81,155.56,196,155.56,130.81,98,65.41,130.81,155.56,196,233.08,196,155.56,130.81],
      [103.83,155.56,207.65,233.08,311.13,233.08,207.65,155.56,116.54,174.61,233.08,261.63,349.23,261.63,233.08,174.61],
      [98,146.83,196,233.08,293.66,261.63,233.08,196,103.83,155.56,207.65,261.63,311.13,261.63,207.65,155.56],
      [65.41,130.81,155.56,196,155.56,130.81,98,0,103.83,98,87.31,73.42,65.41,0,0,0]
    ),
  ],
  melody: [
    buildMusicArc(
      [0,0,0,392,0,0,311.13,0,0,261.63,0,0,311.13,0,0,0],
      [0,0,392,0,0,466.16,0,0,415.3,0,0,311.13,0,0,392,0],
      [0,0,466.16,0,0,523.25,0,0,622.25,0,0,523.25,0,0,466.16,0],
      [392,0,311.13,0,261.63,0,311.13,0,392,0,261.63,0,0,0,0,0]
    ),
    buildMusicArc(
      [392,0,311.13,392,0,466.16,415.3,0,392,0,311.13,261.63,0,311.13,392,0],
      [415.3,0,311.13,415.3,0,523.25,466.16,0,415.3,0,349.23,311.13,0,392,415.3,0],
      [466.16,0,392,466.16,0,622.25,523.25,0,466.16,523.25,622.25,698.46,0,622.25,523.25,0],
      [392,466.16,523.25,466.16,415.3,392,311.13,0,261.63,311.13,392,311.13,261.63,0,0,0]
    ),
    buildMusicArc(
      [392,466.16,523.25,622.25,523.25,466.16,415.3,392,311.13,392,466.16,523.25,622.25,523.25,466.16,0],
      [415.3,523.25,622.25,698.46,622.25,523.25,466.16,415.3,349.23,415.3,523.25,622.25,698.46,622.25,523.25,0],
      [466.16,523.25,622.25,698.46,783.99,698.46,622.25,523.25,466.16,622.25,698.46,783.99,932.33,783.99,698.46,0],
      [622.25,523.25,466.16,415.3,392,349.23,311.13,261.63,311.13,392,466.16,392,311.13,261.63,0,0]
    ),
    buildMusicArc(
      [523.25,622.25,783.99,932.33,783.99,698.46,622.25,523.25,466.16,622.25,783.99,932.33,1046.5,932.33,783.99,0],
      [622.25,783.99,932.33,1046.5,1244.51,1046.5,932.33,783.99,698.46,830.61,932.33,1046.5,1244.51,1046.5,932.33,0],
      [783.99,932.33,1046.5,1244.51,1567.98,1244.51,1046.5,932.33,830.61,932.33,1046.5,1244.51,1396.91,1244.51,1046.5,0],
      [1046.5,932.33,783.99,698.46,622.25,523.25,466.16,392,311.13,392,466.16,392,311.13,261.63,0,0]
    ),
  ],
  arpeggio: [
    buildMusicArc(
      [130.81,0,0,196,0,0,311.13,0,130.81,0,0,196,0,0,311.13,0],
      [207.65,0,0,311.13,0,0,415.3,0,207.65,0,0,311.13,0,0,415.3,0],
      [233.08,0,0,349.23,0,0,466.16,0,196,0,0,293.66,0,0,392,0],
      [130.81,0,0,196,0,0,311.13,0,130.81,0,0,196,0,0,0,0]
    ),
    buildMusicArc(
      [130.81,0,196,0,311.13,0,196,0,130.81,0,196,0,311.13,0,392,0],
      [207.65,0,311.13,0,415.3,0,311.13,0,207.65,0,311.13,0,415.3,0,466.16,0],
      [233.08,0,349.23,0,466.16,0,349.23,0,196,0,293.66,0,392,0,466.16,0],
      [130.81,0,196,0,311.13,0,392,0,311.13,0,196,0,130.81,0,0,0]
    ),
    buildMusicArc(
      [261.63,311.13,392,311.13,523.25,392,311.13,0,261.63,311.13,392,466.16,523.25,466.16,392,0],
      [207.65,311.13,415.3,311.13,622.25,415.3,311.13,0,233.08,349.23,466.16,523.25,698.46,523.25,466.16,0],
      [196,293.66,392,466.16,587.33,466.16,392,0,207.65,311.13,415.3,523.25,622.25,523.25,415.3,0],
      [261.63,311.13,392,466.16,392,311.13,261.63,0,207.65,196,174.61,146.83,130.81,0,0,0]
    ),
    buildMusicArc(
      [261.63,392,523.25,622.25,783.99,622.25,523.25,392,311.13,466.16,622.25,783.99,932.33,783.99,622.25,0],
      [207.65,311.13,415.3,622.25,830.61,622.25,415.3,311.13,233.08,349.23,466.16,698.46,932.33,698.46,466.16,0],
      [196,293.66,392,587.33,783.99,587.33,392,293.66,207.65,311.13,415.3,622.25,830.61,622.25,415.3,0],
      [261.63,392,523.25,392,311.13,261.63,196,0,207.65,196,174.61,146.83,130.81,0,0,0]
    ),
  ],
  drums: [
    buildMusicArc(
      [1,0,0,0,0,0,2,0,1,0,0,0,0,0,2,0],
      [1,0,0,2,0,0,2,0,1,0,0,2,0,0,2,0],
      [1,0,0,2,0,0,3,0,1,0,0,2,0,0,3,0],
      [1,0,0,0,0,0,2,0,1,0,0,0,0,0,0,0]
    ),
    buildMusicArc(
      [1,0,0,2,0,0,2,0,1,0,0,2,0,0,2,0],
      [1,0,3,2,0,0,2,0,1,0,3,2,0,0,2,0],
      [1,0,3,2,0,2,3,0,1,0,3,2,0,2,3,0],
      [1,0,0,2,0,0,2,0,1,0,0,0,0,0,0,0]
    ),
    buildMusicArc(
      [1,0,3,2,0,2,3,0,1,0,3,2,0,2,3,0],
      [1,2,3,2,0,2,3,0,1,2,3,2,0,2,3,0],
      [1,2,3,2,1,2,3,0,1,2,3,2,1,2,3,0],
      [1,0,3,2,0,2,3,0,1,0,0,2,0,0,0,0]
    ),
    buildMusicArc(
      [1,2,3,2,1,2,3,0,1,2,3,2,1,2,3,0],
      [1,2,3,2,1,2,3,2,1,2,3,2,1,2,3,2],
      [3,2,3,2,1,2,3,2,3,2,3,2,1,2,3,2],
      [1,0,3,2,0,2,3,0,1,0,0,0,0,0,0,0]
    ),
  ],
  bassType: 'triangle',
  melodyType: 'square',
  arpType: 'square',
  bassVol: 0.3,
  melodyVol: 0.1,
  arpVol: 0.045,
  baseBPM: 78,
  maxBPM: 152,
  tempoGrowth: 36,
  intensityThresholds: [9, 18, 30],
  minStepsPerIntensity: 64,
  percussion: '8bit-war',
  swing: 0,
});

// Premium 8-bit arcade-rock suite for Street Fighter. Its syncopated E-minor
// lead, climbing power-chord contour, and driving bass evoke the energy of
// Ken's famous stage while using a fresh four-movement chiptune arrangement.
// Every intensity gets a full 128-step arc instead of repeating its peak loop.
Object.assign(THEMES.streetfighter.music, {
  bass: [
    buildMusicArc(
      [82.41,0,0,0,123.47,0,0,0,82.41,0,0,0,146.83,0,123.47,0],
      [82.41,0,123.47,0,82.41,0,146.83,0,98,0,146.83,0,110,0,123.47,0],
      [82.41,0,82.41,123.47,82.41,0,146.83,123.47,98,0,98,146.83,110,0,123.47,146.83],
      [82.41,0,123.47,0,146.83,0,123.47,0,98,0,110,0,82.41,0,0,0]
    ),
    buildMusicArc(
      [82.41,0,123.47,82.41,0,146.83,123.47,0,98,0,146.83,98,0,110,123.47,0],
      [82.41,82.41,123.47,0,82.41,146.83,123.47,0,98,98,146.83,0,110,123.47,146.83,0],
      [82.41,123.47,164.81,123.47,82.41,123.47,146.83,123.47,98,146.83,196,146.83,110,146.83,123.47,146.83],
      [82.41,82.41,123.47,146.83,164.81,146.83,123.47,0,98,110,123.47,110,82.41,0,0,0]
    ),
    buildMusicArc(
      [82.41,123.47,164.81,123.47,82.41,146.83,164.81,123.47,98,146.83,196,146.83,110,146.83,164.81,146.83],
      [82.41,164.81,123.47,164.81,196,164.81,146.83,123.47,98,196,146.83,196,220,196,164.81,146.83],
      [82.41,123.47,164.81,196,246.94,196,164.81,123.47,98,146.83,196,220,246.94,220,196,146.83],
      [82.41,164.81,196,164.81,146.83,123.47,110,0,98,123.47,146.83,123.47,82.41,0,0,0]
    ),
    buildMusicArc(
      [82.41,164.81,196,246.94,196,164.81,146.83,123.47,98,196,220,246.94,220,196,164.81,146.83],
      [82.41,123.47,164.81,196,246.94,196,164.81,123.47,98,146.83,196,220,261.63,220,196,146.83],
      [82.41,164.81,196,246.94,329.63,246.94,196,164.81,98,196,246.94,293.66,329.63,293.66,246.94,196],
      [82.41,164.81,196,164.81,146.83,123.47,110,0,98,123.47,146.83,123.47,82.41,0,0,0]
    ),
  ],
  melody: [
    buildMusicArc(
      [0,0,0,0,0,0,0,0,329.63,0,392,0,440,0,0,0],
      [329.63,0,392,329.63,0,293.66,0,246.94,329.63,0,440,392,329.63,0,293.66,0],
      [329.63,392,440,0,493.88,440,392,0,329.63,440,493.88,0,440,392,329.63,0],
      [329.63,0,392,329.63,293.66,0,246.94,0,329.63,0,293.66,0,246.94,0,0,0]
    ),
    buildMusicArc(
      [329.63,0,392,329.63,440,0,493.88,0,440,392,329.63,0,293.66,329.63,0,0],
      [329.63,392,440,0,493.88,440,392,329.63,440,493.88,587.33,0,493.88,440,392,0],
      [392,440,493.88,0,587.33,493.88,440,392,493.88,587.33,659.25,0,587.33,493.88,440,0],
      [329.63,392,440,493.88,440,392,329.63,0,293.66,329.63,392,329.63,246.94,0,0,0]
    ),
    buildMusicArc(
      [329.63,392,440,493.88,587.33,493.88,440,392,493.88,587.33,659.25,587.33,493.88,440,392,0],
      [392,440,493.88,587.33,659.25,587.33,493.88,440,587.33,659.25,783.99,659.25,587.33,493.88,440,0],
      [493.88,587.33,659.25,783.99,880,783.99,659.25,587.33,493.88,659.25,783.99,880,987.77,880,783.99,659.25],
      [659.25,587.33,493.88,440,392,329.63,293.66,0,329.63,392,440,392,329.63,0,0,0]
    ),
    buildMusicArc(
      [659.25,0,783.99,659.25,587.33,0,493.88,0,659.25,783.99,880,783.99,659.25,0,587.33,0],
      [659.25,783.99,880,987.77,880,783.99,659.25,587.33,783.99,880,987.77,1174.66,987.77,880,783.99,659.25],
      [783.99,880,987.77,1174.66,1318.51,1174.66,987.77,880,783.99,987.77,1174.66,1318.51,1174.66,987.77,880,783.99],
      [659.25,783.99,880,783.99,659.25,587.33,493.88,0,440,493.88,587.33,493.88,329.63,0,0,0]
    ),
  ],
  arpeggio: [
    buildMusicArc(
      [0],
      [164.81,0,196,0,246.94,0,196,0,146.83,0,196,0,220,0,196,0],
      [164.81,0,196,0,246.94,0,293.66,0,146.83,0,196,0,220,0,246.94,0],
      [164.81,0,196,0,246.94,0,196,0,146.83,0,196,0,164.81,0,0,0]
    ),
    buildMusicArc(
      [164.81,0,196,0,246.94,0,293.66,0,146.83,0,196,0,246.94,0,293.66,0],
      [164.81,196,246.94,293.66,246.94,196,164.81,196,146.83,196,246.94,293.66,246.94,196,146.83,196],
      [196,246.94,293.66,329.63,293.66,246.94,196,246.94,220,246.94,293.66,369.99,293.66,246.94,220,246.94],
      [164.81,196,246.94,293.66,246.94,196,164.81,0,146.83,196,246.94,196,164.81,0,0,0]
    ),
    buildMusicArc(
      [164.81,246.94,329.63,392,329.63,246.94,196,246.94,196,293.66,392,493.88,392,293.66,246.94,293.66],
      [196,293.66,392,493.88,587.33,493.88,392,293.66,220,329.63,440,554.37,659.25,554.37,440,329.63],
      [246.94,329.63,392,493.88,659.25,493.88,392,329.63,293.66,369.99,493.88,587.33,739.99,587.33,493.88,369.99],
      [164.81,246.94,329.63,392,329.63,246.94,196,0,146.83,196,246.94,196,164.81,0,0,0]
    ),
    buildMusicArc(
      [329.63,392,493.88,659.25,783.99,659.25,493.88,392,293.66,369.99,493.88,587.33,739.99,587.33,493.88,369.99],
      [392,493.88,659.25,783.99,987.77,783.99,659.25,493.88,440,554.37,739.99,880,1108.73,880,739.99,554.37],
      [493.88,659.25,783.99,987.77,1318.51,987.77,783.99,659.25,587.33,739.99,987.77,1174.66,1479.98,1174.66,987.77,739.99],
      [329.63,392,493.88,659.25,493.88,392,329.63,0,246.94,293.66,369.99,293.66,164.81,0,0,0]
    ),
  ],
  drums: [
    buildMusicArc(
      [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      [1,0,0,0,0,0,2,0,1,0,0,0,0,0,2,0],
      [1,0,0,0,2,0,2,0,1,0,0,0,2,0,2,0],
      [1,0,0,0,0,0,2,0,1,0,0,0,0,0,0,0]
    ),
    buildMusicArc(
      [1,0,0,0,2,0,2,0,1,0,0,0,2,0,2,0],
      [1,0,3,0,2,0,2,0,1,0,3,0,2,0,2,0],
      [1,0,3,0,2,2,2,0,1,0,3,0,2,2,2,0],
      [1,0,3,0,2,0,2,0,1,0,0,0,2,0,0,0]
    ),
    buildMusicArc(
      [1,0,3,0,2,2,2,0,1,0,3,0,2,2,2,0],
      [1,2,3,0,2,2,3,0,1,2,3,0,2,2,3,0],
      [1,2,3,2,2,2,3,0,1,2,3,2,2,2,3,0],
      [1,0,3,0,2,0,2,0,1,0,3,0,0,0,0,0]
    ),
    buildMusicArc(
      [1,2,3,0,2,2,3,0,1,2,3,0,2,2,3,0],
      [1,2,3,2,2,2,3,0,1,2,3,2,2,2,3,0],
      [1,2,3,2,1,2,3,2,1,2,3,2,1,2,3,2],
      [1,0,3,0,2,0,2,0,1,0,0,0,0,0,0,0]
    ),
  ],
  bassType: 'triangle',
  melodyType: 'square',
  arpType: 'square',
  bassVol: 0.29,
  melodyVol: 0.115,
  arpVol: 0.05,
  baseBPM: 104,
  maxBPM: 176,
  bpmPerLen: 1.75,
  tempoGrowth: 34,
  intensityThresholds: [8, 17, 29],
  minStepsPerIntensity: 64,
  percussion: 'arcade-rock',
  swing: 0,
  audioUrl: 'assets/audio/ken-stage-96.mp3',
  audioGain: 0.82,
  midiUrl: 'audio themes/street_fighter_ii_-_ken.mid',
  midiGain: 0.72,
});

const savedThemeSelection = localStorage.getItem('snakeTheme') || 'default';
let themeSelection = savedThemeSelection === 'random' || THEMES[savedThemeSelection]
  ? savedThemeSelection
  : 'default';
const savedActiveTheme = localStorage.getItem('snakeThemeActive');
let currentTheme = themeSelection === 'random'
  ? (THEMES[savedActiveTheme] ? savedActiveTheme : 'default')
  : themeSelection;
let controlMode = localStorage.getItem('snake_control_mode') || 'dpad'; // 'dpad', 'turn', or 'tap'
const TURN_ORDER = ['up','right','down','left']; // clockwise
const CONTROL_LABELS = { dpad: 'D-PAD', turn: 'TURN', tap: 'TAP', keyboard: 'KEYBOARD', mixed: 'MIXED', legacy: 'LEGACY' };

function registerControlMethod(method) {
  if (!alive || countdownActive) return;
  if (!runControlMethod) {
    runControlMethod = method;
    activateRecordTarget(method);
  }
  else if (runControlMethod !== method) {
    runUsesMixedControls = true;
    disableRecordChase();
  }
}

function getCosmeticRandomUnit() {
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] / 0x100000000;
  }

  // Keep this fallback independent from Math.random(), which places food.
  return ((Date.now() + Math.floor(performance.now() * 1000)) >>> 0) / 0x100000000;
}

function pickRandomThemeId(themeIds, activeId, randomValue = getCosmeticRandomUnit()) {
  const candidates = themeIds.length > 1
    ? themeIds.filter(id => id !== activeId)
    : themeIds.slice();

  if (!candidates.length) return null;
  const unit = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
    : 0;
  return candidates[Math.floor(unit * candidates.length)];
}

function updateThemeSelectionUI() {
  document.getElementById('random-theme-btn').classList.toggle('selected', themeSelection === 'random');
  document.querySelectorAll('.theme-btn[data-theme]').forEach(button => {
    button.classList.toggle('selected', themeSelection !== 'random' && button.dataset.theme === themeSelection);
  });
}

function selectRandomThemeMode() {
  themeSelection = 'random';
  localStorage.setItem('snakeTheme', themeSelection);
  localStorage.setItem('snakeThemeActive', currentTheme);
  updateThemeSelectionUI();
}

function applyTheme(id, { updateSelection = true } = {}) {

  if (!THEMES[id]) return;
  if (updateSelection) {
    themeSelection = id;
    localStorage.setItem('snakeTheme', themeSelection);
  }
  currentTheme = id;
  localStorage.setItem('snakeThemeActive', currentTheme);
  const t = THEMES[id];
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent);
  // Derive accent variations
  const a = t.accent;
  r.setProperty('--accent-dim', a + '99');
  r.setProperty('--accent-glow', a + '40');
  r.setProperty('--accent-glow-soft', a + '14');
  r.setProperty('--accent-glow-mid', a + '26');
  r.setProperty('--food', t.food);
  r.setProperty('--food-glow', t.foodGlow);
  r.setProperty('--food-accent', t.foodAccent);
  r.setProperty('--death', t.deathFlash + 'ff)');
  // Update theme color meta
  document.querySelector('meta[name="theme-color"]').content = t.bg;
  // Update selected state in options
  document.querySelectorAll('.theme-btn[data-theme]').forEach(b => {
    b.classList.toggle('selected', themeSelection !== 'random' && b.dataset.theme === themeSelection);
  });
  document.getElementById('random-theme-btn').classList.toggle('selected', themeSelection === 'random');
  themeLabel.textContent = t.name + ' Theme';
  overlayTitle.textContent = id === 'got' ? 'DRAGON' : 'SNAKE';
}

// Initialize theme
applyTheme(currentTheme, { updateSelection: false });

function modeHudLabel(mode) {
  if (mode === 'daily') return 'DAILY';
  return mode === 'sprint' ? 'SPRINT' : 'CLASSIC';
}

function isTimedMode(mode) {
  return mode === 'sprint' || mode === 'daily';
}

function currentUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDailyChallenge() {
  if (dailyChallenge?.authoritative) return dailyChallenge;
  const date = currentUtcDateKey();
  if (dailyChallenge?.date === date) return dailyChallenge;

  const seed = SnakeCore.normalizeSeed(`snake-daily-preview:${date}`);
  const themeIds = Object.keys(THEMES).sort();
  const theme = themeIds[seed % themeIds.length];
  const challengeEpoch = Date.UTC(2026, 0, 1);
  const challengeDate = Date.parse(`${date}T00:00:00Z`);
  const number = Math.max(1, Math.floor((challengeDate - challengeEpoch) / 86400000) + 1);
  const bestKey = `snake_daily_preview_best_${date}`;

  dailyChallenge = { date, seed, theme, number, bestKey, durationMs: SPRINT_DURATION_MS, authoritative: false, attemptsRemaining: null };
  bestScores.daily = parseInt(localStorage.getItem(bestKey), 10) || 0;
  return dailyChallenge;
}

function mapDailyChallenge(row, authoritative = true) {
  if (!row) return null;
  const date = String(row.challenge_date || row.date || currentUtcDateKey());
  const theme = THEMES[row.theme] ? row.theme : 'default';
  const bestKey = `snake_daily_best_${date}`;
  return {
    id: row.challenge_id == null ? null : Number(row.challenge_id),
    date,
    number: Number(row.challenge_number) || 1,
    seed: Number(row.seed) >>> 0,
    theme,
    durationMs: Number(row.duration_ms) || SPRINT_DURATION_MS,
    boardCols: Number(row.board_cols) || BOARD_COLS,
    boardRows: Number(row.board_rows) || BOARD_ROWS,
    rulesetVersion: row.ruleset_version || GAME_RULESET_VERSION,
    attemptsUsed: Number(row.attempts_used) || 0,
    attemptsRemaining: Number(row.attempts_remaining) < 0
      ? -1
      : Math.max(0, Number(row.attempts_remaining) || 0),
    bestKey,
    authoritative
  };
}

function hasUnlimitedDailyAttempts(challenge = dailyChallenge) {
  return challenge?.authoritative === true && challenge.attemptsRemaining < 0;
}

function dailyAttemptLabel(number) {
  return `Ranked run #${number}`;
}

function dailyAttemptsRemainingLabel(challenge = dailyChallenge) {
  return hasUnlimitedDailyAttempts(challenge)
    ? 'Unlimited ranked runs'
    : `${challenge?.attemptsRemaining ?? 0} ranked runs left`;
}

function renderDailyChallengeInfo() {
  if (gameMode !== 'daily') return;
  const challenge = dailyChallenge || ensureDailyChallenge();
  if (dailyChallengeLoading && !challenge.authoritative) {
    dailyChallengeInfo.textContent = 'Loading live Daily Run…';
    return;
  }
  const themeName = THEMES[challenge.theme]?.name || challenge.theme;
  dailyChallengeInfo.textContent = challenge.authoritative
    ? `Challenge #${challenge.number} • ${themeName} • ${dailyAttemptsRemainingLabel(challenge)}`
    : `Challenge #${challenge.number} • ${themeName} • Local preview`;
  const attemptRule = document.getElementById('daily-attempt-rule');
  if (attemptRule) {
    attemptRule.textContent = hasUnlimitedDailyAttempts(challenge)
      ? 'Every run is ranked. Play as many times as you like before the UTC day ends.'
      : `${challenge.attemptsRemaining} ranked runs remain today.`;
  }
}

async function refreshDailyChallenge({ force = false } = {}) {
  const requestId = ++dailyChallengeRequest;
  if (!force && dailyChallenge?.authoritative && dailyChallenge.date === currentUtcDateKey()) {
    dailyChallengeLoading = false;
    renderDailyChallengeInfo();
    return dailyChallenge;
  }
  dailyChallengeLoading = true;
  renderDailyChallengeInfo();
  try {
    await playerIdentityPromise;
    if (!sb || !currentUser) throw new Error('Player session unavailable');
    const { data, error } = await sb.rpc('get_daily_challenge');
    if (error) throw error;
    if (requestId !== dailyChallengeRequest) return dailyChallenge;
    const row = Array.isArray(data) ? data[0] : data;
    const challenge = mapDailyChallenge(row, true);
    if (!challenge || challenge.rulesetVersion !== GAME_RULESET_VERSION || challenge.boardCols !== BOARD_COLS || challenge.boardRows !== BOARD_ROWS) {
      throw new Error('Daily challenge uses an unsupported ruleset or board');
    }
    dailyChallenge = challenge;
    bestScores.daily = parseInt(localStorage.getItem(challenge.bestKey), 10) || 0;
    if (gameMode === 'daily') {
      best = bestScores.daily;
      bestEl.textContent = best;
      applyTheme(challenge.theme, { updateSelection: false });
      renderDailyChallengeInfo();
    }
    return challenge;
  } catch (error) {
    // An older request must never replace a newer authoritative response with
    // the local preview merely because the older request failed later.
    if (requestId !== dailyChallengeRequest) return dailyChallenge || ensureDailyChallenge();
    if (!isSchemaError(error)) console.warn('Authoritative Daily challenge unavailable; using local preview.', error);
    if (!dailyChallenge?.authoritative) dailyChallenge = null;
    const preview = ensureDailyChallenge();
    renderDailyChallengeInfo();
    return preview;
  } finally {
    if (requestId === dailyChallengeRequest) {
      dailyChallengeLoading = false;
      renderDailyChallengeInfo();
    }
  }
}

function refreshVisibleDailyMenu() {
  if (gameMode !== 'daily' || alive || dailyStartPending) return;
  refreshDailyChallenge({ force: true });
}

// Safari may restore the page from its back-forward cache, or regain network
// access after the initial live request failed. Reconcile the visible menu in
// both cases instead of leaving the local preview in place until a reload.
window.addEventListener('online', refreshVisibleDailyMenu);
window.addEventListener('pageshow', event => {
  if (event.persisted) refreshVisibleDailyMenu();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshVisibleDailyMenu();
});

function formatDailyFoodTime(ms) {
  return Number.isFinite(ms) ? `${(ms / 1000).toFixed(2)}s` : '—';
}

function shouldShowDailyRules() {
  if (new URLSearchParams(location.search).get('dailyIntro') === '1') return true;
  try {
    return localStorage.getItem(DAILY_RULES_SEEN_KEY) !== '1';
  } catch (_) {
    return true;
  }
}

function showDailyRules() {
  dailyRulesFootnote.textContent = dailyChallenge?.authoritative
    ? 'Your ranked run is reserved after you press Begin, immediately before the countdown.'
    : 'Preview results remain on this device until ranked Daily Run is available.';
  dailyRulesDialog.classList.add('visible');
  dailyRulesDialog.setAttribute('aria-hidden', 'false');
  setTimeout(() => dailyRulesBegin.focus(), 0);
}

function hideDailyRules({ restoreFocus = false } = {}) {
  dailyRulesDialog.classList.remove('visible');
  dailyRulesDialog.setAttribute('aria-hidden', 'true');
  if (restoreFocus) startBtn.focus();
}

function formatSprintTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function updateSprintTimer(force = false) {
  const second = Math.max(0, Math.ceil(sprintRemainingMs / 1000));
  if (!force && second === lastTimerSecond) return;
  lastTimerSecond = second;
  timerEl.textContent = formatSprintTime(sprintRemainingMs);
  timerEl.classList.toggle('urgent', second > 0 && second <= 10);
}

function applyGameMode(mode) {
  if (!['classic', 'sprint', 'daily'].includes(mode)) mode = 'classic';
  gameMode = mode;
  localStorage.setItem('snake_game_mode', mode);
  const challenge = mode === 'daily' ? ensureDailyChallenge() : null;
  if (challenge) applyTheme(challenge.theme, { updateSelection: false });
  else if (themeSelection !== 'random') applyTheme(themeSelection, { updateSelection: false });
  best = bestScores[mode];
  bestEl.textContent = best;
  hudMode.textContent = modeHudLabel(mode);
  dailyChallengeInfo.hidden = mode !== 'daily';
  if (challenge) renderDailyChallengeInfo();
  const randomThemeBtn = document.getElementById('random-theme-btn');
  const themesButton = document.getElementById('options-btn');
  if (randomThemeBtn) {
    const dailyThemeIsLocked = mode === 'daily';
    randomThemeBtn.hidden = dailyThemeIsLocked;
    randomThemeBtn.disabled = dailyThemeIsLocked;
  }
  if (themesButton) themesButton.hidden = mode === 'daily';
  document.querySelectorAll('.game-mode-btn').forEach(btn => {
    const selected = btn.dataset.gameMode === mode;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

document.querySelectorAll('.game-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const selectedMode = btn.dataset.gameMode;
    applyGameMode(selectedMode);
    // Daily Run starts with a deterministic offline preview. Selecting it
    // must always replace that preview with today's authoritative live state.
    if (selectedMode === 'daily') refreshDailyChallenge({ force: true });
  });
});
applyGameMode(gameMode);

function prepareGameplayRun(seed = null) {
  runSeed = seed == null ? null : SnakeCore.normalizeSeed(seed);
  gameplayRandom = runSeed == null
    ? SnakeCore.createNativeRandom()
    : SnakeCore.createSeededRandom(runSeed);
  runTick = 0;
  runReplay = SnakeCore.createReplay({
    rulesetVersion: GAME_RULESET_VERSION,
    seed: runSeed,
    mode: runGameMode,
    theme: currentTheme,
    cols: COLS,
    rows: ROWS
  });
  if (runGameMode === 'daily') setTimeout(() => refreshDailyChallenge(), 0);
}

function reset(startingRun = false) {
  snake = SnakeCore.createInitialSnake(COLS, ROWS);
  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};
  runTick = 0;
  score = 0;
  speed = BASE_INTERVAL;
  alive = startingRun;
  paused = false;
  tickAccum = 0;
  sprintRemainingMs = runGameMode === 'daily'
    ? (dailyChallenge?.durationMs || SPRINT_DURATION_MS)
    : SPRINT_DURATION_MS;
  lastTimerSecond = 60;
  dailyTickElapsedMs = 0;
  dailyLastFoodElapsedMs = null;
  countdownActive = startingRun && isTimedMode(runGameMode);
  countdownRemainingMs = countdownActive ? SPRINT_COUNTDOWN_MS : 0;
  countdownDisplay.textContent = countdownActive ? '3' : '';
  countdownDisplay.classList.toggle('visible', countdownActive);
  timerBlock.classList.toggle('visible', startingRun && isTimedMode(runGameMode));
  updateSprintTimer(true);
  scoreEl.textContent = 0;
  // Clear effects
  particles.length = 0;
  deathSegments.length = 0;
  trailPoints.length = 0;
  screenShake = 0; shakeX = 0; shakeY = 0;
  deathFlash = 0;
  foodScale = 1; foodScaleTarget = 1;
  dragonFireBurst = 0;
  fighterImpactBurst = 0;
  // Reset pause button
  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="2" y="1" width="2" height="8"/><rect x="6" y="1" width="2" height="8"/></svg>';
  pauseBtn.classList.remove('paused');
  pauseBtn.setAttribute('aria-label', 'Pause game');
  pauseBtn.title = 'Pause (P)';
  // Keep the game identity primary; the selected theme has its own label.
  overlayTitle.textContent = currentTheme === 'got' ? 'DRAGON' : 'SNAKE';
  themeLabel.textContent = THEMES[currentTheme].name + ' Theme';
  overlayMsg.textContent = 'Ready to play?';
  placeFood();
}

function placeFood() {
  const placement = runGameMode === 'daily'
    ? SnakeCore.placeFoodFromFreeCells
    : SnakeCore.placeFood;
  food = placement({
    cols: COLS,
    rows: ROWS,
    snake,
    random: gameplayRandom
  });
}

// --- Haptics ---
function haptic(style) {
  if (navigator.vibrate) {
    if (style === 'eat') navigator.vibrate(10);
    else if (style === 'die') navigator.vibrate([30, 30, 30]);
  }
}

// --- Rendering (runs at native refresh — 120fps on ProMotion) ---
let prevSnake = null;
let prevFood = null;
let foodPulse = 0;
let deathFlash = 0;
let fpsFrames = 0, fpsLast = performance.now(), fpsDisplay = 0;
let foodScale = 1, foodScaleTarget = 1;
let dragonFireBurst = 0;
let fighterImpactBurst = 0;
let screenShake = 0, shakeX = 0, shakeY = 0;

// --- Particle System (from game-engine: object pooling for perf) ---
const particles = [];
const MAX_PARTICLES = 200;

function spawnParticles(x, y, count, color, speedMul, lifeMul) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) {
      // Reuse oldest dead particle
      const dead = particles.findIndex(p => p.life <= 0);
      if (dead === -1) break;
      particles.splice(dead, 1);
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = (1 + Math.random() * 3) * speedMul;
    const life = (0.3 + Math.random() * 0.5) * lifeMul;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, maxLife: life,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96; // drag
    p.vy *= 0.96;
    p.life -= dt / 1000;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Death explosion: scatter snake segments ---
let deathSegments = [];

function spawnDeathExplosion() {
  const T = THEMES[currentTheme];
  const tail = T.snakeTail;
  deathSegments = [];
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const ratio = i / Math.max(snake.length, 1);
    const r = Math.round(tail[0] + (tail[0] * 0.4) * (1 - ratio));
    const g = Math.round(tail[1] - tail[1] * 0.3 * ratio);
    const b = Math.round(tail[2] - tail[2] * 0.25 * ratio);
    deathSegments.push({
      x: seg.x * CELL + CELL / 2,
      y: seg.y * CELL + CELL / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: i === 0 ? CELL * 0.8 : CELL * 0.6,
      color: `rgb(${r},${g},${b})`,
      life: 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3
    });
  }
  // Also spawn particles from each segment
  for (const seg of snake) {
    spawnParticles(
      seg.x * CELL + CELL / 2,
      seg.y * CELL + CELL / 2,
      3, T.deathParticle, 1.5, 0.8
    );
  }
}

function updateDeathSegments(dt) {
  for (let i = deathSegments.length - 1; i >= 0; i--) {
    const s = deathSegments[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.95;
    s.vy *= 0.95;
    s.rotation += s.rotSpeed;
    s.life -= dt / 1000;
    if (s.life <= 0) deathSegments.splice(i, 1);
  }
}

function drawDeathSegments() {
  for (const s of deathSegments) {
    const alpha = Math.max(0, s.life);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// --- Snake trail (fading afterimage) ---
let trailPoints = [];
const MAX_TRAIL = 12;

function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================================
// FOOD PIXEL SPRITES
// ============================================================
// 16×16 pixel art sprites with per-sprite color palettes
// grid: 0=transparent, 1-5=palette indices
function drawFoodSprite(ctx, cx, cy, cellSize, theme, scale, themeName) {
  const data = FOOD_SPRITES[themeName] || FOOD_SPRITES.default;
  const sprite = data.grid, palette = data.palette;
  const rows = sprite.length, cols = sprite[0].length;
  const pxSize = (cellSize * scale * 0.9) / rows;
  const totalW = cols * pxSize, totalH = rows * pxSize;
  const ox = cx - totalW / 2, oy = cy - totalH / 2;
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const v = sprite[row][col];
      if (v === 0) continue;
      ctx.fillStyle = palette[v];
      ctx.fillRect(Math.round(ox + col * pxSize), Math.round(oy + row * pxSize),
                   Math.ceil(pxSize), Math.ceil(pxSize));
    }
  }
}

function drawDragonHeadAndFire(hx, hy, T) {
  const cx = hx + CELL / 2;
  const cy = hy + CELL / 2;
  const angle = Math.atan2(dir.y, dir.x);
  const idleBreath = alive && !paused
    ? Math.max(0, (Math.sin(foodPulse * 0.34) - 0.78) / 0.22) * 0.55
    : 0;
  const fireStrength = Math.max(dragonFireBurst, idleBreath);
  dragonFireBurst = Math.max(0, dragonFireBurst - 0.022);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // The breath is canvas-only: it never changes collision, food, or scoring.
  if (fireStrength > 0.02) {
    const reach = 16 + fireStrength * 19;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.34 + fireStrength * 0.34;
    ctx.fillStyle = T.fireOuter;
    ctx.beginPath();
    ctx.moveTo(7, -5); ctx.quadraticCurveTo(reach * 0.55, -10, reach, 0);
    ctx.quadraticCurveTo(reach * 0.55, 10, 7, 5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.62 + fireStrength * 0.26;
    ctx.fillStyle = T.fireMid;
    ctx.beginPath();
    ctx.moveTo(9, -3); ctx.quadraticCurveTo(reach * 0.58, -6, reach * 0.82, 0);
    ctx.quadraticCurveTo(reach * 0.58, 6, 9, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = T.fireCore;
    ctx.beginPath();
    ctx.moveTo(10, -1.5); ctx.lineTo(reach * 0.58, 0); ctx.lineTo(10, 1.5);
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Long snout, crown horns, and directional ember eyes.
  ctx.fillStyle = T.dragonScale;
  ctx.strokeStyle = '#11141a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-7, -7); ctx.lineTo(5, -8); ctx.lineTo(10, -4);
  ctx.lineTo(11, 4); ctx.lineTo(5, 8); ctx.lineTo(-7, 7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = T.dragonScaleLight;
  ctx.fillRect(1, -5, 7, 2);
  ctx.fillStyle = T.dragonHorn;
  ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-10, -12); ctx.lineTo(0, -8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-10, 12); ctx.lineTo(0, 8); ctx.fill();
  ctx.fillStyle = T.dragonEye;
  ctx.shadowColor = T.dragonEye; ctx.shadowBlur = 6;
  ctx.fillRect(2, -5, 2.5, 2.5);
  ctx.fillRect(2, 2.5, 2.5, 2.5);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function draw(interp) {
  const T = THEMES[currentTheme];
  // Background
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Grid
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvasH); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvasW, y * CELL); ctx.stroke();
  }

  // Optional theme surface treatment: a field of raised toy-brick studs.
  if (T.boardPattern === 'studs') {
    ctx.fillStyle = T.studColor || T.accent;
    ctx.globalAlpha = 0.18;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (T.boardPattern === 'springfield') {
    // A quiet cel-painted Springfield backdrop: clouds, distant rooftops, and the family home.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#FFFFFF';
    for (const cloud of [[55,55,44],[250,105,54],[330,38,34]]) {
      ctx.beginPath();
      ctx.arc(cloud[0], cloud[1], cloud[2] * 0.28, 0, Math.PI * 2);
      ctx.arc(cloud[0] + cloud[2] * 0.3, cloud[1] - 5, cloud[2] * 0.36, 0, Math.PI * 2);
      ctx.arc(cloud[0] + cloud[2] * 0.65, cloud[1], cloud[2] * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#F14E28';
    ctx.fillRect(0, canvasH - 92, canvasW, 92);
    ctx.fillStyle = '#FFD90F';
    ctx.beginPath();
    ctx.moveTo(35, canvasH - 92); ctx.lineTo(105, canvasH - 148); ctx.lineTo(175, canvasH - 92);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(52, canvasH - 92, 108, 66);
    ctx.fillStyle = '#70D1FE';
    ctx.fillRect(72, canvasH - 76, 25, 24);
    ctx.fillRect(116, canvasH - 76, 25, 24);
    ctx.fillStyle = '#94C11F';
    ctx.fillRect(0, canvasH - 28, canvasW, 28);
    ctx.restore();
  } else if (T.boardPattern === 'winterfell') {
    // Subtle icy masonry and distant battlements keep the board readable.
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let y = 0; y < canvasH; y += 30) {
      const offset = (Math.floor(y / 30) % 2) * 22;
      for (let x = -offset; x < canvasW; x += 44) {
        ctx.strokeStyle = '#7f8c99';
        ctx.strokeRect(x, y, 42, 28);
      }
    }
    const horizon = canvasH - 74;
    ctx.fillStyle = '#171c24';
    ctx.fillRect(0, horizon, canvasW, 74);
    for (let x = 0; x < canvasW; x += 52) {
      ctx.fillRect(x, horizon - 20, 34, 20);
      ctx.fillRect(x, horizon - 30, 9, 10);
      ctx.fillRect(x + 25, horizon - 30, 9, 10);
    }
    ctx.fillStyle = '#dce8f2';
    for (let i = 0; i < 24; i++) {
      const sx = (i * 83 + 19) % canvasW;
      const sy = (i * 137 + 31) % canvasH;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
    ctx.restore();
  } else if (T.boardPattern === 'kenstage') {
    // Moonlit harbor, yacht silhouette, and red dock railings nod to Ken's
    // classic arena while remaining subtle enough for competitive play.
    ctx.save();
    ctx.globalAlpha = 0.18;
    const horizon = canvasH - 116;

    ctx.fillStyle = '#183650';
    ctx.fillRect(0, horizon, canvasW, 116);
    ctx.fillStyle = '#3d81a5';
    for (let y = horizon + 10; y < canvasH - 38; y += 13) {
      const offset = ((y - horizon) / 13) % 2 ? 16 : 0;
      for (let x = -offset; x < canvasW; x += 38) ctx.fillRect(x, y, 23, 2);
    }

    // Distant city lights and a simplified yacht.
    ctx.fillStyle = '#ffd666';
    for (let x = 14; x < canvasW; x += 47) ctx.fillRect(x, horizon - 16 - (x % 3) * 4, 3, 3);
    ctx.fillStyle = '#c9d9e6';
    ctx.beginPath();
    ctx.moveTo(66, horizon + 20);
    ctx.lineTo(248, horizon + 20);
    ctx.lineTo(218, horizon + 45);
    ctx.lineTo(92, horizon + 45);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(124, horizon - 9, 72, 31);
    ctx.fillStyle = '#10253a';
    ctx.fillRect(136, horizon - 2, 18, 12);
    ctx.fillRect(162, horizon - 2, 20, 12);

    // Dock rail and planks frame the lower arena without covering cells.
    ctx.fillStyle = '#8d1d27';
    ctx.fillRect(0, canvasH - 43, canvasW, 5);
    for (let x = 10; x < canvasW; x += 62) ctx.fillRect(x, canvasH - 73, 6, 35);
    ctx.strokeStyle = '#9c5a31';
    ctx.lineWidth = 2;
    for (let x = -canvasH; x < canvasW; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, canvasH);
      ctx.lineTo(x + 48, canvasH - 38);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Interpolated snake position
  const drawSnake = prevSnake && prevSnake.length === snake.length && interp < 1;
  const t = drawSnake ? Math.min(interp, 1) : 1;

  // --- Snake trail (fading afterimage) ---
  for (let i = 0; i < trailPoints.length; i++) {
    const tr = trailPoints[i];
    const alpha = tr.alpha * 0.6;
    if (alpha < 0.02) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = T.trail;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Snake body with gradient + glow on head
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const prev = drawSnake && prevSnake[i] ? prevSnake[i] : seg;
    const px = lerp(prev.x, seg.x, t) * CELL;
    const py = lerp(prev.y, seg.y, t) * CELL;

    const ratio = i / Math.max(snake.length, 1);
    const tail = T.snakeTail;
    const r = Math.round(tail[0] + (tail[0] * 0.4) * (1 - ratio));
    const g = Math.round(tail[1] - tail[1] * 0.3 * ratio);
    const b = Math.round(tail[2] - tail[2] * 0.25 * ratio);

    // Head glow
    if (i === 0) {
      ctx.shadowColor = T.snakeHead;
      ctx.shadowBlur = 12 + Math.sin(foodPulse * 2) * 3;
    }
    const segmentColor = (T.snakeStyle === 'bricks' || T.snakeStyle === 'cel' || T.snakeStyle === 'fighter')
      ? T.snakePalette[i % T.snakePalette.length]
      : `rgb(${r},${g},${b})`;
    ctx.fillStyle = segmentColor;

    const pad = i === 0 ? 1 : 2;
    if (T.snakeStyle === 'dragon') {
      const dcx = px + CELL / 2;
      const dcy = py + CELL / 2;
      ctx.save();
      ctx.translate(dcx, dcy);
      ctx.fillStyle = i === 0 ? T.dragonScaleLight : (i % 2 ? T.dragonScale : segmentColor);
      ctx.strokeStyle = '#11141a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(8, -2); ctx.lineTo(6, 6);
      ctx.lineTo(0, 8); ctx.lineTo(-6, 6); ctx.lineTo(-8, -2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (i > 0) {
        ctx.fillStyle = T.dragonHorn;
        ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(0, -12); ctx.lineTo(3, -7); ctx.fill();
      }
      if (i === 1) {
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = '#8b2635';
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-15, -11); ctx.lineTo(-10, 5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(15, -11); ctx.lineTo(10, 5); ctx.fill();
      }
      ctx.restore();
    } else if (T.snakeStyle === 'bricks') {
      // Square brick body, lower shadow, and two raised studs per segment.
      ctx.fillRect(px + pad, py + pad + 2, CELL - pad * 2, CELL - pad * 2 - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(px + pad, py + CELL - pad - 3, CELL - pad * 2, 3);
      ctx.fillStyle = segmentColor;
      for (const studX of [px + 6, px + 14]) {
        ctx.beginPath();
        ctx.arc(studX, py + 5, i === 0 ? 3.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (T.snakeStyle === 'cel') {
      // Heavy ink outline and a single bright highlight mimic the show's cel animation.
      ctx.fillStyle = '#241F20';
      roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, i === 0 ? 6 : 4);
      ctx.fillStyle = segmentColor;
      roundRect(px + pad + 2, py + pad + 2, CELL - pad * 2 - 4, CELL - pad * 2 - 4, i === 0 ? 4 : 2);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(px + pad + 4, py + pad + 4, Math.max(3, CELL - pad * 2 - 9), 2);
    } else if (T.snakeStyle === 'fighter') {
      // Red gi, black belt bands, and a blond pixel head turn the snake into
      // a compact arcade fighter without changing its collision footprint.
      ctx.fillStyle = '#11131a';
      roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, i === 0 ? 5 : 3);
      ctx.fillStyle = i === 0 ? T.fighterSkin : (i % 3 === 0 ? T.fighterGiShadow : T.fighterGi);
      roundRect(px + pad + 1.5, py + pad + 1.5, CELL - pad * 2 - 3, CELL - pad * 2 - 3, i === 0 ? 4 : 2);
      if (i === 0) {
        ctx.fillStyle = T.fighterHair;
        ctx.fillRect(px + 3, py + 2, 14, 4);
        ctx.fillRect(px + 5, py, 3, 4);
        ctx.fillRect(px + 11, py + 1, 4, 4);
        ctx.fillStyle = T.fighterBand;
        ctx.fillRect(px + 2, py + 6, 16, 2);
      } else if (i % 4 === 0) {
        ctx.fillStyle = T.fighterBand;
        ctx.fillRect(px + pad + 1, py + 8, CELL - pad * 2 - 2, 4);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(px + pad + 4, py + pad + 3, 4, 2);
      }
    } else {
      const radius = i === 0 ? 6 : 3;
      roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, radius);
    }
    ctx.shadowBlur = 0;
  }

  // Eyes on head
  const hSeg = snake[0];
  const hPrev = drawSnake && prevSnake[0] ? prevSnake[0] : hSeg;
  const hx = lerp(hPrev.x, hSeg.x, t) * CELL;
  const hy = lerp(hPrev.y, hSeg.y, t) * CELL;
  if (T.snakeStyle === 'dragon') {
    drawDragonHeadAndFire(hx, hy, T);
  } else {
    ctx.fillStyle = '#fff';
    const eyeOff1 = dir.x === 0 ? {x: 5, y: dir.y > 0 ? 12 : 5} : {x: dir.x > 0 ? 12 : 5, y: 5};
    const eyeOff2 = dir.x === 0 ? {x: 13, y: dir.y > 0 ? 12 : 5} : {x: dir.x > 0 ? 12 : 5, y: 13};
    ctx.beginPath(); ctx.arc(hx + eyeOff1.x, hy + eyeOff1.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + eyeOff2.x, hy + eyeOff2.y, 2.5, 0, Math.PI * 2); ctx.fill();
    if (T.snakeStyle === 'fighter' && fighterImpactBurst > 0) {
      const strength = fighterImpactBurst;
      const cx = hx + CELL / 2;
      const cy = hy + CELL / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = T.fighterSpark;
      ctx.lineWidth = 2;
      ctx.shadowColor = T.fighterSpark;
      ctx.shadowBlur = 8;
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4 + foodPulse * 0.08;
        const inner = 11 + (1 - strength) * 5;
        const outer = inner + 9 * strength;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
      fighterImpactBurst = Math.max(0, fighterImpactBurst - 0.065);
    }
  }

  // Food with pulsing glow + scale punch
  foodPulse += 0.05;
  foodScale = lerp(foodScale, foodScaleTarget, 0.2);
  if (Math.abs(foodScale - foodScaleTarget) < 0.01) foodScaleTarget = 1;
  const glow = 8 + Math.sin(foodPulse) * 4;
  const foodR = (CELL / 2 - 2) * foodScale;
  ctx.shadowColor = T.food;
  ctx.shadowBlur = glow;
  ctx.fillStyle = T.food;
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, foodR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Food sprite (pixel art)
  drawFoodSprite(ctx, food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL, T, foodScale, currentTheme);

  // --- Particles & death segments ---
  drawParticles();
  drawDeathSegments();

  // Death flash
  if (deathFlash > 0) {
    ctx.fillStyle = T.deathFlash + deathFlash + ')';
    ctx.fillRect(0, 0, canvasW, canvasH);
    deathFlash -= 0.04;
  }

  // Pause text
  if (paused && alive) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = T.accent;
    ctx.font = 'bold 32px -apple-system, SF Pro Display';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvasW / 2, canvasH / 2);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

// --- Game logic ---
function gameTick() {
  if (!alive || paused) return;
  const appliedDirection = SnakeCore.acceptDirection(dir, nextDir);
  if (!SnakeCore.directionsEqual(dir, appliedDirection)) {
    SnakeCore.recordDirection(runReplay, runTick, appliedDirection);
  }
  dir = appliedDirection;
  runTick++;
  prevSnake = snake.map(s => ({...s}));

  // Record trail point at head position before moving
  const oldHead = snake[0];
  trailPoints.unshift({ x: oldHead.x * CELL + CELL / 2, y: oldHead.y * CELL + CELL / 2, alpha: 1 });
  if (trailPoints.length > MAX_TRAIL) trailPoints.pop();
  // Fade all trail points
  for (const tr of trailPoints) tr.alpha *= 0.7;

  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  // Wall wrap disabled — die on wall
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return die();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return die();

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    if (runGameMode === 'daily') dailyLastFoodElapsedMs = dailyTickElapsedMs;
    scoreEl.textContent = score;
    updateRecordChase();
    haptic('eat');
    AudioEngine.sfxEat();
    AudioEngine.updateTempo(snake.length);
    const T = THEMES[currentTheme];
    if (T.snakeStyle === 'dragon') dragonFireBurst = 1;
    if (T.snakeStyle === 'fighter') fighterImpactBurst = 1;
    // Particle burst on eat
    spawnParticles(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      12, T.food, 2, 1
    );
    // Also spawn accent particles
    spawnParticles(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      6, T.foodAccent, 1.5, 0.7
    );
    // Food scale punch
    foodScaleTarget = 1.6;
    foodScale = 0.3;
    if (score > best) {
      best = score;
      bestScores[runGameMode] = best;
      bestEl.textContent = best;
      const bestKey = runGameMode === 'daily'
        ? ensureDailyChallenge().bestKey
        : BEST_KEYS[runGameMode];
      localStorage.setItem(bestKey, best);
    }
    placeFood();
    speed = Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 2);
  } else {
    snake.pop();
  }
}

function showRunResult(reason) {
  const isSprint = runGameMode === 'sprint';
  const isDaily = runGameMode === 'daily';
  overlayTitle.innerHTML = reason === 'time'
    ? 'TIME UP!'
    : '<svg width="20" height="20" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="#ff003c"><rect x="2" y="1" width="6" height="2"/><rect x="1" y="3" width="8" height="2"/><rect x="1" y="5" width="2" height="2"/><rect x="7" y="5" width="2" height="2"/><rect x="3" y="5" width="4" height="2" fill="rgba(0,0,0,0.3)"/><rect x="2" y="7" width="2" height="2"/><rect x="6" y="7" width="2" height="2"/><rect x="3" y="9" width="4" height="1"/></svg> Game Over';
  overlayMsg.textContent = isDaily
    ? `Daily Score: ${score} • Final food: ${formatDailyFoodTime(dailyLastFoodElapsedMs)}`
    : `${isSprint ? 'Sprint ' : ''}Score: ${score}`;
  startBtn.textContent = 'Play Again';
  shareBtn.style.display = 'block';
  lbBtn.style.display = 'block';
  const scoreMethod = runControlMethod || controlMode;
  recordTargetMethod = scoreMethod;
  scoreMethodLabel.textContent = runUsesMixedControls
    ? (isDaily ? 'Mixed controls • Daily ranking checks all control methods together' : 'Mixed controls — this run is unranked')
    : `${modeHudLabel(runGameMode)} • ${CONTROL_LABELS[scoreMethod]}${isDaily ? (dailyAttempt?.ranked ? ` • ${dailyAttemptLabel(dailyAttempt.number)}` : ' • practice') : ' leaderboard'}`;
  scoreMethodLabel.classList.toggle('unranked', runUsesMixedControls && !isDaily);
  prepareRunSubmission();
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  recordResultVisible = true;
  hideRecordChase();
  if (!isDaily) maybeCelebrateRecordAtGameOver();
}

function finishRun(reason) {
  if (!alive) return;
  alive = false;
  SnakeCore.finalizeReplay(runReplay, { tick: runTick, score, reason });
  if (runGameMode === 'daily' && runReplay) {
    try {
      const replayCheck = SnakeCore.simulateReplay(runReplay, {
        baseInterval: BASE_INTERVAL,
        minInterval: MIN_INTERVAL,
        foodPlacement: 'free-cells'
      });
      runReplay.localVerification = replayCheck.verified ? 'verified' : 'failed';
      if (!replayCheck.verified) console.warn('Daily Run replay did not reproduce the local result.', replayCheck);
    } catch (error) {
      runReplay.localVerification = 'error';
      console.warn('Daily Run replay verification failed.', error);
    }
  }
  countdownActive = false;
  countdownDisplay.classList.remove('visible');
  haptic('die');
  AudioEngine.stop();
  if (reason === 'collision') {
    deathFlash = 0.5;
    screenShake = 15;
    AudioEngine.sfxDie();
    spawnDeathExplosion();
    spawnParticles(
      snake[0].x * CELL + CELL / 2,
      snake[0].y * CELL + CELL / 2,
      30, THEMES[currentTheme].deathParticle, 3, 1.5
    );
    trailPoints = [];
  } else {
    sprintRemainingMs = 0;
    updateSprintTimer(true);
  }
  setTimeout(() => showRunResult(reason), reason === 'collision' ? 600 : 250);
}

function die() {
  finishRun('collision');
}

function showDailyPlayerSetup() {
  displayNameInviteSuppressedThisSession = true;
  displayNameInvite.hidden = true;
  setPlayerMessage(hasUnlimitedDailyAttempts()
    ? 'Choose initials to unlock unlimited ranked Daily runs. Email is not required.'
    : 'Choose initials to unlock ranked Daily runs. Email is not required.');
  renderPlayerIdentity();
  playerPanel.classList.add('visible');
  setTimeout(() => playerInitialsInput.focus(), 0);
}

async function reserveDailyAttempt() {
  const challenge = await refreshDailyChallenge({ force: true });
  if (!challenge.authoritative) {
    dailyAttempt = { ranked: false, preview: true, attemptsRemaining: null };
    return challenge;
  }

  if (!playerProfile) {
    showDailyPlayerSetup();
    return null;
  }

  dailyReservationRequestId ||= createRunId();
  const { data, error } = await sb.rpc('start_daily_attempt', {
    p_request_id: dailyReservationRequestId
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Daily attempt reservation returned no data');

  const reservedChallenge = mapDailyChallenge({
    ...row,
    attempts_used: Number(row.attempts_remaining) < 0
      ? Number(row.attempt_number) || 0
      : (row.ranked ? 3 - Number(row.attempts_remaining) : 3)
  }, true);
  dailyChallenge = reservedChallenge;
  bestScores.daily = parseInt(localStorage.getItem(reservedChallenge.bestKey), 10) || 0;
  dailyAttempt = {
    ranked: row.ranked === true,
    preview: false,
    id: row.attempt_id || null,
    number: row.attempt_number == null ? null : Number(row.attempt_number),
    attemptsRemaining: Number(row.attempts_remaining) < 0
      ? -1
      : Math.max(0, Number(row.attempts_remaining) || 0),
    runToken: row.run_token || null,
    submitted: false,
    result: null
  };
  dailyReservationRequestId = null;
  renderDailyChallengeInfo();
  return reservedChallenge;
}

async function startGame(options = {}) {
  if (gameMode === 'daily' && !options.skipDailyRules && shouldShowDailyRules()) {
    showDailyRules();
    return;
  }
  if (dailyStartPending) return;
  let challenge = null;
  if (gameMode === 'daily') {
    dailyStartPending = true;
    startBtn.disabled = true;
    startBtn.textContent = 'Preparing...';
    try {
      await playerIdentityPromise;
      challenge = await reserveDailyAttempt();
      if (!challenge) return;
    } catch (error) {
      console.warn('Daily attempt could not start:', error);
      overlayMsg.textContent = isSchemaError(error)
        ? 'Daily ranking database update required. Local preview is still available after refresh.'
        : (error.message || 'Could not reserve a Daily attempt. Try again.');
      return;
    } finally {
      dailyStartPending = false;
      startBtn.disabled = false;
      if (!challenge) startBtn.textContent = 'Play';
    }
  }
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  stopRecordCelebration();
  recordResultVisible = false;
  challenge ||= gameMode === 'daily' ? ensureDailyChallenge() : null;
  if (challenge) {
    applyTheme(challenge.theme, { updateSelection: false });
  } else if (themeSelection === 'random') {
    const nextTheme = pickRandomThemeId(Object.keys(THEMES), currentTheme);
    if (nextTheme) applyTheme(nextTheme, { updateSelection: false });
  }
  displayNameInviteSuppressedThisSession = true;
  displayNameInvite.hidden = true;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  shareBtn.style.display = 'none';
  namePrompt.style.display = 'none';
  submittedThisRound = false;
  currentRunId = createRunId();
  runControlMethod = null;
  runUsesMixedControls = false;
  nameInput.disabled = false;
  scoreMethodLabel.classList.remove('unranked');
  runGameMode = gameMode;
  if (runGameMode === 'daily') {
    startBtn.textContent = dailyAttempt?.ranked
      ? dailyAttemptLabel(dailyAttempt.number)
      : 'Practice Run';
  }
  hudMode.textContent = modeHudLabel(runGameMode);
  best = bestScores[runGameMode];
  bestEl.textContent = best;
  prepareGameplayRun(challenge?.seed ?? null);
  reset(true);
  if (runGameMode === 'daily') disableRecordChase();
  else beginRecordChase();
  AudioEngine.start();
  prevSnake = null;
  lastTick = performance.now();
  animationFrameId = requestAnimationFrame(loop);
}

function setDir(x, y) {
  if (countdownActive) return;
  if (dir.x === -x && dir.y === -y) return;
  nextDir = {x, y};
}

function turnClockwise() {
  const dirMap = {up:[0,-1], right:[1,0], down:[0,1], left:[-1,0]};
  let curDirName = Object.keys(dirMap).find(k => dirMap[k][0] === dir.x && dirMap[k][1] === dir.y) || 'right';
  let idx = TURN_ORDER.indexOf(curDirName);
  let next = TURN_ORDER[(idx + 1) % 4];
  setDir(...dirMap[next]);
}

function turnCounterClockwise() {
  const dirMap = {up:[0,-1], right:[1,0], down:[0,1], left:[-1,0]};
  let curDirName = Object.keys(dirMap).find(k => dirMap[k][0] === dir.x && dirMap[k][1] === dir.y) || 'right';
  let idx = TURN_ORDER.indexOf(curDirName);
  let next = TURN_ORDER[(idx + 3) % 4]; // -1 mod 4 = 3
  setDir(...dirMap[next]);
}

// --- Main loop — requestAnimationFrame for 120Hz ProMotion ---
function loop(now) {
  const hasEffects = deathFlash > 0 || deathSegments.length > 0 || particles.length > 0;
  if (!alive && !hasEffects) {
    animationFrameId = null;
    return;
  }
  // Avoid catch-up bursts after throttled/backgrounded animation frames.
  const rawDt = Math.max(0, now - lastTick);
  const dt = Math.min(rawDt, 100);
  lastTick = now;

  if (alive && !paused) {
    if (countdownActive) {
      countdownRemainingMs -= rawDt;
      if (countdownRemainingMs <= 0) {
        countdownActive = false;
        countdownRemainingMs = 0;
        countdownDisplay.textContent = 'GO!';
        tickAccum = 0;
        setTimeout(() => countdownDisplay.classList.remove('visible'), 350);
      } else {
        const countdownLabel = String(Math.ceil(countdownRemainingMs / 1000));
        if (countdownDisplay.textContent !== countdownLabel) countdownDisplay.textContent = countdownLabel;
      }
    } else {
      if (runGameMode === 'daily') {
        const durationMs = dailyChallenge?.durationMs || SPRINT_DURATION_MS;
        const activeElapsedMs = dailyTickElapsedMs + tickAccum;
        tickAccum += Math.min(dt, Math.max(0, durationMs - activeElapsedMs));
        while (alive && tickAccum >= speed && dailyTickElapsedMs + speed <= durationMs) {
          const stepInterval = speed;
          dailyTickElapsedMs += stepInterval;
          prevSnake = snake.map(s => ({...s}));
          gameTick();
          tickAccum -= stepInterval;
        }
        sprintRemainingMs = Math.max(0, durationMs - dailyTickElapsedMs - tickAccum);
        updateSprintTimer();
        if (alive && sprintRemainingMs <= 0) finishRun('time');
      } else {
        if (runGameMode === 'sprint') {
          sprintRemainingMs -= rawDt;
          updateSprintTimer();
          if (sprintRemainingMs <= 0) finishRun('time');
        }
        if (alive) {
          tickAccum += dt;
          while (alive && tickAccum >= speed) {
            prevSnake = snake.map(s => ({...s}));
            gameTick();
            tickAccum -= speed;
          }
        }
      }
    }
  }

  // Update effects
  updateParticles(dt);
  updateDeathSegments(dt);

  // Screen shake
  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake * 1.2;
    shakeY = (Math.random() - 0.5) * screenShake * 1.2;
    screenShake *= 0.85;
    if (screenShake < 0.5) { screenShake = 0; shakeX = 0; shakeY = 0; }
  }

  const interp = alive && !paused ? tickAccum / speed : 1;

  // Apply screen shake transform
  if (screenShake > 0) {
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }
  draw(interp);
  if (screenShake > 0) {
    ctx.restore();
  }

  // FPS counter
  fpsFrames++;
  const fpsNow = performance.now();
  if (fpsNow - fpsLast >= 500) {
    fpsDisplay = Math.round(fpsFrames / ((fpsNow - fpsLast) / 1000));
    fpsFrames = 0;
    fpsLast = fpsNow;
    document.getElementById('fps-counter').textContent = fpsDisplay + ' FPS';
  }

  animationFrameId = requestAnimationFrame(loop);
}

// --- Keyboard ---
document.addEventListener('keydown', e => {
  // Don't hijack keys when user is typing in an input
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  switch (e.key) {

    case 'ArrowRight': case 'd': case 'D':
      e.preventDefault();
      registerControlMethod('keyboard');
      if (controlMode === 'turn' || controlMode === 'tap') { turnClockwise(); } else { setDir(1, 0); }
      break;
    case 'ArrowLeft': case 'a': case 'A':
      e.preventDefault();
      registerControlMethod('keyboard');
      if (controlMode === 'turn' || controlMode === 'tap') { turnCounterClockwise(); } else { setDir(-1, 0); }
      break;
    case 'ArrowUp': case 'w': case 'W':
      e.preventDefault();
      if (controlMode !== 'turn' && controlMode !== 'tap') { registerControlMethod('keyboard'); setDir(0, -1); }
      break;
    case 'ArrowDown': case 's': case 'S':
      e.preventDefault();
      if (controlMode !== 'turn' && controlMode !== 'tap') { registerControlMethod('keyboard'); setDir(0, 1); }
      break;
    case 'p': case 'P':
      togglePause();
      break;
  }
});

// --- Pause toggle ---
function setPaused(value) {
  if (!alive) return;
  if (paused === value) return;
  paused = value;
  const btn = document.getElementById('pause-btn');
  btn.innerHTML = paused
    ? '<svg width="18" height="18" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><polygon points="2,1 8,5 2,9"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="2" y="1" width="2" height="8"/><rect x="6" y="1" width="2" height="8"/></svg>';
  btn.classList.toggle('paused', paused);
  btn.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  btn.title = paused ? 'Resume (P)' : 'Pause (P)';
  paused ? AudioEngine.pause() : AudioEngine.resume();
  if (countdownActive) {
    countdownDisplay.textContent = paused ? 'PAUSED' : String(Math.max(1, Math.ceil(countdownRemainingMs / 1000)));
  }
  if (paused) draw(1);
}
function togglePause() { setPaused(!paused); }
document.getElementById('pause-btn').addEventListener('click', togglePause);

// Never let an inactive tab silently advance the run when rendering resumes.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && alive && !paused) setPaused(true);
  lastTick = performance.now();
  tickAccum = 0;
});
window.addEventListener('blur', () => {
  if (alive && !paused) setPaused(true);
});

// --- Touch swipe (full canvas) ---
let touchStart = null;
let lastTapTouchAt = 0;

function tapTurnAt(clientX) {
  const bounds = canvas.getBoundingClientRect();
  registerControlMethod('tap');
  if (clientX < bounds.left + bounds.width / 2) turnCounterClockwise();
  else turnClockwise();
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (controlMode === 'tap') {
    lastTapTouchAt = performance.now();
    touchStart = null;
    tapTurnAt(e.touches[0].clientX);
    return;
  }
  touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
}, {passive: false});
canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false});
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const minSwipe = 15;
  touchStart = null;
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
  if (controlMode === 'turn') {
    registerControlMethod('turn');
    const clockwise = Math.abs(dx) > Math.abs(dy) ? dx > 0 : dy > 0;
    clockwise ? turnClockwise() : turnCounterClockwise();
  } else {
    registerControlMethod('dpad');
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }
});

canvas.addEventListener('mousedown', e => {
  if (controlMode !== 'tap' || e.button !== 0) return;
  if (performance.now() - lastTapTouchAt < 700) return;
  e.preventDefault();
  tapTurnAt(e.clientX);
});

// ============================================================
// 8-BIT CHIPTUNE ENGINE  —  Theme-aware, adaptive to snake length
// ============================================================
const AudioEngine = createAudioEngine({
  getCurrentTheme: () => THEMES[currentTheme],
  isRunActive: () => alive,
  isPaused: () => paused,
  getSnakeLength: () => snake?.length || 3,
});

// --- Mute button ---
// --- D-pad controls ---
const dpad = document.getElementById('dpad');
const turnControls = document.getElementById('turn-controls');
const CONTROL_FADE_DELAY_MS = 500;
let controlFadeTimeout;

function showTouchControls() {
  clearTimeout(controlFadeTimeout);
  dpad.classList.toggle('active', controlMode === 'dpad');
  turnControls.classList.toggle('active', controlMode === 'turn');
}

function scheduleTouchControlsFade(delay = CONTROL_FADE_DELAY_MS) {
  clearTimeout(controlFadeTimeout);
  controlFadeTimeout = setTimeout(() => {
    if (dpad.classList.contains('edit-mode') || turnControls.classList.contains('edit-mode')) return;
    dpad.classList.remove('active');
    turnControls.classList.remove('active');
  }, delay);
}

function wakeTouchControls(delay = CONTROL_FADE_DELAY_MS) {
  showTouchControls();
  scheduleTouchControlsFade(delay);
}

function applyControlMode(mode) {
  if (!['dpad', 'turn', 'tap'].includes(mode)) mode = 'dpad';
  controlMode = mode;
  localStorage.setItem('snake_control_mode', mode);
  if (mode === 'turn') {
    dpad.style.display = 'none';
    turnControls.style.display = 'flex';
  } else if (mode === 'tap') {
    dpad.style.display = 'none';
    turnControls.style.display = 'none';
  } else {
    dpad.style.display = '';
    turnControls.style.display = 'none';
  }
  document.querySelectorAll('.control-mode-btn').forEach(b => {
    const selected = b.dataset.mode === mode;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  const controlsCopy = document.querySelector('#controls-settings-panel .controls-copy');
  const controlsNote = document.querySelector('#controls-settings-panel .controls-note');
  const customizeButton = document.getElementById('controls-customize-btn');
  if (controlsCopy) {
    controlsCopy.textContent = mode === 'tap'
      ? 'Tap the left or right half of the game board to turn.'
      : 'Choose the touch control used during play.';
  }
  if (controlsNote) {
    controlsNote.textContent = mode === 'tap'
      ? 'Left turns counter-clockwise. Right turns clockwise. No buttons appear during play.'
      : "Move the selected control's buttons to comfortable positions.";
  }
  if (customizeButton) customizeButton.hidden = mode === 'tap';
  wakeTouchControls(2200);
}
applyControlMode(controlMode);

document.querySelectorAll('.control-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => applyControlMode(btn.dataset.mode));
});

// Turn controls touch/pointer handling
const turnDirs = { cw: turnClockwise, ccw: turnCounterClockwise };
document.querySelectorAll('#turn-controls .turn-btn').forEach(btn => {
  const action = turnDirs[btn.dataset.turn];
  const doTurn = e => {
    if (turnControls.classList.contains('edit-mode')) return;
    e.preventDefault(); e.stopPropagation();
    if (paused && alive) togglePause();
    registerControlMethod('turn');
    action(); btn.classList.add('pressed');
    showTouchControls();
  };
  const unTurn = () => {
    btn.classList.remove('pressed');
    scheduleTouchControlsFade();
  };
  btn.addEventListener('touchstart', doTurn, {passive: false});
  btn.addEventListener('touchend', unTurn, {passive: false});
  btn.addEventListener('touchcancel', unTurn, {passive: false});
  btn.addEventListener('mousedown', doTurn);
  btn.addEventListener('mouseup', unTurn);
  btn.addEventListener('mouseleave', unTurn);
});

// --- D-pad position (localStorage) ---
const DPAD_BTNS = ['up', 'down', 'left', 'right'];
const DPAD_DEFAULTS = {
  up:    { bottom: 112, right: 56 },
  down:  { bottom: 0,   right: 56 },
  left:  { bottom: 56,  right: 112 },
  right: { bottom: 56,  right: 0 }
};

function loadBtnPos(dir) {
  try {
    const saved = JSON.parse(localStorage.getItem('snake_dpad_' + dir));
    if (saved) {
      // New format: {x, y}
      if (typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
      // Legacy format: {bottom, right} → ignore (incompatible)
    }
  } catch(e) {}
  return null;
}
function saveBtnPos(dir, pos) {
  localStorage.setItem('snake_dpad_' + dir, JSON.stringify(pos));
}
function applyBtnPos(dir, pos) {
  const btn = dpad.querySelector('.btn.' + dir);
  if (!btn) return;
  btn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  btn._offsetX = pos.x;
  btn._offsetY = pos.y;
}
function resetBtnPos(dir) {
  const btn = dpad.querySelector('.btn.' + dir);
  if (!btn) return;
  btn.style.transform = '';
  btn._offsetX = 0;
  btn._offsetY = 0;
  localStorage.removeItem('snake_dpad_' + dir);
}

// Load saved positions
DPAD_BTNS.forEach(dir => {
  const saved = loadBtnPos(dir);
  if (saved) applyBtnPos(dir, saved);
});

const dpadDirs = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
document.querySelectorAll('#dpad .btn').forEach(btn => {
  const d = btn.dataset.dir;
  const [x, y] = dpadDirs[d];
  const doDir = e => {
    if (dpad.classList.contains('edit-mode')) return;
    e.preventDefault(); e.stopPropagation();
    if (paused && alive) togglePause();
    registerControlMethod('dpad');
    setDir(x, y); btn.classList.add('pressed');
    showTouchControls();
  };
  const unDir = () => {
    btn.classList.remove('pressed');
    scheduleTouchControlsFade();
  };
  btn.addEventListener('touchstart', doDir, {passive: false});
  btn.addEventListener('touchend', unDir, {passive: false});
  btn.addEventListener('touchcancel', unDir, {passive: false});
  btn.addEventListener('mousedown', doDir);
  btn.addEventListener('mouseup', unDir);
  btn.addEventListener('mouseleave', unDir);
});

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  const m = AudioEngine.toggleMute();
  muteBtn.innerHTML = m
    ? '<svg width="16" height="16" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="3" width="2" height="4"/><rect x="3" y="2" width="2" height="6"/><rect x="5" y="1" width="1" height="8"/><line x1="7" y1="3" x2="9" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="3" x2="7" y2="7" stroke="currentColor" stroke-width="1.2"/></svg> Muted'
    : '<svg width="16" height="16" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="3" width="2" height="4"/><rect x="3" y="2" width="2" height="6"/><rect x="5" y="1" width="1" height="8"/><rect x="7" y="3" width="1" height="4"/><rect x="9" y="2" width="1" height="6"/></svg> Music';
  muteBtn.classList.toggle('muted', m);
});

// --- Options Menu ---
const optionsBtn = document.getElementById('options-btn');
const optionsPanel = document.getElementById('options-panel');
const optionsBack = document.getElementById('options-back');
optionsBtn.addEventListener('click', () => {
  optionsPanel.classList.add('visible');
});
optionsBack.addEventListener('click', () => {
  optionsPanel.classList.remove('visible');
});
document.getElementById('random-theme-btn').addEventListener('click', () => {
  selectRandomThemeMode();
});

document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
  });
});

// --- Theme Picker Icons ---
Object.keys(THEMES).forEach(key => {
  const el = document.getElementById('ti-' + key);
  if (!el) return;
  if (THEME_ICON_URLS[key]) {
    const img = document.createElement('img');
    img.src = THEME_ICON_URLS[key];
    img.style.cssText = 'width:48px;height:48px;image-rendering:pixelated';
    el.innerHTML = '';
    el.appendChild(img);
  } else {
    // Default theme: draw canvas food sprite
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    drawFoodSprite(c.getContext('2d'), 24, 24, 48, THEMES[key], 1.0, key);
    el.innerHTML = '';
    el.appendChild(c);
  }
});

// --- Controls Customization ---
const controlsBtn = document.getElementById('controls-btn');
const controlsOverlay = document.getElementById('controls-edit-overlay');
const controlsCustomizeBtn = document.getElementById('controls-customize-btn');
const controlsBackBtn = document.getElementById('controls-back-btn');
const controlsDoneBtn = document.getElementById('controls-done-btn');
const controlsResetBtn = document.getElementById('controls-reset-btn');

let draggingBtn = null;
let dragStartX, dragStartY, dragStartBtnOffsetX, dragStartBtnOffsetY;

function getViewportBounds() {
  const vp = window.visualViewport;
  return {
    w: vp ? vp.width : window.innerWidth,
    h: vp ? vp.height : window.innerHeight
  };
}

// --- Turn Controls position (localStorage) ---
const TURN_BTNS = ['ccw', 'cw'];

function loadTurnBtnPos(id) {
  try {
    const saved = JSON.parse(localStorage.getItem('snake_turn_' + id));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
  } catch(e) {}
  return null;
}
function saveTurnBtnPos(id, pos) {
  localStorage.setItem('snake_turn_' + id, JSON.stringify(pos));
}
function applyTurnBtnPos(id, pos) {
  const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
  if (!btn) return;
  btn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  btn._offsetX = pos.x;
  btn._offsetY = pos.y;
}
function resetTurnBtnPos(id) {
  const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
  if (!btn) return;
  btn.style.transform = '';
  btn._offsetX = 0;
  btn._offsetY = 0;
  localStorage.removeItem('snake_turn_' + id);
}

// Load saved turn positions
TURN_BTNS.forEach(id => {
  const saved = loadTurnBtnPos(id);
  if (saved) applyTurnBtnPos(id, saved);
});

function openControlsSettings() {
  // Ignore stale/ghost clicks from the menu while gameplay has it hidden.
  if (alive || overlay.classList.contains('hidden')) return;
  controlsOverlay.classList.add('visible');
  controlsOverlay.classList.remove('customizing');
  overlay.style.display = 'none';
  applyControlMode(controlMode);
}

function closeControlsSettings() {
  dpad.classList.remove('edit-mode');
  turnControls.classList.remove('edit-mode');
  controlsOverlay.classList.remove('visible', 'customizing');
  overlay.style.display = '';
  scheduleTouchControlsFade(300);
}

function startControlsEdit() {
  if (controlMode === 'tap') return;
  controlsOverlay.classList.add('visible', 'customizing');
  overlay.style.display = 'none';
  clearTimeout(controlFadeTimeout);
  if (controlMode === 'turn') {
    turnControls.classList.add('edit-mode');
    document.querySelector('#controls-edit-bar .edit-hint').innerHTML = 'Drag each <span class="accent">button</span>';
  } else {
    dpad.classList.add('edit-mode');
    document.querySelector('#controls-edit-bar .edit-hint').innerHTML = 'Drag each <span class="accent">button</span>';
  }
}

function stopControlsEdit() {
  dpad.classList.remove('edit-mode');
  turnControls.classList.remove('edit-mode');
  controlsOverlay.classList.remove('customizing');
  // Save dpad offsets
  DPAD_BTNS.forEach(dir => {
    const btn = dpad.querySelector('.btn.' + dir);
    if (!btn) return;
    const ox = btn._offsetX || 0;
    const oy = btn._offsetY || 0;
    if (ox !== 0 || oy !== 0) saveBtnPos(dir, { x: ox, y: oy });
  });
  // Save turn offsets
  TURN_BTNS.forEach(id => {
    const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
    if (!btn) return;
    const ox = btn._offsetX || 0;
    const oy = btn._offsetY || 0;
    if (ox !== 0 || oy !== 0) saveTurnBtnPos(id, { x: ox, y: oy });
  });
  applyControlMode(controlMode);
}

controlsBtn.addEventListener('click', openControlsSettings);
controlsCustomizeBtn.addEventListener('click', startControlsEdit);
controlsBackBtn.addEventListener('click', closeControlsSettings);
controlsDoneBtn.addEventListener('click', stopControlsEdit);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !controlsOverlay.classList.contains('visible')) return;
  if (controlsOverlay.classList.contains('customizing')) stopControlsEdit();
  else closeControlsSettings();
});

controlsResetBtn.addEventListener('click', () => {
  if (controlMode === 'turn') {
    TURN_BTNS.forEach(id => resetTurnBtnPos(id));
  } else {
    DPAD_BTNS.forEach(dir => resetBtnPos(dir));
  }
});

function onBtnDragStart(e) {
  const parent = e.currentTarget.closest('#dpad, #turn-controls');
  if (!parent || !parent.classList.contains('edit-mode')) return;
  e.preventDefault();
  e.stopPropagation();
  draggingBtn = e.currentTarget;
  draggingBtn.classList.add('dragging');
  const touch = e.touches ? e.touches[0] : e;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  const parentRect = parent.getBoundingClientRect();
  const btnRect = draggingBtn.getBoundingClientRect();
  dragStartBtnOffsetX = (btnRect.left + btnRect.width / 2) - (parentRect.left + parentRect.width / 2);
  dragStartBtnOffsetY = (btnRect.top + btnRect.height / 2) - (parentRect.top + parentRect.height / 2);
}

function onBtnDragMove(e) {
  if (!draggingBtn) return;
  e.preventDefault();
  const touch = e.touches ? e.touches[0] : e;
  const dx = touch.clientX - dragStartX;
  const dy = touch.clientY - dragStartY;
  let newOffsetX = dragStartBtnOffsetX + dx;
  let newOffsetY = dragStartBtnOffsetY + dy;
  const parent = draggingBtn.closest('#dpad, #turn-controls');
  const parentRect = parent.getBoundingClientRect();
  const bounds = getViewportBounds();
  const btnCenterX = parentRect.left + parentRect.width / 2 + newOffsetX;
  const btnCenterY = parentRect.top + parentRect.height / 2 + newOffsetY;
  if (btnCenterX < 28) newOffsetX -= btnCenterX - 28;
  if (btnCenterX > bounds.w - 28) newOffsetX -= btnCenterX - (bounds.w - 28);
  if (btnCenterY < 28) newOffsetY -= btnCenterY - 28;
  if (btnCenterY > bounds.h - 28) newOffsetY -= btnCenterY - (bounds.h - 28);
  draggingBtn.style.transform = `translate(${newOffsetX}px, ${newOffsetY}px)`;
  draggingBtn._offsetX = newOffsetX;
  draggingBtn._offsetY = newOffsetY;
}

function onBtnDragEnd() {
  if (!draggingBtn) return;
  draggingBtn.classList.remove('dragging');
  draggingBtn = null;
}

// Attach drag to dpad buttons
document.querySelectorAll('#dpad .btn').forEach(btn => {
  btn.addEventListener('touchstart', onBtnDragStart, { passive: false });
  btn.addEventListener('mousedown', onBtnDragStart);
});
// Attach drag to turn buttons
document.querySelectorAll('#turn-controls .turn-btn').forEach(btn => {
  btn.addEventListener('touchstart', onBtnDragStart, { passive: false });
  btn.addEventListener('mousedown', onBtnDragStart);
});
document.addEventListener('touchmove', onBtnDragMove, { passive: false });
document.addEventListener('touchend', onBtnDragEnd);
document.addEventListener('mousemove', onBtnDragMove);
document.addEventListener('mouseup', onBtnDragEnd);

// --- PWA Setup ---
(function setupPWA() {
  // Deployable service worker: network-first pages with an offline fallback.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', {
        scope: './',
        updateViaCache: 'none'
      }).then(registration => registration.update()).catch(error => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
})();

// --- Supabase Leaderboard ---
const SB_URL = 'https://suuwudlnsapyvthjscwp.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dXd1ZGxuc2FweXZ0aGpzY3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc3ODcsImV4cCI6MjA4MDQ5Mzc4N30.eI0bkImttIQ_AeiCj59lUpjbcrSU4skFbsDIXVCHkEk';
let sb = null;
try { sb = supabase.createClient(SB_URL, SB_KEY); } catch(e) { console.warn('Supabase init failed:', e); }

// --- Leaderboard record chase ---
const RECORD_METHODS = ['dpad', 'turn', 'tap', 'keyboard'];
const RECORD_WARNING_MIN_POINTS = 3;
const RECORD_WARNING_PERCENT = 0.10;
let recordCelebrationCheckStarted = false;
let recordCelebrationTimeout = null;
let recordFireworksFrame = null;
let recordFireworkRockets = [];
let recordFireworkSparks = [];
let recordFireworksEnd = 0;
let recordNextLaunch = 0;

async function fetchRecordTopScore(mode) {
  if (!sb) return null;
  const { data, error } = await sb.from('leaderboard')
    .select('score')
    .eq('game_mode', mode)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.length ? Number(data[0].score) : 0;
}

function hideRecordChase() {
  recordChaseEl.classList.remove('visible', 'record-pace');
  recordChaseEl.textContent = '';
  hudMode.classList.remove('record-warning', 'record-pace');
  hudMode.textContent = modeHudLabel(alive ? runGameMode : gameMode);
  canvas.classList.remove('record-warning', 'record-pace');
  canvas.style.removeProperty('--record-pulse-speed');
}

function showRecordChase(message, hudMessage, state, progress = 0) {
  recordChaseEl.textContent = message;
  recordChaseEl.classList.add('visible');
  recordChaseEl.classList.toggle('record-pace', state === 'pace');
  hudMode.textContent = hudMessage;
  hudMode.classList.toggle('record-warning', state === 'warning');
  hudMode.classList.toggle('record-pace', state === 'pace');
  canvas.classList.toggle('record-warning', state === 'warning');
  canvas.classList.toggle('record-pace', state === 'pace');
  if (state === 'warning') {
    const pulseMs = Math.round(820 - Math.max(0, Math.min(1, progress)) * 330);
    canvas.style.setProperty('--record-pulse-speed', pulseMs + 'ms');
  } else {
    canvas.style.removeProperty('--record-pulse-speed');
  }
}

function disableRecordChase() {
  recordTargetScore = null;
  recordTargetMethod = null;
  recordBrokenThisRun = false;
  hideRecordChase();
  AudioEngine.stopRecordHeartbeat();
}

function activateRecordTarget(method) {
  if (runUsesMixedControls || !RECORD_METHODS.includes(method)) return disableRecordChase();
  recordTargetMethod = method;
  const target = recordTargets[method];
  if (!Number.isFinite(target)) return;
  recordTargetScore = target;
  updateRecordChase();
}

function updateRecordChase() {
  if (runUsesMixedControls || !Number.isFinite(recordTargetScore)) return;
  if (score > recordTargetScore) {
    recordBrokenThisRun = true;
    AudioEngine.stopRecordHeartbeat();
    showRecordChase('Record pace — keep going!', 'NEW #1', 'pace');
    return;
  }
  const pointsToBreak = recordTargetScore - score + 1;
  const warningDistance = Math.max(RECORD_WARNING_MIN_POINTS, Math.ceil(recordTargetScore * RECORD_WARNING_PERCENT));
  if (pointsToBreak <= warningDistance) {
    const progress = 1 - ((pointsToBreak - 1) / Math.max(1, warningDistance));
    const warningText = recordTargetScore === 0
      ? '1 point to set the record'
      : `${pointsToBreak} ${pointsToBreak === 1 ? 'point' : 'points'} to new #1`;
    showRecordChase(warningText, `${pointsToBreak} TO #1`, 'warning', progress);
    AudioEngine.setRecordHeartbeat(progress);
  } else {
    hideRecordChase();
    AudioEngine.stopRecordHeartbeat();
  }
}

function beginRecordChase() {
  const requestId = ++recordTargetRequest;
  const runId = currentRunId;
  recordTargets = Object.create(null);
  recordTargetScore = null;
  recordTargetMethod = null;
  recordBrokenThisRun = false;
  recordCelebrationShown = false;
  recordCelebrationCheckStarted = false;
  hideRecordChase();
  AudioEngine.stopRecordHeartbeat();

  const params = new URLSearchParams(location.search);
  const debugTarget = document.body.classList.contains('debug') ? Number(params.get('recordTarget')) : NaN;
  if (Number.isFinite(debugTarget) && debugTarget >= 0) {
    RECORD_METHODS.forEach(method => { recordTargets[method] = debugTarget; });
    recordTargetPromise = Promise.resolve(recordTargets);
    return;
  }

  recordTargetPromise = fetchRecordTopScore(runGameMode).then(target => {
    if (requestId !== recordTargetRequest || runId !== currentRunId) return recordTargets;
    if (Number.isFinite(target)) {
      RECORD_METHODS.forEach(method => { recordTargets[method] = target; });
    }
    if (runControlMethod) activateRecordTarget(runControlMethod);
    return recordTargets;
  }).catch(error => {
    console.warn(`Mode-wide record target unavailable for ${runGameMode}:`, error);
    return recordTargets;
  });
}

function resizeRecordFireworks() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  recordFireworksCanvas.width = Math.max(1, Math.round(width * dpr));
  recordFireworksCanvas.height = Math.max(1, Math.round(height * dpr));
  recordFireworksCanvas.style.width = width + 'px';
  recordFireworksCanvas.style.height = height + 'px';
  const context = recordFireworksCanvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function explodeRecordFirework(rocket) {
  const palette = [THEMES[currentTheme].accent, THEMES[currentTheme].food, '#ffd700', '#ff4f81', '#70d1fe', '#ffffff'];
  const color = palette[Math.floor(Math.random() * palette.length)];
  const count = 42 + Math.floor(Math.random() * 28);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + Math.random() * 0.08;
    const speed = 1.4 + Math.random() * 4.3;
    recordFireworkSparks.push({
      x: rocket.x, y: rocket.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0.85 + Math.random() * 0.75, maxLife: 1.6,
      color, size: 1.2 + Math.random() * 2.4
    });
  }
}

function launchRecordFirework(now) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  recordFireworkRockets.push({
    x: width * (0.12 + Math.random() * 0.76), y: height + 12,
    vx: (Math.random() - 0.5) * 0.8, vy: -(6.5 + Math.random() * 3),
    explodeY: height * (0.12 + Math.random() * 0.46),
    color: Math.random() > 0.5 ? '#ffd700' : THEMES[currentTheme].accent
  });
  recordNextLaunch = now + 230 + Math.random() * 260;
}

function animateRecordFireworks(now) {
  const ctx = recordFireworksCanvas.getContext('2d');
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';

  if (now < recordFireworksEnd && now >= recordNextLaunch) launchRecordFirework(now);
  for (let i = recordFireworkRockets.length - 1; i >= 0; i--) {
    const rocket = recordFireworkRockets[i];
    rocket.x += rocket.vx; rocket.y += rocket.vy; rocket.vy += 0.025;
    ctx.fillStyle = rocket.color;
    ctx.fillRect(rocket.x - 1.5, rocket.y, 3, 11);
    if (rocket.y <= rocket.explodeY || rocket.vy >= -1.5) {
      explodeRecordFirework(rocket);
      recordFireworkRockets.splice(i, 1);
    }
  }
  for (let i = recordFireworkSparks.length - 1; i >= 0; i--) {
    const spark = recordFireworkSparks[i];
    spark.x += spark.vx; spark.y += spark.vy;
    spark.vx *= 0.986; spark.vy = spark.vy * 0.986 + 0.045;
    spark.life -= 0.016;
    if (spark.life <= 0) { recordFireworkSparks.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, spark.life / spark.maxLife);
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x, spark.y, spark.size, spark.size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (now < recordFireworksEnd || recordFireworkRockets.length || recordFireworkSparks.length) {
    recordFireworksFrame = requestAnimationFrame(animateRecordFireworks);
  } else {
    recordFireworksFrame = null;
  }
}

function stopRecordCelebration() {
  if (recordCelebrationTimeout) clearTimeout(recordCelebrationTimeout);
  recordCelebrationTimeout = null;
  if (recordFireworksFrame) cancelAnimationFrame(recordFireworksFrame);
  recordFireworksFrame = null;
  recordFireworkRockets = [];
  recordFireworkSparks = [];
  recordCelebrationEl.classList.remove('active');
  recordCelebrationEl.setAttribute('aria-hidden', 'true');
  const ctx = recordFireworksCanvas.getContext('2d');
  ctx.clearRect(0, 0, recordFireworksCanvas.width, recordFireworksCanvas.height);
}

function launchRecordCelebration({ confirmed = false, previousTop = recordTargetScore } = {}) {
  if (recordCelebrationShown) {
    if (confirmed) recordBannerCopy.textContent = 'World record confirmed and saved';
    return;
  }
  recordCelebrationShown = true;
  recordBannerCopy.textContent = confirmed
    ? 'World record confirmed and saved'
    : `Previous best: ${Number.isFinite(previousTop) ? previousTop : '—'} • ${runGameMode === 'sprint' ? 'Sprint' : 'Classic'} world record`;
  recordCelebrationEl.classList.add('active');
  recordCelebrationEl.setAttribute('aria-hidden', 'false');
  AudioEngine.playRecordFanfare();
  if (navigator.vibrate) navigator.vibrate([35,25,35,25,80]);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    resizeRecordFireworks();
    recordFireworksEnd = performance.now() + 4400;
    recordNextLaunch = 0;
    recordFireworksFrame = requestAnimationFrame(animateRecordFireworks);
  }
  recordCelebrationTimeout = setTimeout(stopRecordCelebration, 5600);
}

function maybeCelebrateRecordAtGameOver() {
  if (!recordResultVisible || recordCelebrationCheckStarted || runUsesMixedControls || score < 1) return;
  recordCelebrationCheckStarted = true;
  const runId = currentRunId;
  const method = runControlMethod || controlMode;
  recordTargetMethod = method;
  const frozenTarget = Number.isFinite(recordTargets[method]) ? recordTargets[method] : null;
  const params = new URLSearchParams(location.search);
  const hasDebugTarget = document.body.classList.contains('debug') && Number.isFinite(Number(params.get('recordTarget')));
  const latestTarget = hasDebugTarget
    ? Promise.resolve(frozenTarget)
    : fetchRecordTopScore(runGameMode).catch(() => frozenTarget);
  Promise.resolve(latestTarget).then(target => {
    if (runId !== currentRunId || !recordResultVisible || runUsesMixedControls) return;
    if (Number.isFinite(target)) {
      recordTargetScore = target;
      recordBrokenThisRun = score > target;
    }
    hideRecordChase();
    if (recordBrokenThisRun) launchRecordCelebration({ previousTop: target });
  });
}

window.addEventListener('resize', () => {
  if (recordCelebrationEl.classList.contains('active')) resizeRecordFireworks();
});

let submittedThisRound = false;
let currentUser = null;
let playerProfile = null;
let playerIdentityRevision = 0;
let pendingOtpEmail = '';
let pendingOtpType = 'email';
const AUTO_SUBMIT_KEY = 'snake_auto_submit';
const PENDING_SCORES_KEY = 'snake_pending_scores';
let autoSubmitEnabled = localStorage.getItem(AUTO_SUBMIT_KEY) !== 'false';
autoSubmitToggle.checked = autoSubmitEnabled;

function createRunId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
}

function cleanInitials(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

function cleanDisplayName(value) {
  const cleaned = String(value || '')
    .replace(/[<>\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(cleaned).slice(0, 20).join('');
}

function playerDisplayName(profile = playerProfile) {
  return profile ? `${profile.initials}\u00b7${profile.player_code}` : '';
}

function setPlayerMessage(message, isError = false) {
  playerMessage.textContent = message;
  playerMessage.classList.toggle('error', isError);
}

function isPermanentPlayer() {
  return !!currentUser && currentUser.is_anonymous !== true;
}

function renderPlayerIdentity() {
  const displayName = playerDisplayName();
  const permanent = isPermanentPlayer();
  playerMenuLabel.textContent = displayName ? `Player: ${displayName}` : 'Player: Guest';
  playerIdentityStatus.innerHTML = displayName
    ? `<span class="player-tag">${escHtml(displayName)}</span><br>${permanent ? 'Saved player \u2022 restorable by email' : 'Guest player \u2022 saved on this device'}`
    : currentUser ? 'Guest connected<br>Choose your arcade initials' : 'Connecting...';
  playerProfileSetup.style.display = playerProfile ? 'none' : 'block';
  playerDisplaySetup.style.display = playerProfile ? 'block' : 'none';
  if (playerProfile && document.activeElement !== playerDisplayNameInput) {
    playerDisplayNameInput.value = playerProfile.display_name || '';
  }
  playerAccountSetup.style.display = permanent ? 'none' : 'block';
  renderDisplayNameInvitation();
}

async function loadPlayerProfile(user = currentUser, revision = playerIdentityRevision) {
  // Auth events can overlap during email restoration: the outgoing anonymous
  // session and the restored email session may both finish network requests.
  // Only the newest session is allowed to change the visible player identity.
  if (revision !== playerIdentityRevision || currentUser?.id !== user?.id) return null;
  playerProfile = null;
  if (!sb || !user) {
    renderPlayerIdentity();
    return null;
  }
  try {
    let result = await sb.from('player_profiles')
      .select('initials, player_code, display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (['42703', 'PGRST204'].includes(result.error?.code)) {
      result = await sb.from('player_profiles')
        .select('initials, player_code')
        .eq('id', user.id)
        .maybeSingle();
    }
    const { data, error } = result;
    if (revision !== playerIdentityRevision || currentUser?.id !== user.id) return null;
    if (!error && data) playerProfile = data;
    else if (error && !['42P01', 'PGRST205'].includes(error.code)) console.warn('Player profile load failed:', error);
  } catch (error) {
    if (revision !== playerIdentityRevision || currentUser?.id !== user.id) return null;
    console.warn('Player profile unavailable:', error);
  }
  renderPlayerIdentity();
  return playerProfile;
}

async function syncPlayerSession(session) {
  const revision = ++playerIdentityRevision;
  const user = session?.user || null;
  currentUser = user;
  await loadPlayerProfile(user, revision);
  if (revision !== playerIdentityRevision || currentUser?.id !== user?.id) return;
  retryPendingScores();
  if (gameMode === 'daily') refreshDailyChallenge({ force: true });
}

async function initPlayerIdentity() {
  renderPlayerIdentity();
  if (!sb?.auth) {
    playerIdentityStatus.textContent = 'Player service unavailable';
    return;
  }
  try {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    let session = sessionData?.session || null;
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      session = data?.session || (data?.user ? { user: data.user } : null);
    }
    await syncPlayerSession(session);
  } catch (error) {
    console.warn('Player identity init failed:', error);
    playerIdentityStatus.textContent = 'Guest scores unavailable right now';
  }
}

let playerIdentityPromise = Promise.resolve();

function startPlayerIdentity() {
  try {
    playerIdentityPromise = Promise.resolve(initPlayerIdentity()).catch(error => {
      console.warn('Player identity startup failed:', error);
      playerIdentityStatus.textContent = 'Guest scores unavailable right now';
    });

    if (sb?.auth?.onAuthStateChange) {
      try {
        sb.auth.onAuthStateChange((_event, eventSession) => {
          setTimeout(async () => {
            // Supabase may deliver an older INITIAL_SESSION callback after a
            // restore has already replaced it. Re-read the active session so
            // that stale callbacks cannot put the restored player back into a
            // temporary guest state.
            const { data, error } = await sb.auth.getSession();
            if (error) return;
            const activeSession = data?.session || null;
            if ((activeSession?.user?.id || null) !== (eventSession?.user?.id || null)) return;
            playerIdentityPromise = syncPlayerSession(activeSession);
            await playerIdentityPromise;
          }, 0);
        });
      } catch (error) {
        console.warn('Player identity listener unavailable:', error);
      }
    }
  } catch (error) {
    // Identity must never prevent the offline game and menu from starting.
    console.warn('Player identity unavailable:', error);
    playerIdentityStatus.textContent = 'Guest scores unavailable right now';
    playerIdentityPromise = Promise.resolve();
  }
}

async function savePlayerInitials(value) {
  const initials = cleanInitials(value);
  if (!initials || !sb || !currentUser) throw new Error('Enter 1 to 3 letters or numbers');
  const { data, error } = await sb.rpc('set_player_initials', { p_initials: initials });
  if (error) throw error;
  const savedProfile = Array.isArray(data) ? data[0] : data;
  playerProfile = { ...(playerProfile || {}), ...(savedProfile || {}) };
  renderPlayerIdentity();
  return playerProfile;
}

async function savePlayerDisplayName(value) {
  if (!sb || !currentUser || !playerProfile) throw new Error('Choose your arcade initials first');
  const displayName = cleanDisplayName(value);
  if (displayName && Array.from(displayName).length < 2) throw new Error('Display name must contain 2 to 20 characters');
  const { data, error } = await sb.rpc('set_player_display_name', {
    p_display_name: displayName || null
  });
  if (error) throw error;
  const saved = Array.isArray(data) ? data[0] : data;
  playerProfile = { ...playerProfile, display_name: saved?.display_name || null };
  if (playerProfile.display_name) completeDisplayNameInvitation();
  renderPlayerIdentity();
  return playerProfile.display_name;
}

function getPendingScores() {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_SCORES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function savePendingScores(items) {
  localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(items.slice(-12)));
}

function queuePendingScore(payload) {
  if (!currentUser) return;
  const item = { playerId: currentUser.id, payload };
  const existingItems = getPendingScores();
  const previous = existingItems.find(existing =>
    existing.playerId === item.playerId &&
      existing.payload.p_game_mode === payload.p_game_mode &&
      existing.payload.p_control_method === payload.p_control_method
  );
  if (previous && previous.payload.p_score >= payload.p_score) return;
  const items = existingItems.filter(existing => !(
    existing.playerId === item.playerId &&
    existing.payload.p_game_mode === payload.p_game_mode &&
    existing.payload.p_control_method === payload.p_control_method
  ));
  items.push(item);
  savePendingScores(items);
}

function isSchemaError(error) {
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST205'].includes(error?.code);
}

async function sendBestScore(payload, { quiet = false, queueOnFailure = true } = {}) {
  if (!sb || !currentUser || !playerProfile) return false;
  if (!quiet) {
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Saving...';
  }
  try {
    const { data, error } = await sb.rpc('submit_best_score', payload);
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (payload.p_run_id === currentRunId) submittedThisRound = true;
    if (payload.p_run_id === currentRunId && result?.is_new_top) {
      recordTargetMethod = payload.p_control_method;
      launchRecordCelebration({ confirmed: true, previousTop: result.previous_top_score });
    }
    if (!quiet) {
      submitScoreBtn.textContent = result?.is_new_top
        ? 'World Record Saved!'
        : (result?.accepted ? 'New Best Saved!' : `Best: ${result?.personal_best ?? payload.p_score}`);
      scoreMethodLabel.textContent = result?.accepted
        ? `${playerDisplayName()} \u2022 ${result?.is_new_top ? 'new leaderboard #1' : `rank #${result?.leaderboard_rank ?? '—'}`}`
        : `${playerDisplayName()} \u2022 score did not beat your best`;
    }
    if (leaderboardOverlay.classList.contains('visible')) loadLeaderboard();
    return true;
  } catch (error) {
    console.warn('Best score submit failed:', error);
    if (isSchemaError(error)) {
      if (!quiet) {
        submitScoreBtn.textContent = 'Update Required';
        scoreMethodLabel.textContent = 'Leaderboard database update required';
      }
      return false;
    }
    if (queueOnFailure) queuePendingScore(payload);
    if (!quiet) {
      submitScoreBtn.textContent = 'Queued Offline';
      scoreMethodLabel.textContent = 'Saved on this device \u2022 will retry online';
    }
    return false;
  }
}

async function retryPendingScores() {
  if (!navigator.onLine || !sb || !currentUser || !playerProfile) return;
  const items = getPendingScores();
  if (!items.length) return;
  const keep = [];
  for (const item of items) {
    if (item.playerId !== currentUser.id) { keep.push(item); continue; }
    const sent = await sendBestScore(item.payload, { quiet: true, queueOnFailure: false });
    if (!sent) keep.push(item);
  }
  savePendingScores(keep);
}

function currentScorePayload() {
  return {
    p_score: score,
    p_theme: currentTheme,
    p_control_method: runControlMethod || controlMode,
    p_game_mode: runGameMode,
    p_run_id: currentRunId || createRunId()
  };
}

async function submitDailyAttempt() {
  if (!dailyAttempt?.ranked || dailyAttempt.submitted || !runReplay) return dailyAttempt?.result || null;
  const replayVerified = runReplay.localVerification === 'verified';
  if (!replayVerified) {
    scoreMethodLabel.textContent = 'Replay check failed • ranked result not submitted';
    scoreMethodLabel.classList.add('unranked');
    submitScoreBtn.textContent = 'Verification Failed';
    submitScoreBtn.disabled = true;
    return null;
  }

  submitScoreBtn.textContent = 'Verifying...';
  submitScoreBtn.disabled = true;
  try {
    const controlMethod = runUsesMixedControls ? 'mixed' : (runControlMethod || controlMode);
    const { data, error } = await sb.functions.invoke('submit-daily-attempt', {
      body: {
        attemptId: dailyAttempt.id,
        runToken: dailyAttempt.runToken,
        replay: runReplay,
        finalFoodMs: dailyLastFoodElapsedMs,
        controlMethod
      }
    });
    if (error) {
      let details = null;
      try { details = await error.context?.json(); } catch (_) {}
      throw new Error(details?.error || error.message || 'Daily submission failed');
    }
    if (!data?.verified) throw new Error(data?.error || 'Daily replay was not verified');
    dailyAttempt.submitted = true;
    dailyAttempt.result = data;
    dailyAttempt.attemptsRemaining = Number(data.attemptsRemaining) < 0
      ? -1
      : Math.max(0, Number(data.attemptsRemaining) || 0);
    if (dailyChallenge) dailyChallenge.attemptsRemaining = dailyAttempt.attemptsRemaining;
    renderDailyChallengeInfo();
    submittedThisRound = true;
    const rankText = data.leaderboardRank ? `rank #${data.leaderboardRank}` : 'rank pending';
    scoreMethodLabel.textContent = `Verified • ${rankText} • ${dailyAttemptsRemainingLabel(dailyChallenge)}`;
    scoreMethodLabel.classList.remove('unranked');
    submitScoreBtn.textContent = 'Verified';
    if (leaderboardOverlay.classList.contains('visible')) {
      loadDailyArchiveData({ force: true });
      loadLeaderboard();
    }
    return data;
  } catch (error) {
    console.warn('Daily attempt submission failed:', error);
    scoreMethodLabel.textContent = `${error.message || 'Submission failed'} • retry before the run token expires`;
    scoreMethodLabel.classList.add('unranked');
    submitScoreBtn.textContent = navigator.onLine ? 'Retry Submission' : 'Retry When Online';
    submitScoreBtn.disabled = !navigator.onLine;
    return null;
  }
}

async function prepareRunSubmission() {
  namePrompt.style.setProperty('display', 'flex', 'important');
  const promptLabel = namePrompt.querySelector('.np-label');
  if (runGameMode === 'daily') {
    const challenge = ensureDailyChallenge();
    const ranked = dailyAttempt?.ranked === true;
    promptLabel.textContent = ranked
      ? `Daily #${challenge.number} • ${dailyAttemptLabel(dailyAttempt.number)}`
      : `Daily #${challenge.number} • ${dailyAttempt?.preview ? 'Local preview' : 'Practice run'}`;
    nameInput.style.display = 'none';
    nameInput.disabled = true;
    const replayStatus = runReplay?.localVerification === 'verified' ? 'replay verified' : 'replay check failed';
    scoreMethodLabel.textContent = `${score} food${score === 1 ? '' : 's'} • final food ${formatDailyFoodTime(dailyLastFoodElapsedMs)} • ${replayStatus}${ranked ? '' : ' • unranked'}`;
    scoreMethodLabel.classList.toggle('unranked', runReplay?.localVerification !== 'verified');
    if (ranked) {
      await submitDailyAttempt();
    } else {
      submitScoreBtn.textContent = dailyAttempt?.preview ? 'Ranking Setup Required' : 'Practice Complete';
      submitScoreBtn.disabled = true;
      scoreMethodLabel.classList.add('unranked');
    }
    return;
  }
  if (runUsesMixedControls) {
    promptLabel.textContent = 'Score submission';
    nameInput.style.display = 'none';
    submitScoreBtn.textContent = 'Unranked';
    submitScoreBtn.disabled = true;
    return;
  }
  if (score < 1) {
    promptLabel.textContent = 'Score submission';
    nameInput.style.display = 'none';
    scoreMethodLabel.textContent = 'Score at least 1 point to enter the leaderboard';
    submitScoreBtn.textContent = 'No Score';
    submitScoreBtn.disabled = true;
    return;
  }
  await playerIdentityPromise;
  if (!playerProfile) {
    promptLabel.textContent = 'Choose initials to create your player';
    nameInput.style.display = '';
    nameInput.disabled = false;
    nameInput.value = '';
    submitScoreBtn.textContent = 'Save & Submit';
    submitScoreBtn.disabled = true;
    return;
  }
  promptLabel.textContent = playerDisplayName();
  nameInput.style.display = 'none';
  nameInput.disabled = true;
  submitScoreBtn.textContent = autoSubmitEnabled ? 'Saving...' : 'Submit Best';
  submitScoreBtn.disabled = autoSubmitEnabled;
  if (autoSubmitEnabled) await sendBestScore(currentScorePayload());
}

nameInput.addEventListener('input', () => {
  nameInput.value = cleanInitials(nameInput.value);
  submitScoreBtn.disabled = runUsesMixedControls || nameInput.value.length < 1;
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !runUsesMixedControls && nameInput.value.trim().length >= 1) submitScore();
});

async function submitScore() {
  if (runGameMode === 'daily') {
    await submitDailyAttempt();
    return;
  }
  if (!sb || submittedThisRound || runUsesMixedControls) return;
  await playerIdentityPromise;
  if (!playerProfile) {
    try {
      submitScoreBtn.disabled = true;
      submitScoreBtn.textContent = 'Creating...';
      await savePlayerInitials(nameInput.value);
    } catch (error) {
      submitScoreBtn.textContent = isSchemaError(error) ? 'Update Required' : 'Try Again';
      submitScoreBtn.disabled = false;
      scoreMethodLabel.textContent = error.message || 'Could not create player';
      return;
    }
  }
  await sendBestScore(currentScorePayload());
}

submitScoreBtn.addEventListener('click', submitScore);
window.addEventListener('online', retryPendingScores);

function openPlayerPanel({ focusDisplayName = false } = {}) {
  displayNameInviteSuppressedThisSession = true;
  displayNameInvite.hidden = true;
  setPlayerMessage('');
  renderPlayerIdentity();
  playerPanel.classList.add('visible');
  if (focusDisplayName) {
    requestAnimationFrame(() => {
      playerDisplayNameInput.focus({ preventScroll: true });
      playerDisplayNameInput.select();
    });
  }
}

function closePlayerPanel() {
  playerPanel.classList.remove('visible');
  renderDisplayNameInvitation();
}

playerBtn.addEventListener('click', () => openPlayerPanel());
displayNameInviteAdd.addEventListener('click', () => openPlayerPanel({ focusDisplayName: true }));
displayNameInviteLater.addEventListener('click', snoozeDisplayNameInvitation);

playerBack.addEventListener('click', closePlayerPanel);
playerPanel.addEventListener('click', event => {
  if (event.target === playerPanel) closePlayerPanel();
});

playerInitialsInput.addEventListener('input', () => {
  playerInitialsInput.value = cleanInitials(playerInitialsInput.value);
});

playerInitialsSave.addEventListener('click', async () => {
  playerInitialsSave.disabled = true;
  setPlayerMessage('Saving player...');
  try {
    await playerIdentityPromise;
    await savePlayerInitials(playerInitialsInput.value);
    playerInitialsInput.value = '';
    setPlayerMessage(`Player ${playerDisplayName()} created`);
    retryPendingScores();
  } catch (error) {
    setPlayerMessage(isSchemaError(error) ? 'Leaderboard database update required' : (error.message || 'Could not save initials'), true);
  } finally {
    playerInitialsSave.disabled = false;
  }
});

playerDisplayNameInput.addEventListener('input', () => {
  const caretAtEnd = playerDisplayNameInput.selectionStart === playerDisplayNameInput.value.length;
  playerDisplayNameInput.value = Array.from(
    playerDisplayNameInput.value.replace(/[<>\u0000-\u001f\u007f]/g, '')
  ).slice(0, 20).join('');
  if (caretAtEnd) {
    const end = playerDisplayNameInput.value.length;
    playerDisplayNameInput.setSelectionRange(end, end);
  }
});

playerDisplayNameSave.addEventListener('click', async () => {
  playerDisplayNameSave.disabled = true;
  setPlayerMessage('Saving public display name...');
  try {
    await playerIdentityPromise;
    const displayName = await savePlayerDisplayName(playerDisplayNameInput.value);
    if (currentUser) publicPlayerCardCache.delete(currentUser.id);
    setPlayerMessage(displayName
      ? `Display name saved as ${displayName}`
      : 'Public display name removed');
  } catch (error) {
    setPlayerMessage(isSchemaError(error)
      ? 'Display-name database update required'
      : (error.message || 'Could not save display name'), true);
  } finally {
    playerDisplayNameSave.disabled = false;
  }
});

autoSubmitToggle.addEventListener('change', () => {
  autoSubmitEnabled = autoSubmitToggle.checked;
  localStorage.setItem(AUTO_SUBMIT_KEY, String(autoSubmitEnabled));
  setPlayerMessage(autoSubmitEnabled ? 'Personal bests will submit automatically' : 'You will choose when to submit each score');
});

function validPlayerEmail() {
  const email = playerEmailInput.value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  return email;
}

async function beginEmailCode(action) {
  if (!sb?.auth) return;
  const email = validPlayerEmail();
  playerSaveEmail.disabled = true;
  playerRestoreEmail.disabled = true;
  setPlayerMessage('Sending an 8-digit code...');
  try {
    await playerIdentityPromise;
    if (action === 'save') {
      if (!currentUser || isPermanentPlayer()) throw new Error('This player is already saved');
      const { error } = await sb.auth.updateUser({ email });
      if (error) throw error;
      pendingOtpType = 'email_change';
    } else {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      pendingOtpType = 'email';
    }
    pendingOtpEmail = email;
    playerOtpInput.value = '';
    playerOtpGroup.classList.add('visible');
    setPlayerMessage(`Code sent to ${email}`);
    playerOtpInput.focus();
  } catch (error) {
    const fallback = action === 'save'
      ? 'Could not save this email. If it already has a player, use Restore Player.'
      : 'No saved player was found for that email.';
    setPlayerMessage(error.message || fallback, true);
  } finally {
    playerSaveEmail.disabled = false;
    playerRestoreEmail.disabled = false;
  }
}

playerSaveEmail.addEventListener('click', () => beginEmailCode('save'));
playerRestoreEmail.addEventListener('click', () => beginEmailCode('restore'));
playerOtpInput.addEventListener('input', () => {
  playerOtpInput.value = playerOtpInput.value.replace(/\D/g, '').slice(0, 8);
});

playerVerifyOtp.addEventListener('click', async () => {
  const token = playerOtpInput.value.trim();
  if (!pendingOtpEmail || token.length !== 8) {
    setPlayerMessage('Enter the complete 8-digit code', true);
    return;
  }
  playerVerifyOtp.disabled = true;
  setPlayerMessage('Verifying...');
  try {
    const { data, error } = await sb.auth.verifyOtp({
      email: pendingOtpEmail,
      token,
      type: pendingOtpType
    });
    if (error) throw error;
    playerIdentityPromise = syncPlayerSession(
      data?.session || (data?.user ? { user: data.user } : null)
    );
    await playerIdentityPromise;
    // Some mobile browsers persist the new auth session a task after OTP
    // verification. If the initial profile read raced that persistence, retry
    // once using the now-authoritative session rather than asking the player
    // to create initials that already belong to their restored account.
    if (!playerProfile && data?.user && sb?.auth?.getSession) {
      await new Promise(resolve => setTimeout(resolve, 0));
      const { data: currentSessionData, error: currentSessionError } = await sb.auth.getSession();
      const currentSession = currentSessionData?.session || null;
      if (!currentSessionError && currentSession?.user?.id === data.user.id) {
        playerIdentityPromise = syncPlayerSession(currentSession);
        await playerIdentityPromise;
      }
    }
    playerOtpGroup.classList.remove('visible');
    setPlayerMessage(playerProfile
      ? `Player ${playerDisplayName()} restored on this device`
      : 'Email verified. Choose initials to finish your player.');
  } catch (error) {
    setPlayerMessage(error.message || 'That code could not be verified', true);
  } finally {
    playerVerifyOtp.disabled = false;
  }
});

const publicPlayerCardCache = new Map();
let publicPlayerCardTrigger = null;
let publicPlayerCardRequestId = 0;

function leaderboardPlayerLabel(row) {
  const initials = row?.name || row?.initials || '---';
  return `${initials}${row?.player_code ? `\u00b7${row.player_code}` : ''}`;
}

function leaderboardPlayerIdentity(row) {
  const label = leaderboardPlayerLabel(row);
  if (!row?.player_id) return `<span>${escHtml(label)}</span>`;
  const playerId = escHtml(String(row.player_id));
  const safeLabel = escHtml(label);
  return `<button class="lb-player-link" type="button" data-player-id="${playerId}" data-player-label="${safeLabel}" aria-label="View player card for ${safeLabel}">${safeLabel}</button>`;
}

function hidePublicPlayerCard({ restoreFocus = true } = {}) {
  publicPlayerCardRequestId++;
  publicPlayerCardPanel.classList.remove('visible');
  publicPlayerCardPanel.setAttribute('aria-hidden', 'true');
  if (restoreFocus && publicPlayerCardTrigger?.isConnected) publicPlayerCardTrigger.focus();
  publicPlayerCardTrigger = null;
}

async function showPublicPlayerCard(playerId, trigger) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(playerId || '')) return;
  const requestId = ++publicPlayerCardRequestId;
  publicPlayerCardTrigger = trigger || null;
  publicPlayerCardName.textContent = 'Loading...';
  publicPlayerArcadeId.textContent = trigger?.dataset.playerLabel || '';
  publicPlayerCardMessage.textContent = 'Retrieving public player identity...';
  publicPlayerCardPanel.classList.add('visible');
  publicPlayerCardPanel.setAttribute('aria-hidden', 'false');
  publicPlayerCardClose.focus();

  try {
    let card = publicPlayerCardCache.get(playerId);
    if (!card) {
      if (!sb) throw new Error('Player cards are unavailable offline');
      const { data, error } = await sb.rpc('get_public_player_card', { p_player_id: playerId });
      if (error) throw error;
      card = Array.isArray(data) ? data[0] : data;
      if (!card) throw new Error('Player card unavailable');
      publicPlayerCardCache.set(playerId, card);
    }
    if (requestId !== publicPlayerCardRequestId) return;
    publicPlayerCardName.textContent = card.display_name || 'No Display Name Set';
    publicPlayerArcadeId.textContent = leaderboardPlayerLabel(card);
    publicPlayerCardMessage.textContent = card.display_name
      ? 'Public player identity'
      : 'This player has not added a public display name.';
  } catch (error) {
    if (requestId !== publicPlayerCardRequestId) return;
    publicPlayerCardName.textContent = 'Player Card Unavailable';
    publicPlayerCardMessage.textContent = isSchemaError(error)
      ? 'Player-card database update required'
      : (error.message || 'Could not load this player card');
  }
}

publicPlayerCardClose.addEventListener('click', () => hidePublicPlayerCard());
publicPlayerCardPanel.addEventListener('click', event => {
  if (event.target === publicPlayerCardPanel) hidePublicPlayerCard();
});
publicPlayerCardPanel.addEventListener('keydown', event => {
  if (event.key === 'Escape') hidePublicPlayerCard();
});
leaderboardOverlay.addEventListener('click', event => {
  const trigger = event.target.closest('.lb-player-link[data-player-id]');
  if (!trigger || !leaderboardOverlay.contains(trigger)) return;
  showPublicPlayerCard(trigger.dataset.playerId, trigger);
});

const dailyArchivePanel = document.createElement('section');
dailyArchivePanel.id = 'dailyArchivePanel';
dailyArchivePanel.hidden = true;
dailyArchivePanel.setAttribute('aria-label', 'Daily Run archive and records');
dailyArchivePanel.innerHTML = `
  <div class="daily-archive-nav">
    <button class="daily-day-btn" id="dailyDayPrev" type="button" aria-label="Older Daily Run">&#9664;</button>
    <div id="dailyArchiveHeading" aria-live="polite">Today</div>
    <button class="daily-day-btn" id="dailyDayNext" type="button" aria-label="Newer Daily Run">&#9654;</button>
  </div>
  <button id="dailyTodayBtn" type="button" hidden>Return to Today</button>
  <p id="dailyArchiveSummary"></p>
  <div id="dailyLegendsSection" hidden>
    <h3 class="daily-legends-title">Daily Legends</h3>
    <div id="dailyLegendCards"></div>
    <table class="lb-table" id="dailyLegendsTable">
      <thead><tr><th>#</th><th>Player</th><th>Wins</th><th>Best Streak</th><th>Podiums</th></tr></thead>
      <tbody id="dailyLegendsBody"></tbody>
    </table>
  </div>`;
leaderboardOverlay.querySelector('.lb-filter-group').insertAdjacentElement('afterend', dailyArchivePanel);
const dailyDayPrev = document.getElementById('dailyDayPrev');
const dailyDayNext = document.getElementById('dailyDayNext');
const dailyTodayBtn = document.getElementById('dailyTodayBtn');
const dailyArchiveHeading = document.getElementById('dailyArchiveHeading');
const dailyArchiveSummary = document.getElementById('dailyArchiveSummary');
const dailyLegendsSection = document.getElementById('dailyLegendsSection');
const dailyLegendCards = document.getElementById('dailyLegendCards');
const dailyLegendsTable = document.getElementById('dailyLegendsTable');
const dailyLegendsBody = document.getElementById('dailyLegendsBody');

const LB_PAGE_SIZE = 10;
const lbState = {
  gameMode: 'classic', control: 'all', theme: 'all', page: 0, total: 0, requestId: 0,
  dailyDate: currentUtcDateKey(), dailyDays: [], dailyStats: [], dailyArchiveLoaded: false,
  dailyArchiveError: false
};
let dailyArchiveCountdownTimer = null;

function formatDailyRunTimeLeft() {
  const now = new Date();
  const nextUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const totalSeconds = Math.max(0, Math.ceil((nextUtcDay - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function syncDailyArchiveCountdown() {
  clearInterval(dailyArchiveCountdownTimer);
  dailyArchiveCountdownTimer = null;
  const shouldRun = leaderboardOverlay.classList.contains('visible') &&
    lbState.gameMode === 'daily' && lbState.dailyDate === currentUtcDateKey();
  if (!shouldRun) return;
  dailyArchiveCountdownTimer = setInterval(() => {
    if (lbState.dailyDate !== currentUtcDateKey()) {
      renderDailyArchive();
      syncDailyArchiveCountdown();
      return;
    }
    renderDailyArchive();
  }, 1000);
}

function formatDailyArchiveDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC'
  }).format(date).toUpperCase();
}

function dailyArchiveMeta(dateKey = lbState.dailyDate) {
  return lbState.dailyDays.find(day => day.challenge_date === dateKey) || null;
}

function dailyStatsPlayerLabel(row) {
  return `${row.name || '---'}${row.player_code ? `\u00b7${row.player_code}` : ''}`;
}

function renderDailyLegends() {
  const stats = lbState.dailyStats || [];
  dailyLegendsSection.hidden = stats.length === 0;
  dailyLegendCards.innerHTML = '';
  dailyLegendsBody.innerHTML = '';
  if (!stats.length) return;

  const byWins = [...stats].sort((a, b) =>
    Number(b.wins) - Number(a.wins) ||
    Number(b.podiums) - Number(a.podiums) ||
    Number(b.days_played) - Number(a.days_played) ||
    dailyStatsPlayerLabel(a).localeCompare(dailyStatsPlayerLabel(b))
  );
  const byWinStreak = [...stats].sort((a, b) =>
    Number(b.longest_win_streak) - Number(a.longest_win_streak) || Number(b.wins) - Number(a.wins)
  );
  const byPlayStreak = [...stats].sort((a, b) =>
    Number(b.longest_play_streak) - Number(a.longest_play_streak) || Number(b.days_played) - Number(a.days_played)
  );
  const records = [
    ['Most Wins', byWins[0], `${Number(byWins[0].wins)} wins`],
    ['Win Streak', byWinStreak[0], `${Number(byWinStreak[0].longest_win_streak)} days`],
    ['Play Streak', byPlayStreak[0], `${Number(byPlayStreak[0].longest_play_streak)} days`]
  ];
  records.forEach(([label, row, value]) => {
    const card = document.createElement('div');
    card.className = 'daily-legend-card';
    card.innerHTML = `<span class="daily-legend-label">${escHtml(label)}</span><span class="daily-legend-player">${leaderboardPlayerIdentity(row)}</span><span class="daily-legend-value">${escHtml(value)}</span>`;
    dailyLegendCards.appendChild(card);
  });

  byWins.slice(0, 5).forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index === 0) tr.classList.add('top1');
    else if (index === 1) tr.classList.add('top2');
    else if (index === 2) tr.classList.add('top3');
    if (currentUser && row.player_id === currentUser.id) tr.classList.add('you');
    const you = currentUser && row.player_id === currentUser.id ? '<span class="lb-you-badge">YOU</span>' : '';
    tr.innerHTML = `<td class="lb-rank">${index + 1}</td><td>${leaderboardPlayerIdentity(row)}${you}</td><td>${Number(row.wins)}</td><td>${Number(row.longest_win_streak)}</td><td>${Number(row.podiums)}</td>`;
    dailyLegendsBody.appendChild(tr);
  });
}

function renderDailyArchive() {
  if (lbState.gameMode !== 'daily') return;
  const dateKey = lbState.dailyDate || currentUtcDateKey();
  const today = currentUtcDateKey();
  const meta = dailyArchiveMeta(dateKey);
  const isToday = dateKey === today;
  const challengeNumber = Number(meta?.challenge_number || (isToday ? dailyChallenge?.number : 0));
  const themeId = meta?.theme || (isToday ? dailyChallenge?.theme : null);
  const themeName = themeId && THEMES[themeId] ? THEMES[themeId].name : (themeId || 'Theme Pending');
  dailyArchiveHeading.textContent = `${formatDailyArchiveDate(dateKey)} • ${challengeNumber ? `CHALLENGE #${challengeNumber}` : 'DAILY RUN'} • ${themeName}`;
  dailyTodayBtn.hidden = isToday;

  if (lbState.dailyArchiveError) {
    dailyArchiveSummary.textContent = 'Archive update required in Supabase';
  } else if (isToday && meta?.winner_name) {
    const leader = leaderboardPlayerIdentity({
      name: meta.winner_name,
      player_code: meta.winner_player_code,
      player_id: meta.winner_player_id
    });
    const players = Number(meta.participant_count || 0);
    dailyArchiveSummary.innerHTML = `Current leader ${leader} • Score ${Number(meta.winning_score)} • ${players} player${players === 1 ? '' : 's'} • Ends in ${escHtml(formatDailyRunTimeLeft())}`;
  } else if (isToday) {
    const players = Number(meta?.participant_count || 0);
    dailyArchiveSummary.textContent = `Today's race is open • ${players} player${players === 1 ? '' : 's'} • Ends in ${formatDailyRunTimeLeft()}`;
  } else if (meta?.winner_name) {
    const winner = leaderboardPlayerIdentity({
      name: meta.winner_name,
      player_code: meta.winner_player_code,
      player_id: meta.winner_player_id
    });
    const players = Number(meta.participant_count || 0);
    dailyArchiveSummary.innerHTML = `Winner ${winner} • Score ${Number(meta.winning_score)} • ${players} player${players === 1 ? '' : 's'}`;
  } else {
    dailyArchiveSummary.textContent = 'No verified finishers';
  }

  const older = lbState.dailyDays.find(day => day.challenge_date < dateKey);
  const newer = [...lbState.dailyDays].reverse().find(day => day.challenge_date > dateKey);
  dailyDayPrev.disabled = !older;
  dailyDayNext.disabled = !newer;
  dailyDayPrev.dataset.date = older?.challenge_date || '';
  dailyDayNext.dataset.date = newer?.challenge_date || '';
  renderDailyLegends();
}

async function loadDailyArchiveData({ force = false } = {}) {
  if (!sb || (lbState.dailyArchiveLoaded && !force)) {
    renderDailyArchive();
    return;
  }
  const [daysResult, statsResult] = await Promise.all([
    sb.from('daily_leaderboard_days')
      .select('challenge_date, challenge_number, theme, participant_count, winner_name, winner_player_code, winner_player_id, winning_score, winning_final_food_ms')
      .order('challenge_date', { ascending: false })
      .limit(400),
    sb.from('daily_player_stats')
      .select('player_id, name, player_code, days_played, wins, podiums, top_tens, best_finish, win_rate_pct, current_play_streak, longest_play_streak, current_win_streak, longest_win_streak')
      .limit(500)
  ]);
  lbState.dailyArchiveError = !!daysResult.error || !!statsResult.error;
  if (!daysResult.error) lbState.dailyDays = daysResult.data || [];
  if (!statsResult.error) lbState.dailyStats = statsResult.data || [];
  lbState.dailyArchiveLoaded = !lbState.dailyArchiveError;

  const today = dailyChallenge?.date || currentUtcDateKey();
  if (!lbState.dailyDays.some(day => day.challenge_date === today)) {
    lbState.dailyDays.unshift({
      challenge_date: today,
      challenge_number: dailyChallenge?.number || null,
      theme: dailyChallenge?.theme || null,
      participant_count: 0
    });
  }
  lbState.dailyDays.sort((a, b) => b.challenge_date.localeCompare(a.challenge_date));
  renderDailyArchive();
}

async function prepareDailyLeaderboard() {
  await refreshDailyChallenge({ force: true });
  lbState.dailyDate = dailyChallenge?.date || currentUtcDateKey();
  await loadDailyArchiveData({ force: true });
  syncDailyArchiveCountdown();
  loadLeaderboard();
}

function selectDailyLeaderboardDate(dateKey) {
  if (!dateKey || dateKey === lbState.dailyDate) return;
  lbState.dailyDate = dateKey;
  lbState.page = 0;
  renderDailyArchive();
  syncDailyArchiveCountdown();
  loadLeaderboard();
}

function buildFilterGroup(container, values, stateKey, labelFor) {
  container.innerHTML = '';
  values.forEach(value => {
    const btn = document.createElement('button');
    const active = value === lbState[stateKey];
    btn.className = 'lb-filter' + (active ? ' active' : '');
    btn.textContent = labelFor(value);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      if (lbState[stateKey] === value) return;
      lbState[stateKey] = value;
      lbState.page = 0;
      container.querySelectorAll('.lb-filter').forEach(b => {
        const selected = b === btn;
        b.classList.toggle('active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      if (stateKey === 'gameMode') buildFilters();
      if (stateKey === 'gameMode' && value === 'daily') {
        prepareDailyLeaderboard();
      } else {
        loadLeaderboard();
      }
    });
    container.appendChild(btn);
  });
}

function buildFilters() {
  buildFilterGroup(
    lbGameModeFilters,
    ['classic', 'sprint', 'daily'],
    'gameMode',
    value => value === 'sprint' ? 'Sprint 60' : (value === 'daily' ? 'Daily Run' : 'Classic')
  );
  buildFilterGroup(
    lbControlFilters,
    ['all', 'dpad', 'turn', 'tap', 'keyboard'],
    'control',
    value => value === 'all' ? 'All' : CONTROL_LABELS[value]
  );
  buildFilterGroup(
    lbThemeFilters,
    ['all', ...Object.keys(THEMES)],
    'theme',
    value => value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)
  );
  const daily = lbState.gameMode === 'daily';
  dailyArchivePanel.hidden = !daily;
  lbControlFilters.closest('.lb-filter-group').hidden = daily;
  lbThemeFilters.closest('.lb-filter-group').hidden = daily;
  const themeHeading = lbTable.querySelector('th.lb-theme-col');
  if (themeHeading) themeHeading.textContent = daily ? 'Final Food' : 'Theme';
  if (daily) renderDailyArchive();
  syncDailyArchiveCountdown();
}

function updatePagination() {
  const pageCount = Math.max(1, Math.ceil(lbState.total / LB_PAGE_SIZE));
  lbPageInfo.textContent = `Page ${lbState.page + 1} of ${pageCount}`;
  lbPrev.disabled = lbState.page === 0;
  lbNext.disabled = lbState.page + 1 >= pageCount;
  lbPagination.style.display = lbState.total > 0 ? 'flex' : 'none';
}

async function loadLeaderboard() {
  if (!sb) {
    lbLoading.style.display = 'none';
    lbTable.style.display = 'none';
    lbPagination.style.display = 'none';
    lbEmpty.style.display = 'block';
    lbEmpty.textContent = 'Leaderboard unavailable';
    return;
  }
  const requestId = ++lbState.requestId;
  lbLoading.style.display = 'block';
  lbEmpty.style.display = 'none';
  lbTable.style.display = 'none';
  lbPagination.style.display = 'none';
  const from = lbState.page * LB_PAGE_SIZE;
  const to = from + LB_PAGE_SIZE - 1;
  const runQuery = columns => {
    let query = sb.from('leaderboard')
      .select(columns, { count: 'exact' })
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .range(from, to);
    query = query.eq('game_mode', lbState.gameMode);
    if (lbState.control !== 'all') query = query.eq('control_method', lbState.control);
    if (lbState.theme !== 'all') query = query.eq('theme', lbState.theme);
    return query;
  };
  const runOverallQuery = async () => {
    const rpcResult = await sb.rpc('get_overall_leaderboard', {
      p_game_mode: lbState.gameMode,
      p_theme: lbState.theme === 'all' ? null : lbState.theme,
      p_limit: LB_PAGE_SIZE,
      p_offset: from
    });
    const rows = Array.isArray(rpcResult.data) ? rpcResult.data : [];
    return {
      ...rpcResult,
      data: rows,
      count: rows.length > 0 ? Number(rows[0].total_count) : 0
    };
  };
  let result;
  if (lbState.gameMode === 'daily') {
    const challenge = dailyChallenge || ensureDailyChallenge();
    const leaderboardDate = lbState.dailyDate || challenge.date;
    result = await sb.from('daily_leaderboard')
      .select('challenge_date, name, player_code, player_id, score, final_food_ms, control_method, theme, attempt_number, completed_at, leaderboard_rank', { count: 'exact' })
      .eq('challenge_date', leaderboardDate)
      .order('leaderboard_rank', { ascending: true })
      .range(from, to);
  } else if (lbState.control === 'all') {
    result = await runOverallQuery();
  } else {
    result = await runQuery('name, score, theme, control_method, game_mode, created_at, player_id, player_code');
    if (['42703', 'PGRST204'].includes(result.error?.code)) {
      result = await runQuery('name, score, theme, control_method, game_mode, created_at');
    }
  }
  const { data, error, count } = result;
  if (requestId !== lbState.requestId) return;
  lbLoading.style.display = 'none';
  if (error || !data || data.length === 0) {
    lbEmpty.style.display = 'block';
    lbEmpty.textContent = error
      ? (isSchemaError(error)
          ? 'Leaderboard update required'
          : 'Failed to load')
      : (lbState.gameMode === 'daily' && lbState.dailyDate !== currentUtcDateKey()
          ? 'No ranked scores for this day.'
          : 'No scores yet. Be the first!');
    lbState.total = error ? 0 : (count || 0);
    updatePagination();
    return;
  }
  lbState.total = count ?? data.length;
  lbTable.style.display = 'table';
  lbBody.innerHTML = '';
  data.forEach((row, i) => {
    const rank = Number(row.leaderboard_rank) || from + i + 1;
    const tr = document.createElement('tr');
    if (rank === 1) tr.classList.add('top1');
    else if (rank === 2) tr.classList.add('top2');
    else if (rank === 3) tr.classList.add('top3');
    const isOwnRow = !!currentUser && row.player_id === currentUser.id;
    if (isOwnRow) tr.classList.add('you');
    const method = CONTROL_LABELS[row.control_method] || CONTROL_LABELS.legacy;
    const methodLabel = lbState.gameMode === 'daily' && row.attempt_number
      ? `TRY ${row.attempt_number} • ${method}`
      : method;
    const identity = leaderboardPlayerIdentity(row);
    const you = isOwnRow ? '<span class="lb-you-badge">YOU</span>' : '';
    const detail = lbState.gameMode === 'daily'
      ? formatDailyFoodTime(row.final_food_ms == null ? null : Number(row.final_food_ms))
      : escHtml(row.theme);
    tr.innerHTML = `<td class="lb-rank">${rank}</td><td>${identity}${you}<span class="lb-method-tag">${escHtml(methodLabel)}</span></td><td class="lb-theme-col">${detail}</td><td class="lb-score">${row.score}</td>`;
    lbBody.appendChild(tr);
  });
  updatePagination();
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showLeaderboard() {
  lbState.gameMode = gameMode;
  lbState.control = 'all';
  lbState.theme = 'all';
  lbState.page = 0;
  lbState.dailyDate = currentUtcDateKey();
  buildFilters();
  leaderboardOverlay.classList.add('visible');
  if (lbState.gameMode === 'daily') prepareDailyLeaderboard();
  else loadLeaderboard();
}

function hideLeaderboard() {
  leaderboardOverlay.classList.remove('visible');
  syncDailyArchiveCountdown();
}

lbBtn.addEventListener('click', showLeaderboard);
lbBack.addEventListener('click', hideLeaderboard);
dailyDayPrev.addEventListener('click', () => selectDailyLeaderboardDate(dailyDayPrev.dataset.date));
dailyDayNext.addEventListener('click', () => selectDailyLeaderboardDate(dailyDayNext.dataset.date));
dailyTodayBtn.addEventListener('click', () => selectDailyLeaderboardDate(currentUtcDateKey()));
lbPrev.addEventListener('click', () => {
  if (lbState.page === 0) return;
  lbState.page--;
  loadLeaderboard();
});
lbNext.addEventListener('click', () => {
  if ((lbState.page + 1) * LB_PAGE_SIZE >= lbState.total) return;
  lbState.page++;
  loadLeaderboard();
});

// --- Init ---
// iOS Safari and some embedded WebKit views occasionally omit the synthetic
// click after a touch. Forward the completed tap explicitly and suppress the
// duplicate trusted click when the browser does emit one.
let lastOverlayTouchButton = null;
let lastOverlayTouchTime = 0;

overlay.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (event.isTrusted && button === lastOverlayTouchButton && performance.now() - lastOverlayTouchTime < 700) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

overlay.addEventListener('touchend', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || !overlay.contains(button)) return;
  event.preventDefault();
  lastOverlayTouchButton = button;
  lastOverlayTouchTime = performance.now();
  button.click();
}, { passive: false });

dailyRulesBegin.addEventListener('click', () => {
  try { localStorage.setItem(DAILY_RULES_SEEN_KEY, '1'); } catch (_) {}
  hideDailyRules();
  startGame({ skipDailyRules: true });
});

dailyRulesLater.addEventListener('click', () => hideDailyRules({ restoreFocus: true }));
dailyRulesDialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') hideDailyRules({ restoreFocus: true });
});

startBtn.addEventListener('click', () => startGame());

shareBtn.addEventListener('click', async () => {
  const modeName = runGameMode === 'daily' ? `Daily #${ensureDailyChallenge().number}` : (runGameMode === 'sprint' ? 'Sprint 60' : 'Classic');
  const timing = runGameMode === 'daily' ? ` (final food ${formatDailyFoodTime(dailyLastFoodElapsedMs)})` : '';
  const text = `I scored ${score}${timing} in Snake ${modeName}! Can you beat me?\nhttps://chicoramon.github.io/snake-game/`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Snake Score', text }); } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="#4ecca3" style="vertical-align:middle;margin-right:4px"><path d="M6 11L2 7l1.4-1.4L6 8.2l6.6-6.6L14 3z"/></svg>Copied!';
      setTimeout(() => shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;margin-right:4px"><path d="M8 1L5 5h2v5h2V5h2L8 1zM2 11v3h12v-3h-2v1H4v-1H2z"/></svg>Share Score', 2000);
    } catch {}
  }
});

reset();
draw(1);

// Attach and render the core game first. Identity is an optional enhancement
// and may fail in restrictive mobile browsers or embedded web views.
setTimeout(startPlayerIdentity, 0);
