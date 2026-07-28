import { createAudioEngine } from './audio/audio-engine.js';
import { createControlManager } from './controls/control-manager.js';
import { createDailyRunService } from './daily/daily-run-service.js';
import { createLeaderboardService } from './leaderboard/leaderboard-service.js';
import { createSupabaseClient } from './services/supabase-client.js';
import { createPlayerAuthService } from './player/player-auth-service.js';
import { createPlayerProfileService } from './player/player-profile-service.js';
import { createThemePicker } from './ui/theme-picker.js';
import { createDailyRulesDialog } from './ui/daily-rules-dialog.js';
import { createWhatsNewDialog } from './ui/whats-new-dialog.js';
import { createPlayerPanel } from './ui/player-panel.js';
import { createPlayerIdentityController } from './player/player-identity-controller.js';
import { createLeaderboardController } from './ui/leaderboard-controller.js';
import { createGameController } from './game/game-controller.js';
import { createRunLifecycle } from './game/run-lifecycle.js';
import { createLiveGameSession } from './game/live-game-session.js';
import {
  SPRINT_DURATION_MS as MODE_SPRINT_DURATION_MS,
  formatTimedRunTime,
  createTimedRunState
} from './game/run-modes.js';
import { createCanvasRenderer } from './rendering/canvas-renderer.js';
import { drawFoodSprite as drawFoodSpriteAsset } from './rendering/food-sprite.js';
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
let themePicker = null;
let dailyRulesView = null;
let whatsNewView = null;
let playerPanelView = null;
let playerIdentityController = null;

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
const FORCE_WHATS_NEW = new URLSearchParams(location.search).has('whatsnew');
const DISPLAY_NAME_INVITE_KEY = 'snake_display_name_invite_v1';
const DISPLAY_NAME_INVITE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const DISPLAY_NAME_INVITE_MAX_DISMISSALS = 2;
let displayNameInviteSuppressedThisSession = false;

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
  return whatsNewView?.open({ suppressDisplayNameInvite });
}

function closeWhatsNew({ restoreFocus = true } = {}) {
  return whatsNewView?.close({ restoreFocus });
}

whatsNewView = createWhatsNewDialog({
  releases: WHATS_NEW_RELEASES,
  force: FORCE_WHATS_NEW,
  canOpen: () => !alive && !overlay.classList.contains('hidden'),
  onBeforeOpen: ({ suppressDisplayNameInvite }) => {
    if (suppressDisplayNameInvite) displayNameInviteSuppressedThisSession = true;
    displayNameInvite.hidden = true;
  },
  onAfterClose: renderDisplayNameInvitation
});
displayNameInviteSuppressedThisSession = FORCE_WHATS_NEW || !whatsNewView.hasSeenCurrentRelease();
whatsNewView.bind();
whatsNewView.scheduleInitialOpen();

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
window.addEventListener('resize', () => { resize(); if (alive) canvasRenderer.draw(1); });
// Also handle mobile URL bar show/hide (visualViewport)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => { resize(); if (alive) canvasRenderer.draw(1); });
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
const gameController = createGameController();
const runLifecycle = createRunLifecycle({ controller: gameController });
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

const canvasRenderer = createCanvasRenderer({
  ctx,
  cellSize: CELL,
  cols: COLS,
  rows: ROWS,
  canvasWidth: canvasW,
  canvasHeight: canvasH,
  foodSprites: FOOD_SPRITES,
  getGameState: () => ({
    snake,
    direction: dir,
    food,
    theme: THEMES[currentTheme],
    themeId: currentTheme,
    alive,
    paused
  })
});

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
  themePicker?.syncThemeSelection(themeSelection);
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
  // Update selected state in the extracted picker view.
  updateThemeSelectionUI();
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
  return dailyRunService.mapChallenge(row, { authoritative });
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
    const challenge = await dailyRunService.loadChallenge();
    if (requestId !== dailyChallengeRequest) return dailyChallenge;
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
  dailyRulesView?.show({ authoritative: dailyChallenge?.authoritative });
}

function hideDailyRules({ restoreFocus = false } = {}) {
  dailyRulesView?.hide({ restoreFocus });
}

