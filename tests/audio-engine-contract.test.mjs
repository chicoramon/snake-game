import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audioSource = readFileSync(new URL('../src/audio/audio-engine.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('audio engine is isolated behind explicit game-state and theme dependencies', () => {
  assert.match(audioSource, /export function createAudioEngine\(\{ getCurrentTheme, isRunActive, isPaused, getSnakeLength \}\)/);
  assert.doesNotMatch(audioSource, /THEMES\[currentTheme\]/);
  assert.doesNotMatch(audioSource, /\bsnake\s*\?/);
  assert.match(mainSource, /createAudioEngine\(\{[\s\S]*?getCurrentTheme: \(\) => THEMES\[currentTheme\],[\s\S]*?isRunActive: \(\) => alive,[\s\S]*?isPaused: \(\) => paused/);
});

test('audio engine retains mobile recovery and record-feedback hooks', () => {
  assert.match(audioSource, /document\.addEventListener\('visibilitychange'/);
  assert.match(audioSource, /document\.addEventListener\('pointerdown', wakeFromGesture/);
  assert.match(audioSource, /setRecordHeartbeat, stopRecordHeartbeat, playRecordFanfare/);
});
