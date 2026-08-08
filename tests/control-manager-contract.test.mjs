import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controlsSource = readFileSync(new URL('../src/controls/control-manager.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('control manager owns touch, keyboard, controller, TAP, and layout-edit bindings', () => {
  assert.match(controlsSource, /export function createControlManager/);
  assert.match(controlsSource, /canvas\.addEventListener\('touchstart'/);
  assert.match(controlsSource, /canvas\.addEventListener\('mousedown'/);
  assert.match(controlsSource, /document\.addEventListener\('keydown'/);
  assert.match(controlsSource, /window\.addEventListener\('gamepadconnected'/);
  assert.match(controlsSource, /registerControlMethod\('controller'\)/);
  assert.match(controlsSource, /createGamepadMenuNavigation/);
  assert.match(controlsSource, /gamepadMenuNavigation\.update\(gamepad\)/);
  assert.match(controlsSource, /if \(!\['dpad', 'turn', 'tap'\]\.includes\(mode\)\)/);
  assert.match(controlsSource, /controlsCustomizeBtn\.addEventListener\('click', startControlsEdit\)/);
});

test('main composes controls through explicit gameplay callbacks', () => {
  assert.match(mainSource, /createControlManager\(\{[\s\S]*?registerControlMethod,[\s\S]*?setDir,[\s\S]*?turnClockwise,[\s\S]*?turnCounterClockwise,[\s\S]*?togglePause,/);
  assert.match(mainSource, /onModeChange: mode => \{ controlMode = mode; \}/);
});

test('controls extraction does not absorb application bootstrap services', () => {
  assert.doesNotMatch(controlsSource, /SB_URL|supabase\.createClient|serviceWorker\.register/);
  assert.match(mainSource, /let sb = null;/);
  assert.match(mainSource, /createSupabaseClient\(\{/);
  assert.match(mainSource, /navigator\.serviceWorker\.register/);
  assert.match(mainSource, /import\.meta\.env\.PROD && 'serviceWorker' in navigator/);
  assert.match(mainSource, /import\.meta\.env\.DEV && 'serviceWorker' in navigator/);
});
