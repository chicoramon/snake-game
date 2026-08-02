import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlayerPreferences,
  PLAYER_PREFERENCES_VERSION
} from '../src/player/player-preferences.js';

const themeIds = ['default', 'mario', 'golden'];

test('player preferences preserve supported account choices and customized controls', () => {
  assert.deepEqual(normalizePlayerPreferences({
    version: PLAYER_PREFERENCES_VERSION,
    themeSelection: 'random',
    activeTheme: 'mario',
    gameMode: 'daily',
    controlMode: 'tap',
    backgroundMusicMuted: true,
    gameMusicMuted: false,
    autoSubmit: false,
    highSpeedEffects: false,
    controlLayout: {
      dpad: { up: { x: 12.4, y: -9.7 }, bogus: { x: 1, y: 2 } },
      turn: { cw: { x: 45, y: 60 } }
    }
  }, { themeIds }), {
    version: 1,
    themeSelection: 'random',
    activeTheme: 'mario',
    gameMode: 'daily',
    controlMode: 'tap',
    backgroundMusicMuted: true,
    gameMusicMuted: false,
    autoSubmit: false,
    highSpeedEffects: false,
    controlLayout: {
      dpad: { up: { x: 12, y: -10 } },
      turn: { cw: { x: 45, y: 60 } }
    }
  });
});

test('player preferences reject unknown versions and exclude the private golden theme', () => {
  assert.equal(normalizePlayerPreferences({ version: 2 }, { themeIds }), null);
  const normalized = normalizePlayerPreferences({
    version: 1,
    themeSelection: 'golden',
    activeTheme: 'golden'
  }, { themeIds });
  assert.equal(normalized.themeSelection, 'default');
  assert.equal(normalized.activeTheme, 'default');
  assert.equal(normalized.highSpeedEffects, true);
});