function updateSprintTimer(force = false) {
  const second = Math.max(0, Math.ceil(sprintRemainingMs / 1000));
  if (!force && second === lastTimerSecond) return;
  lastTimerSecond = second;
  timerEl.textContent = formatTimedRunTime(sprintRemainingMs);
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
  themePicker?.syncModeSelection(mode);
}
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
  canvasRenderer.resetEffects();
  snake = SnakeCore.createInitialSnake(COLS, ROWS);
  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};
  runTick = 0;
  score = 0;
  speed = BASE_INTERVAL;
  alive = startingRun;
  paused = false;
  gameController.resetClock();
  const timedRun = createTimedRunState({
    mode: runGameMode,
    dailyDurationMs: dailyChallenge?.durationMs || MODE_SPRINT_DURATION_MS
  });
  sprintRemainingMs = timedRun.remainingMs;
  lastTimerSecond = 60;
  dailyTickElapsedMs = 0;
  dailyLastFoodElapsedMs = null;
  countdownActive = startingRun && isTimedMode(runGameMode);
  countdownRemainingMs = countdownActive ? timedRun.countdownMs : 0;
  countdownDisplay.textContent = countdownActive ? '3' : '';
  countdownDisplay.classList.toggle('visible', countdownActive);
  timerBlock.classList.toggle('visible', startingRun && isTimedMode(runGameMode));
  updateSprintTimer(true);
  scoreEl.textContent = 0;
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

// Rendering and visual effects live in ./rendering/canvas-renderer.js.
function gameTick() {
  if (!alive || paused) return;
  const appliedDirection = SnakeCore.acceptDirection(dir, nextDir);
  if (!SnakeCore.directionsEqual(dir, appliedDirection)) {
    SnakeCore.recordDirection(runReplay, runTick, appliedDirection);
  }
  dir = appliedDirection;
  runTick++;
  canvasRenderer.capturePreviousSnake(snake);
  canvasRenderer.recordMove(snake);
  const eatenFood = food;
  const nextState = SnakeCore.advanceState({ snake, direction: dir, food, score, speed, alive }, nextDir, {
    cols: COLS,
    rows: ROWS,
    baseInterval: BASE_INTERVAL,
    minInterval: MIN_INTERVAL,
    foodPlacement: runGameMode === 'daily' ? 'free-cells' : 'rejection'
  }, gameplayRandom);

  if (nextState.event === 'collision') {
    dir = nextState.direction;
    return die();
  }

  snake = nextState.snake;
  dir = nextState.direction;
  food = nextState.food;
  score = nextState.score;
  speed = nextState.speed;
  alive = nextState.alive;

  if (nextState.event === 'eat') {
    if (runGameMode === 'daily') dailyLastFoodElapsedMs = dailyTickElapsedMs;
    scoreEl.textContent = score;
    updateRecordChase();
    haptic('eat');
    AudioEngine.sfxEat();
    AudioEngine.updateTempo(snake.length);
    const T = THEMES[currentTheme];
    canvasRenderer.triggerFoodEat({ food: eatenFood, theme: T });
    if (score > best) {
      best = score;
      bestScores[runGameMode] = best;
      bestEl.textContent = best;
      const bestKey = runGameMode === 'daily'
        ? ensureDailyChallenge().bestKey
        : BEST_KEYS[runGameMode];
      localStorage.setItem(bestKey, best);
    }
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
  runLifecycle.finish({
    isActive: () => alive,
    markFinished: () => {
      alive = false;
      SnakeCore.finalizeReplay(runReplay, { tick: runTick, score, reason });
      if (runGameMode !== 'daily' || !runReplay) return;
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
    },
    finalize: () => {
      countdownActive = false;
      countdownDisplay.classList.remove('visible');
      haptic('die');
      AudioEngine.stop();
    },
    resolveOutcome: () => {
      if (reason === 'collision') {
        // Screen shake and the collision burst are owned by canvasRenderer.
        AudioEngine.sfxDie();
        canvasRenderer.triggerCollision({ snake, theme: THEMES[currentTheme] });
        return 600;
      }
      sprintRemainingMs = 0;
      updateSprintTimer(true);
      return 250;
    },
    showResult: () => showRunResult(reason)
  });
}

function die() {
  finishRun('collision');
}

const liveGameSession = createLiveGameSession({
  renderer: canvasRenderer,
  getState: () => ({
    alive,
    paused,
    countdownActive,
    countdownRemainingMs,
    runGameMode,
    dailyTickElapsedMs,
    sprintRemainingMs,
    speed
  }),
  onCountdownChange: remainingMs => {
    countdownRemainingMs = remainingMs;
    if (remainingMs > 0) countdownDisplay.textContent = String(Math.ceil(remainingMs / 1000));
  },
  onCountdownComplete: () => {
    countdownActive = false;
    countdownRemainingMs = 0;
    countdownDisplay.textContent = 'GO!';
    setTimeout(() => countdownDisplay.classList.remove('visible'), 350);
  },
  onSprintTimeChange: remainingMs => {
    sprintRemainingMs = remainingMs;
    updateSprintTimer();
  },
  onDailyElapsedChange: elapsedMs => { dailyTickElapsedMs = elapsedMs; },
  onTick: () => {
    canvasRenderer.capturePreviousSnake(snake);
    gameTick();
  },
  onFinish: finishRun,
  getDailyDuration: () => dailyChallenge?.durationMs || MODE_SPRINT_DURATION_MS,
  getFpsElement: () => document.getElementById('fps-counter')
});

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
  const reservation = await dailyRunService.reserveAttempt(dailyReservationRequestId);
  const reservedChallenge = reservation.challenge;
  dailyChallenge = reservedChallenge;
  bestScores.daily = parseInt(localStorage.getItem(reservedChallenge.bestKey), 10) || 0;
  dailyAttempt = reservation.attempt;
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
  runLifecycle.begin({
    prepare: () => {
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
    },
    reset: () => reset(true),
    afterReset: () => {
      if (runGameMode === 'daily') disableRecordChase();
      else beginRecordChase();
      AudioEngine.start();
    },
    frame: liveGameSession.frame
  });
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

// Frame progression is coordinated by ./game/live-game-session.js.
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
  if (paused) canvasRenderer.draw(1);
}
function togglePause() { setPaused(!paused); }
document.getElementById('pause-btn').addEventListener('click', togglePause);

