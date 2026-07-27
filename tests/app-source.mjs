import { readFileSync } from 'node:fs';

export function readAppSource() {
  return [
    readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/audio/audio-engine.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/controls/control-manager.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/game/game-controller.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/game/run-lifecycle.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/rendering/canvas-renderer.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/themes/catalog.js', import.meta.url), 'utf8'),
  ].join('\n');
}
