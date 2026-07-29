import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const audioSource = readFileSync(new URL('../src/audio/menu-audio.js', import.meta.url), 'utf8');
const gameAudioSource = readFileSync(new URL('../src/audio/audio-engine.js', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('../src/ui/onboarding-dialog.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const menuTrack = new URL('../assets/audio/snake-arcade-intro-96.mp3', import.meta.url);

test('menus and onboarding share the optimized arcade intro', () => {
  assert.match(audioSource, /snake-arcade-intro-96\.mp3/);
  assert.match(audioSource, /audio\.loop = true/);
  assert.match(audioSource, /audio\.playsInline = true/);
  assert.match(mainSource, /const MenuAudio = createMenuAudio\(\)/);
  assert.match(dialogSource, /menuAudio\?\.open\(\{ startNow: userInitiated \}\)/);
  assert.ok(statSync(menuTrack).size <= 450_000, 'optimized menu track should remain below 450 KB');
});

test('menu music is gesture-safe, mute-aware, and yields to gameplay music', () => {
  assert.match(dialogSource, /menuAudio\?\.unlock\(\)/);
  assert.match(indexSource, /id="music-controls"[\s\S]*id="bg-music-btn"[\s\S]*id="mute-btn"/);
  assert.match(mainSource, /snake_bg_music_muted/);
  assert.match(mainSource, /snake_game_music_muted/);
  assert.match(mainSource, /MenuAudio\.setMuted\(backgroundMusicMuted\)/);
  assert.match(mainSource, /AudioEngine\.setMuted\(gameMusicMuted\)/);
  assert.match(gameAudioSource, /musicGain\.gain\.setTargetAtTime\(muted \? 0 : nativeMusicDuck/);
  assert.doesNotMatch(gameAudioSource, /master\.gain\.value = muted/);
  assert.match(mainSource, /prepare: \(\) => \{\s*MenuAudio\.close\(\)/);
  assert.match(mainSource, /function showRunResult\(reason\) \{\s*MenuAudio\.open\(\)/);
});
