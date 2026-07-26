import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readAppSource } from './app-source.mjs';

const html = readAppSource();
const serviceWorker = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const deployScript = fs.readFileSync(new URL('../deploy-gh-pages.ps1', import.meta.url), 'utf8');
const musicOverride = html.match(
  /Object\.assign\(THEMES\.streetfighter\.music,\s*\{([\s\S]*?)\n\}\);\s*\n\s*const savedThemeSelection/
)?.[1] || '';

test('Street Fighter uses its premium arena and fighter rendering', () => {
  assert.match(html, /boardPattern:\s*['"]kenstage['"],\s*snakeStyle:\s*['"]fighter['"]/);
  assert.match(html, /T\.boardPattern\s*===\s*['"]kenstage['"]/);
  assert.match(html, /T\.snakeStyle\s*===\s*['"]fighter['"]/);
  assert.match(html, /fighterImpactBurst\s*=\s*1/);
});

test('Street Fighter retains a complete fallback music arc', () => {
  assert.ok(musicOverride, 'premium Street Fighter music override is missing');
  assert.equal(
    (musicOverride.match(/buildMusicArc\(/g) || []).length,
    16,
    'bass, melody, arpeggio, and drums should each contain four music arcs'
  );
  assert.match(musicOverride, /baseBPM:\s*104/);
  assert.match(musicOverride, /maxBPM:\s*176/);
  assert.match(musicOverride, /minStepsPerIntensity:\s*64/);
  assert.match(musicOverride, /percussion:\s*['"]arcade-rock['"]/);
});

test('arcade-rock percussion remains explicitly 8-bit', () => {
  assert.match(html, /function playArcadeRockHit\(kind\)/);
  assert.match(html, /tom\.type\s*=\s*['"]square['"]/);
  assert.match(html, /m\.percussion\s*===\s*['"]arcade-rock['"]/);
});

test('the supplied Ken Stage MIDI remains a complete first fallback', () => {
  const midiPath = new URL('../audio themes/street_fighter_ii_-_ken.mid', import.meta.url);
  const midi = fs.readFileSync(midiPath);
  assert.match(musicOverride, /midiUrl:\s*['"]audio themes\/street_fighter_ii_-_ken\.mid['"]/);

  const functionStart = html.indexOf('function parseMidiFile(arrayBuffer)');
  const braceStart = html.indexOf('{', functionStart);
  let depth = 0;
  let functionEnd = -1;
  for (let index = braceStart; index < html.length; index++) {
    if (html[index] === '{') depth++;
    else if (html[index] === '}' && --depth === 0) {
      functionEnd = index + 1;
      break;
    }
  }
  const parserSource = html.slice(functionStart, functionEnd);
  const parseMidiFile = new Function(`${parserSource}; return parseMidiFile;`)();
  const buffer = midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength);
  const song = parseMidiFile(buffer);

  assert.equal(midi.subarray(0, 4).toString(), 'MThd');
  assert.equal(song.notes.length, 3208);
  assert.equal(Math.round(song.duration), 128);
  assert.match(html, /scheduleMidiPlayback\(m\)/);
});

test('the compressed recording is the native primary score', () => {
  const audio = fs.readFileSync(new URL('../assets/audio/ken-stage-96.mp3', import.meta.url));
  assert.match(musicOverride, /audioUrl:\s*['"]assets\/audio\/ken-stage-96\.mp3['"]/);
  assert.ok(audio.length < 1_200_000, 'web audio should remain below 1.2 MB');
  assert.match(html, /nativeThemeAudio\s*=\s*new Audio\(url\)/);
  assert.match(html, /nativeThemeAudio\.loop\s*=\s*true/);
  assert.match(html, /stopNativeThemeAudio\(false\)/);
});

test('the native audio and MIDI fallback are included in the versioned offline shell', () => {
  const packagingScript = fs.readFileSync(new URL('../scripts/package-static-assets.mjs', import.meta.url), 'utf8');
  const workerBuildScript = fs.readFileSync(new URL('../scripts/build-service-worker.mjs', import.meta.url), 'utf8');
  assert.match(serviceWorker, /CACHE_VERSION\s*=\s*['"]shell-v6['"]/);
  assert.match(serviceWorker, /PRECACHE_ASSETS\s*=\s*__VITE_PRECACHE_ASSETS__/);
  assert.match(packagingScript, /\['assets', 'assets'\]/);
  assert.match(packagingScript, /audio themes\/street_fighter_ii_-_ken\.mid/);
  assert.match(workerBuildScript, /__VITE_PRECACHE_ASSETS__/);
  assert.match(deployScript, /npm run build/);
});
