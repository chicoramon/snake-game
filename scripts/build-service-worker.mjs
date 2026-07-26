import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const templatePath = resolve(root, 'sw.js');
const outputPath = resolve(dist, 'sw.js');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return files.flat();
}

await mkdir(dist, { recursive: true });
await cp(templatePath, outputPath, { force: true });

const files = await listFiles(dist);
const precacheAssets = files
  .filter(path => path !== outputPath)
  .map(path => `./${relative(dist, path).split(sep).join('/')}`)
  .filter(path => !path.endsWith('.map'))
  .sort();

const template = await readFile(templatePath, 'utf8');
if (!template.includes('__VITE_PRECACHE_ASSETS__')) {
  throw new Error('sw.js is missing the __VITE_PRECACHE_ASSETS__ build placeholder.');
}

const builtWorker = template.replace(
  '__VITE_PRECACHE_ASSETS__',
  JSON.stringify(precacheAssets, null, 2)
);
await writeFile(outputPath, builtWorker);
console.log(`Generated service worker precache for ${precacheAssets.length} production assets.`);
