import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validatorPath = path.join(root, 'supabase', 'functions', '_shared', 'daily-validator.mjs');
const edgePath = path.join(root, 'supabase', 'functions', 'submit-live-vs-result', 'index.ts');
const outputPath = path.join(root, 'supabase', 'dashboard', 'submit-live-vs-result-index.ts');

const validator = fs.readFileSync(validatorPath, 'utf8')
  .replace(/^export const /gm, 'const ')
  .replace(/^export function /gm, 'function ');
const edge = fs.readFileSync(edgePath, 'utf8');
const importLine = "import { validateSeededTimedReplay } from '../_shared/daily-validator.mjs';";

if (!edge.includes(importLine)) {
  throw new Error('Live Vs Edge Function no longer contains the expected validator import');
}

const dashboardSource = edge.replace(
  importLine,
  [
    '',
    '// Inlined for deployment through the Supabase Dashboard editor.',
    '// Canonical validator: ../functions/_shared/daily-validator.mjs',
    validator.trim(),
  ].join('\n')
);

fs.writeFileSync(outputPath, `${dashboardSource.trim()}\n`);
console.log(`Generated ${path.relative(root, outputPath)}.`);