// Pause as soon as the game stops being the active page. `pagehide` covers
// Safari's tab/background transitions, where `blur` is not always delivered
// before the page is suspended.
function pauseForInactivity() {
  if (!alive || paused) return;
  setPaused(true);
  // Drop any time already accumulated for the next simulation step. A
  // browser may have queued a frame immediately before it announced that the
  // tab lost focus; that frame must never turn into a late snake movement.
  gameController.resetClock();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') pauseForInactivity();
  gameController.resetClock();
}, { capture: true });
window.addEventListener('pagehide', pauseForInactivity, { capture: true });
// Safari can deliver `blur` before it updates `visibilityState`, and it may
// suspend the tab before a later lifecycle event is dispatched. Pause here
// synchronously rather than waiting for visibility to settle.
window.addEventListener('blur', pauseForInactivity, { capture: true });

// ============================================================
// 8-BIT CHIPTUNE ENGINE  —  Theme-aware, adaptive to snake length
// ============================================================
const AudioEngine = createAudioEngine({
  getCurrentTheme: () => THEMES[currentTheme],
  isRunActive: () => alive,
  isPaused: () => paused,
  getSnakeLength: () => snake?.length || 3,
});

const controls = createControlManager({
  canvas,
  dpad: document.getElementById('dpad'),
  turnControls: document.getElementById('turn-controls'),
  overlay,
  controlsBtn: document.getElementById('controls-btn'),
  controlsOverlay: document.getElementById('controls-edit-overlay'),
  controlsCustomizeBtn: document.getElementById('controls-customize-btn'),
  controlsBackBtn: document.getElementById('controls-back-btn'),
  controlsDoneBtn: document.getElementById('controls-done-btn'),
  controlsResetBtn: document.getElementById('controls-reset-btn'),
  initialMode: controlMode,
  onModeChange: mode => { controlMode = mode; },
  registerControlMethod,
  setDir,
  turnClockwise,
  turnCounterClockwise,
  togglePause,
  isRunActive: () => alive,
  isPaused: () => paused,
  isOverlayHidden: () => overlay.classList.contains('hidden'),
});

