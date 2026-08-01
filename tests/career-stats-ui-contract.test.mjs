import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/career-stats.css', import.meta.url), 'utf8');

test('Arcade Career is a dedicated player-facing cabinet screen', () => {
  assert.match(html, /id="player-career-btn"[\s\S]*?Arcade Career/);
  assert.match(html, /id="career-stats-panel"[\s\S]*?id="career-announcer-source"/);
  assert.match(html, /id="career-food-value"/);
  assert.match(html, /id="career-time-value"/);
  assert.match(html, /id="career-longest-value"/);
  assert.match(css, /\.career-transmission/);
  assert.match(css, /\.career-stat-grid/);
});

test('main composes career stats without placing data-fetching logic in the UI shell', () => {
  assert.match(main, /createCareerStatsPanel\(\{/);
  assert.match(main, /careerStatsService,/);
  assert.match(main, /announcerService,/);
  assert.doesNotMatch(main, /rpc\('get_player_career_stats'/);
});
