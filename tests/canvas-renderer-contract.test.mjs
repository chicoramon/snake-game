import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rendererSource = readFileSync(new URL('../src/rendering/canvas-renderer.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('canvas renderer owns drawing and transient visual effects behind an explicit API', () => {
  assert.match(rendererSource, /export function createCanvasRenderer/);
  assert.match(rendererSource, /function triggerFoodEat/);
  assert.match(rendererSource, /function triggerCollision/);
  assert.match(rendererSource, /function drawFrame/);
  assert.match(rendererSource, /function hasActiveEffects/);
  assert.match(rendererSource, /foodSprites/);
});

test('main drives canvas effects through renderer events and state snapshots', () => {
  assert.match(mainSource, /const canvasRenderer = createCanvasRenderer/);
  assert.match(mainSource, /getGameState: \(\) => \(\{[\s\S]*?theme: THEMES\[currentTheme\]/);
  assert.match(mainSource, /canvasRenderer\.recordMove\(snake\)/);
  assert.match(mainSource, /canvasRenderer\.triggerFoodEat\(\{ food, theme: T \}\)/);
  assert.match(mainSource, /canvasRenderer\.triggerCollision\(\{ snake, theme: THEMES\[currentTheme\] \}\)/);
  assert.match(mainSource, /canvasRenderer\.draw\(interp\)/);
});