// --- Mute button ---
const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  const m = AudioEngine.toggleMute();
  muteBtn.innerHTML = m
    ? '<svg width="16" height="16" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="3" width="2" height="4"/><rect x="3" y="2" width="2" height="6"/><rect x="5" y="1" width="1" height="8"/><line x1="7" y1="3" x2="9" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="3" x2="7" y2="7" stroke="currentColor" stroke-width="1.2"/></svg> Muted'
    : '<svg width="16" height="16" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="3" width="2" height="4"/><rect x="3" y="2" width="2" height="6"/><rect x="5" y="1" width="1" height="8"/><rect x="7" y="3" width="1" height="4"/><rect x="9" y="2" width="1" height="6"/></svg> Music';
  muteBtn.classList.toggle('muted', m);
});

// --- Main menu theme/options view ---
themePicker = createThemePicker({
  themes: THEMES,
  themeIconUrls: THEME_ICON_URLS,
  drawFoodSprite: (spriteContext, cx, cy, cellSize, theme, scale, themeId) => {
    drawFoodSpriteAsset(spriteContext, cx, cy, cellSize, FOOD_SPRITES, scale, themeId);
  },
  onThemeSelected: theme => applyTheme(theme),
  onRandomSelected: selectRandomThemeMode,
  onModeSelected: mode => {
    applyGameMode(mode);
    // Daily Run starts with a deterministic offline preview. Selecting it
    // must always replace that preview with today's authoritative live state.
    if (mode === 'daily') refreshDailyChallenge({ force: true });
  }
});
themePicker.bind();
themePicker.syncThemeSelection(themeSelection);
themePicker.syncModeSelection(gameMode);

// --- Controls Customization ---
// --- PWA Setup ---
(function setupPWA() {
  // Deployable service worker: network-first pages with an offline fallback.
  // sw.js is a production template: the build step replaces its precache
  // placeholder with the current hashed assets. Vite's development server
  // intentionally serves that unprocessed template, so registering it here
  // would make the worker fail while evaluating.
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    }).catch(() => {});
    return;
  }

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
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
sb = createSupabaseClient({
  supabaseGlobal: window.supabase,
  url: SB_URL,
  anonKey: SB_KEY
});

const playerProfileService = createPlayerProfileService({ getClient: () => sb });
const playerAuthService = createPlayerAuthService({ getClient: () => sb });
const leaderboardService = createLeaderboardService({ getClient: () => sb });

const dailyRunService = createDailyRunService({
  getClient: () => sb,
  getUser: () => currentUser,
  getThemes: () => THEMES,
  getCurrentDate: currentUtcDateKey,
  boardCols: BOARD_COLS,
  boardRows: BOARD_ROWS,
  rulesetVersion: GAME_RULESET_VERSION,
  defaultDurationMs: SPRINT_DURATION_MS
});


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
  return leaderboardService.fetchRecordTopScore(mode);
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
let playerIdentityPromise = Promise.resolve();
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

function escHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

