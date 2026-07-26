import { cp, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');

const copyTargets = [
  ['assets', 'assets'],
  ['manifest.webmanifest', 'manifest.webmanifest'],
  ['snake-core.js', 'snake-core.js'],
  ['audio themes/street_fighter_ii_-_ken.mid', 'audio themes/street_fighter_ii_-_ken.mid']
];

await mkdir(dist, { recursive: true });

for (const [source, destination] of copyTargets) {
  const from = resolve(root, source);
  const to = resolve(dist, destination);
  const sourceStat = await stat(from);
  await mkdir(resolve(to, '..'), { recursive: true });
  await cp(from, to, { recursive: sourceStat.isDirectory(), force: true });
}

console.log('Packaged local game assets into dist/.');
