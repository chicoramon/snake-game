import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const audioSource = readFileSync(new URL('../src/replay/final-moments-audio.js', import.meta.url), 'utf8');
const playerSource = readFileSync(new URL('../src/replay/final-moments-player.js', import.meta.url), 'utf8');

test('Final Moments mixes its soundtrack and effects into the captured video stream', () => {
  assert.equal(existsSync(new URL('../assets/audio/final-moments-o-serpens.mp3', import.meta.url)), true);
  assert.match(audioSource, /createMediaStreamDestination\(\)/);
  assert.match(audioSource, /function scheduleHeartbeat\(progress\)/);
  assert.match(audioSource, /function playSonicBoom\(\)/);
  assert.match(audioSource, /function enterMenu\(\)/);
  assert.match(playerSource, /replayAudio\.enterMenu\(\)/);
  assert.match(playerSource, /\.\.\.audioStream\.getAudioTracks\(\)/);
  assert.match(playerSource, /renderer\.triggerSonicBoom/);
  assert.match(playerSource, /recordHeartbeatProgress/);
});