/* Legacy player identity implementation retained only as historical context during the extraction.
function legacyPlayerDisplayName(profile = playerProfile) {
  return profile ? `${profile.initials}\u00b7${profile.player_code}` : '';
}

function legacySetPlayerMessage(message, isError = false) {
  playerMessage.textContent = message;
  playerMessage.classList.toggle('error', isError);
}

function legacyIsPermanentPlayer() {
  return !!currentUser && currentUser.is_anonymous !== true;
}

function legacyRenderPlayerIdentity() {
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

async function legacyLoadPlayerProfile(user = currentUser, revision = playerIdentityRevision) {
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
    const data = await playerProfileService.loadProfile(user);
    if (revision !== playerIdentityRevision || currentUser?.id !== user.id) return null;
    if (data) playerProfile = data;
  } catch (error) {
    if (revision !== playerIdentityRevision || currentUser?.id !== user.id) return null;
    console.warn('Player profile unavailable:', error);
  }
  renderPlayerIdentity();
  return playerProfile;
}

async function legacySyncPlayerSession(session) {
  const revision = ++playerIdentityRevision;
  const user = session?.user || null;
  currentUser = user;
  await loadPlayerProfile(user, revision);
  if (revision !== playerIdentityRevision || currentUser?.id !== user?.id) return;
  retryPendingScores();
  if (gameMode === 'daily') refreshDailyChallenge({ force: true });
}

async function legacyInitPlayerIdentity() {
  renderPlayerIdentity();
  if (!sb?.auth) {
    playerIdentityStatus.textContent = 'Player service unavailable';
    return;
  }
  try {
    const session = await playerAuthService.getOrCreateSession();
    await syncPlayerSession(session);
  } catch (error) {
    console.warn('Player identity init failed:', error);
    playerIdentityStatus.textContent = 'Guest scores unavailable right now';
  }
}

let playerIdentityPromise = Promise.resolve();

function legacyStartPlayerIdentity() {
  try {
    playerIdentityPromise = Promise.resolve(initPlayerIdentity()).catch(error => {
      console.warn('Player identity startup failed:', error);
      playerIdentityStatus.textContent = 'Guest scores unavailable right now';
    });

    if (sb?.auth?.onAuthStateChange) {
      try {
        playerAuthService.subscribe(eventSession => {
          setTimeout(async () => {
            // Supabase may deliver an older INITIAL_SESSION callback after a
            // restore has already replaced it. Re-read the active session so
            // that stale callbacks cannot put the restored player back into a
            // temporary guest state.
            let activeSession;
            try { activeSession = await playerAuthService.getSession(); }
            catch { return; }
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

async function legacySavePlayerInitials(value) {
  const initials = cleanInitials(value);
  if (!initials || !sb || !currentUser) throw new Error('Enter 1 to 3 letters or numbers');
  const savedProfile = await playerProfileService.saveInitials(currentUser, initials);
  playerProfile = { ...(playerProfile || {}), ...(savedProfile || {}) };
  renderPlayerIdentity();
  return playerProfile;
}

async function legacySavePlayerDisplayName(value) {
  if (!sb || !currentUser || !playerProfile) throw new Error('Choose your arcade initials first');
  const displayName = cleanDisplayName(value);
  if (displayName && Array.from(displayName).length < 2) throw new Error('Display name must contain 2 to 20 characters');
  const saved = await playerProfileService.saveDisplayName(currentUser, displayName);
  playerProfile = { ...playerProfile, display_name: saved?.display_name || null };
  if (playerProfile.display_name) completeDisplayNameInvitation();
  renderPlayerIdentity();
  return playerProfile.display_name;
}

*/
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
    const data = await leaderboardService.submitBestScore(payload);
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
    if (leaderboardOverlay.classList.contains('visible')) leaderboardUi?.loadLeaderboard();
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
    const data = await dailyRunService.submitAttempt({
      attemptId: dailyAttempt.id,
      runToken: dailyAttempt.runToken,
      replay: runReplay,
      finalFoodMs: dailyLastFoodElapsedMs,
      controlMethod
    });
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
      leaderboardUi?.loadDailyArchiveData({ force: true });
      leaderboardUi?.loadLeaderboard();
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

