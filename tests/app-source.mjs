import { readFileSync } from 'node:fs';

export function readAppSource() {
  return [
    readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/themes/catalog.js', import.meta.url), 'utf8'),
  ].join('\n');
}
