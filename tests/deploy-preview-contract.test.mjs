import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deployScript = readFileSync(new URL('../deploy-gh-pages.ps1', import.meta.url), 'utf8');
const previewScript = readFileSync(new URL('../deploy-preview.ps1', import.meta.url), 'utf8');
const deploymentDocs = readFileSync(new URL('../DEPLOYMENT.md', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const staticPackager = readFileSync(new URL('../scripts/package-static-assets.mjs', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../vite.config.mjs', import.meta.url), 'utf8');

test('preview deployment replaces only the preview folder on gh-pages', () => {
  assert.match(deployScript, /\[string\]\$TargetDirectory = ''/);
  assert.match(deployScript, /Remove-Item -LiteralPath \$publishPath -Recurse -Force/);
  assert.match(deployScript, /Copy-Item -Path \(Join-Path \$buildPath '\*'\) -Destination \$publishPath/);
  assert.match(previewScript, /-TargetDirectory 'preview'/);
  assert.match(deploymentDocs, /snake-game\/preview\//);
});

test('the web manifest remains at each deployment root', () => {
  assert.match(indexHtml, /id="app-manifest"/);
  assert.match(viteConfig, /root-web-manifest/);
  assert.match(viteConfig, /\$1\.\/manifest\.webmanifest/);
  assert.match(staticPackager, /\['manifest\.webmanifest', 'manifest\.webmanifest'\]/);
});