/* Legacy player-panel handlers retained only as historical context during the extraction.
function legacyOpenPlayerPanel({ focusDisplayName = false } = {}) {
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

function legacyClosePlayerPanel() {
  playerPanel.classList.remove('visible');
  renderDisplayNameInvitation();
}

displayNameInviteLater.addEventListener('click', snoozeDisplayNameInvitation);

async function legacyHandleSavePlayerInitials(value) {
  playerInitialsSave.disabled = true;
  setPlayerMessage('Saving player...');
  try {
    await playerIdentityPromise;
    await savePlayerInitials(value);
    playerInitialsInput.value = '';
    setPlayerMessage(`Player ${playerDisplayName()} created`);
    retryPendingScores();
  } catch (error) {
    setPlayerMessage(isSchemaError(error) ? 'Leaderboard database update required' : (error.message || 'Could not save initials'), true);
  } finally {
    playerInitialsSave.disabled = false;
  }
}

async function legacyHandleSavePlayerDisplayName(value) {
  playerDisplayNameSave.disabled = true;
  setPlayerMessage('Saving public display name...');
  try {
    await playerIdentityPromise;
    const displayName = await savePlayerDisplayName(value);
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
}

function legacyHandleAutoSubmitChanged(enabled) {
  autoSubmitEnabled = enabled;
  localStorage.setItem(AUTO_SUBMIT_KEY, String(autoSubmitEnabled));
  setPlayerMessage(autoSubmitEnabled ? 'Personal bests will submit automatically' : 'You will choose when to submit each score');
}

function validPlayerEmail() {
  const email = playerEmailInput.value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address');
  return email;
}

async function legacyBeginEmailCode(action) {
  if (!sb?.auth) return;
  const email = validPlayerEmail();
  playerSaveEmail.disabled = true;
  playerRestoreEmail.disabled = true;
  setPlayerMessage('Sending an 8-digit code...');
  try {
    await playerIdentityPromise;
    if (action === 'save') {
      if (!currentUser || isPermanentPlayer()) throw new Error('This player is already saved');
      await playerAuthService.saveEmail(email);
      pendingOtpType = 'email_change';
    } else {
      await playerAuthService.sendRestoreCode(email);
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

async function legacyHandleVerifyPlayerOtp(token) {
  if (!pendingOtpEmail || token.length !== 8) {
    setPlayerMessage('Enter the complete 8-digit code', true);
    return;
  }
  playerVerifyOtp.disabled = true;
  setPlayerMessage('Verifying...');
  try {
    const session = await playerAuthService.verifyCode({
      email: pendingOtpEmail,
      token,
      type: pendingOtpType
    });
    playerIdentityPromise = syncPlayerSession(
      session
    );
    await playerIdentityPromise;
    // Some mobile browsers persist the new auth session a task after OTP
    // verification. If the initial profile read raced that persistence, retry
    // once using the now-authoritative session rather than asking the player
    // to create initials that already belong to their restored account.
    if (!playerProfile && session?.user && sb?.auth?.getSession) {
      await new Promise(resolve => setTimeout(resolve, 0));
      let currentSession = null;
      try { currentSession = await playerAuthService.getSession(); } catch {}
      if (currentSession?.user?.id === session.user.id) {
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
}

*/
playerIdentityController = createPlayerIdentityController({
  elements: {
    playerMenuLabel, playerIdentityStatus, playerProfileSetup, playerDisplaySetup,
    playerDisplayNameInput, playerAccountSetup, playerMessage, playerPanel,
    playerInitialsSave, playerInitialsInput, playerDisplayNameSave, playerEmailInput,
    playerSaveEmail, playerRestoreEmail, playerOtpInput, playerOtpGroup,
    playerVerifyOtp, displayNameInvite, displayNameInviteLater
  },
  getClient: () => sb,
  profileService: playerProfileService,
  authService: playerAuthService,
  getState: () => ({
    currentUser, playerProfile, playerIdentityRevision, playerIdentityPromise,
    pendingOtpEmail, pendingOtpType, autoSubmitEnabled,
    setDisplayNameInviteSuppressed: value => { displayNameInviteSuppressedThisSession = value; }
  }),
  setState: patch => {
    if ('currentUser' in patch) currentUser = patch.currentUser;
    if ('playerProfile' in patch) playerProfile = patch.playerProfile;
    if ('playerIdentityRevision' in patch) playerIdentityRevision = patch.playerIdentityRevision;
    if ('playerIdentityPromise' in patch) playerIdentityPromise = patch.playerIdentityPromise;
    if ('pendingOtpEmail' in patch) pendingOtpEmail = patch.pendingOtpEmail;
    if ('pendingOtpType' in patch) pendingOtpType = patch.pendingOtpType;
    if ('autoSubmitEnabled' in patch) autoSubmitEnabled = patch.autoSubmitEnabled;
  },
  cleanInitials,
  cleanDisplayName,
  escHtml,
  isSchemaError,
  onIdentitySettled: () => {
    retryPendingScores();
    if (gameMode === 'daily') refreshDailyChallenge({ force: true });
  },
  renderDisplayNameInvitation,
  completeDisplayNameInvitation,
  snoozeDisplayNameInvitation
});

