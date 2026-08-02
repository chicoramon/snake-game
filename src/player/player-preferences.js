export const PLAYER_PREFERENCES_VERSION = 1;

const GAME_MODES = new Set(['classic', 'sprint', 'daily']);
const CONTROL_MODES = new Set(['dpad', 'turn', 'tap']);
const DPAD_BUTTONS = ['up', 'down', 'left', 'right'];
const TURN_BUTTONS = ['ccw', 'cw'];

function cleanPosition(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  return {
    x: Math.max(-2000, Math.min(2000, Math.round(value.x))),
    y: Math.max(-2000, Math.min(2000, Math.round(value.y)))
  };
}

function cleanButtonGroup(value, buttonIds) {
  const result = {};
  for (const id of buttonIds) {
    const position = cleanPosition(value?.[id]);
    if (position) result[id] = position;
  }
  return result;
}

export function normalizePlayerPreferences(value, { themeIds = [] } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== PLAYER_PREFERENCES_VERSION) return null;

  const validThemes = new Set(themeIds.filter(id => id !== 'golden'));
  const themeSelection = value.themeSelection === 'random' || validThemes.has(value.themeSelection)
    ? value.themeSelection
    : 'default';
  const activeTheme = validThemes.has(value.activeTheme)
    ? value.activeTheme
    : (themeSelection === 'random' ? 'default' : themeSelection);

  return {
    version: PLAYER_PREFERENCES_VERSION,
    themeSelection,
    activeTheme,
    gameMode: GAME_MODES.has(value.gameMode) ? value.gameMode : 'classic',
    controlMode: CONTROL_MODES.has(value.controlMode) ? value.controlMode : 'dpad',
    backgroundMusicMuted: value.backgroundMusicMuted === true,
    gameMusicMuted: value.gameMusicMuted === true,
    autoSubmit: value.autoSubmit !== false,
    highSpeedEffects: value.highSpeedEffects !== false,
    controlLayout: {
      dpad: cleanButtonGroup(value.controlLayout?.dpad, DPAD_BUTTONS),
      turn: cleanButtonGroup(value.controlLayout?.turn, TURN_BUTTONS)
    }
  };
}