function playerDisplayName(profile = playerProfile) { return playerIdentityController.playerDisplayName(profile); }
function setPlayerMessage(message, isError = false) { return playerIdentityController.setPlayerMessage(message, isError); }
function isPermanentPlayer() { return playerIdentityController.isPermanentPlayer(); }
function renderPlayerIdentity() { return playerIdentityController.render(); }
function startPlayerIdentity() { return playerIdentityController.start(); }
function savePlayerInitials(value) { return playerIdentityController.saveInitials(value); }
function savePlayerDisplayName(value) { return playerIdentityController.saveDisplayName(value); }
function openPlayerPanel(options) { return playerIdentityController.openPanel(options); }
function closePlayerPanel() { return playerIdentityController.closePanel(); }
function handleSavePlayerInitials(value) { return playerIdentityController.handleSaveInitials(value); }
function handleSavePlayerDisplayName(value) { return playerIdentityController.handleSaveDisplayName(value); }
function handleAutoSubmitChanged(enabled) { return playerIdentityController.handleAutoSubmitChanged(enabled); }
function beginEmailCode(action) { return playerIdentityController.beginEmailCode(action); }
function handleVerifyPlayerOtp(token) { return playerIdentityController.verifyOtp(token); }

playerPanelView = createPlayerPanel({
  cleanInitials,
  cleanDisplayName: value => Array.from(value.replace(/[<>\u0000-\u001f\u007f]/g, '')).slice(0, 20).join(''),
  onOpen: openPlayerPanel,
  onClose: closePlayerPanel,
  onSaveInitials: handleSavePlayerInitials,
  onSaveDisplayName: handleSavePlayerDisplayName,
  onAutoSubmitChanged: handleAutoSubmitChanged,
  onBeginEmailCode: beginEmailCode,
  onVerifyOtp: handleVerifyPlayerOtp
});
playerPanelView.bind();
// Keep the menu button independently wired so a blocked auth SDK can never
// prevent a player from opening the local identity panel.
playerBtn.addEventListener('click', () => openPlayerPanel());
document.addEventListener('click', event => {
  if (!event.target.closest('#player-btn')) return;
  playerPanel.classList.add('visible');
}, true);

/* Legacy leaderboard controller retained temporarily as source context during extraction.
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
      card = await leaderboardService.fetchPublicPlayerCard(playerId);
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
  const { daysResult, statsResult } = await leaderboardService.loadDailyArchive();
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
  const challenge = lbState.gameMode === 'daily' ? (dailyChallenge || ensureDailyChallenge()) : null;
  const result = await leaderboardService.fetchPage({
    gameMode: lbState.gameMode,
    control: lbState.control,
    theme: lbState.theme,
    date: lbState.dailyDate || challenge?.date,
    limit: LB_PAGE_SIZE,
    offset: from
  });
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

*/
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

dailyRulesView = createDailyRulesDialog({
  onBegin: () => {
    try { localStorage.setItem(DAILY_RULES_SEEN_KEY, '1'); } catch (_) {}
    hideDailyRules();
    startGame({ skipDailyRules: true });
  },
  onDismiss: () => hideDailyRules({ restoreFocus: true })
});
dailyRulesView.bind();
const leaderboardUi = createLeaderboardController({
  elements: {
    leaderboardOverlay, lbGameModeFilters, lbControlFilters, lbThemeFilters,
    lbBody, lbLoading, lbEmpty, lbTable, lbPagination, lbPrev, lbNext,
    lbPageInfo, lbBack, lbBtn, publicPlayerCardPanel, publicPlayerCardName,
    publicPlayerArcadeId, publicPlayerCardMessage, publicPlayerCardClose
  },
  leaderboardService,
  themes: THEMES,
  controls: CONTROL_LABELS,
  getState: () => ({ sb, currentUser, dailyChallenge, gameMode }),
  currentUtcDateKey,
  escHtml,
  isSchemaError,
  refreshDailyChallenge,
  ensureDailyChallenge,
  formatDailyFoodTime
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
canvasRenderer.draw(1);

// Attach and render the core game first. Identity is an optional enhancement
// and may fail in restrictive mobile browsers or embedded web views.
setTimeout(startPlayerIdentity, 0);
