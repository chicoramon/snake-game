import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyCollision, createCareerRunTracker } from '../src/stats/career-run-tracker.js';
import { createCareerStatsService } from '../src/stats/career-stats-service.js';
import { createAnnouncerService } from '../src/stats/announcer-service.js';
import {
  buildAnnouncerCandidates,
  isAnnouncerConditionMet,
  renderAnnouncerTemplate,
  selectAnnouncerLine,
  selectCatalogAnnouncerLine
} from '../src/stats/arcade-announcer.js';
import { buildCareerViewModel, formatCareerDuration } from '../src/ui/career-stats-panel.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('career tracker records only active play and accepted movement', () => {
  const tracker = createCareerRunTracker();
  tracker.begin({ runId: 'run-1', mode: 'classic', theme: 'default', controlMethod: 'dpad' });
  tracker.addActiveTime(16.5);
  tracker.addActiveTime(-1);
  tracker.recordTurn();
  tracker.recordMove({ snakeLength: 3 });
  tracker.recordMove({ snakeLength: 4 });
  tracker.recordControlMethod('keyboard', { mixed: true });
  tracker.recordCollision('self');

  const result = tracker.finish({ score: 1, snakeLength: 4, reason: 'collision', mixedControls: true });
  assert.deepEqual(result, {
    version: 1,
    runId: 'run-1',
    mode: 'classic',
    theme: 'default',
    controlMethod: 'mixed',
    mixedControls: true,
    score: 1,
    activeMs: 17,
    distanceCells: 2,
    turns: 1,
    longestSnake: 4,
    finishReason: 'collision',
    collisionCause: 'self'
  });
  assert.equal(tracker.finish({ score: 99 }), null, 'a run can only be finalized once');
});

test('collision classification distinguishes walls from the snake body', () => {
  const snake = [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
  assert.equal(classifyCollision({ snake, direction: { x: -1, y: 0 }, cols: 4, rows: 4 }), 'wall');
  assert.equal(classifyCollision({ snake, direction: { x: 0, y: 1 }, cols: 4, rows: 4 }), 'self');
  assert.equal(classifyCollision({ snake, direction: { x: 1, y: 0 }, cols: 4, rows: 4 }), 'unknown');
});

test('career service queues a failed run and flushes it idempotently later', async () => {
  const storage = memoryStorage();
  let fail = true;
  const submitted = [];
  const service = createCareerStatsService({
    storage,
    getClient: () => ({
      rpc: async (_name, payload) => {
        if (fail) return { error: new Error('offline') };
        submitted.push(payload.p_run);
        return { data: { accepted: true }, error: null };
      }
    })
  });
  const identity = { user: { id: 'player-1' }, profile: { initials: 'RAM' } };
  const run = { runId: 'run-1', score: 4 };
  const queued = await service.recordRun({ ...identity, run });
  assert.equal(queued.queued, true);

  fail = false;
  const flushed = await service.flush(identity);
  assert.deepEqual(flushed, { sent: 1, remaining: 0 });
  assert.deepEqual(submitted, [run]);
});

test('career service caches live stats per player without leaking them to another identity', async () => {
  const storage = memoryStorage();
  const service = createCareerStatsService({
    storage,
    getClient: () => ({ rpc: async () => ({ data: { total_runs: 12, total_food: 44 }, error: null }) })
  });
  const user = { id: 'player-1' };
  assert.deepEqual(await service.loadStats({ user }), { total_runs: 12, total_food: 44 });
  assert.equal(service.loadCachedStats({ user }).total_food, 44);
  assert.equal(service.loadCachedStats({ user: { id: 'player-2' } }), null);
});

test('announcer service loads remote material and records restored-player history', async () => {
  const calls = [];
  const service = createAnnouncerService({
    getClient: () => ({
      rpc: async (name, payload) => {
        calls.push([name, payload]);
        if (name === 'get_arcade_announcer_catalog') return { data: [{ messageKey: 'fresh:1' }], error: null };
        if (name === 'get_player_announcer_history') return { data: [{ messageKey: 'old:1' }], error: null };
        return { data: null, error: null };
      }
    })
  });
  assert.deepEqual(await service.loadCatalog(), [{ messageKey: 'fresh:1' }]);
  assert.deepEqual(await service.loadHistory(), [{ messageKey: 'old:1' }]);
  assert.equal(await service.recordImpression({ messageKey: 'fresh:1', familyKey: 'fresh' }), true);
  assert.deepEqual(calls.at(-1), ['record_arcade_announcer_impression', {
    p_message_key: 'fresh:1',
    p_family_key: 'fresh'
  }]);
});

test('announcer output is deterministic and avoids recently used joke families', () => {
  const stats = {
    totalFood: 500,
    wallDeaths: 12,
    selfDeaths: 8,
    activeMs: 5_000_000,
    totalRuns: 60,
    distanceCells: 20_000,
    totalTurns: 4_000
  };
  const first = selectAnnouncerLine({ stats, seed: 'RAM:2026-08-01' });
  const repeated = selectAnnouncerLine({ stats, seed: 'RAM:2026-08-01' });
  assert.deepEqual(first, repeated);

  const next = selectAnnouncerLine({
    stats,
    seed: 'RAM:2026-08-01',
    now: Date.UTC(2026, 7, 1),
    history: [{ familyKey: first.familyKey, lastShownAt: '2026-07-31T00:00:00Z', cooldownDays: 30 }]
  });
  assert.notEqual(next.familyKey, first.familyKey);
  assert.ok(buildAnnouncerCandidates(stats).length >= 6);
});

test('new careers receive an inviting fallback instead of fabricated statistics', () => {
  const line = selectAnnouncerLine({ stats: {}, seed: 'new-player' });
  assert.equal(line.familyKey, 'welcome');
  assert.match(line.text, /ledger is open/i);
});

test('published announcer lines honor conditions, cooldowns, impression caps, and placeholders', () => {
  const stats = { total_food: 26560, active_ms: 3_780_000, total_runs: 80, favorite_theme: 'got' };
  const catalog = [
    {
      messageKey: 'food:feast', familyKey: 'food-feast', category: 'food',
      template: '{display_name} has secured {total_food} snacks in {active_ms}.',
      conditions: { metric: 'total_food', operator: 'gte', threshold: 1000 },
      weight: 2, cooldownDays: 30, maxImpressions: 3
    },
    {
      messageKey: 'daily:missing', familyKey: 'daily-win', category: 'daily',
      template: '{daily_wins} daily wins.',
      conditions: { metric: 'daily_wins', operator: 'gte', threshold: 0 },
      weight: 10, cooldownDays: 1
    }
  ];
  const selected = selectCatalogAnnouncerLine({
    catalog, stats, identity: { displayName: 'Ramy' }, seed: 'player-day', now: Date.UTC(2026, 7, 2)
  });
  assert.equal(selected.messageKey, 'food:feast');
  assert.match(selected.text, /Ramy has secured 26,560 snacks in 1\.1 hours/i);
  assert.equal(isAnnouncerConditionMet(catalog[1].conditions, stats), false, 'missing authoritative facts are not zero');

  const coolingDown = selectCatalogAnnouncerLine({
    catalog, stats, seed: 'player-day', now: Date.UTC(2026, 7, 2),
    history: [{ messageKey: 'food:feast', familyKey: 'food-feast', impressions: 1, lastShownAt: '2026-08-01T12:00:00Z' }]
  });
  assert.equal(coolingDown, null);

  const capped = selectCatalogAnnouncerLine({
    catalog, stats, seed: 'player-day', now: Date.UTC(2026, 9, 2),
    history: [{ messageKey: 'food:feast', familyKey: 'food-feast', impressions: 3, lastShownAt: '2026-08-01T12:00:00Z' }]
  });
  assert.equal(capped, null);
  assert.equal(renderAnnouncerTemplate('{favorite_theme}: {total_runs}', stats, { favoriteTheme: 'Game of Thrones' }), 'Game of Thrones: 80');
  assert.equal(
    renderAnnouncerTemplate('The cabinet was subjected to your will for {active_ms} milliseconds.', { active_ms: 300_000 }),
    'The cabinet was subjected to your will for 5 minutes.'
  );
});

test('career view model keeps the primary records compact and game-readable', () => {
  assert.equal(formatCareerDuration(3_780_000), '1H 3M');
  assert.deepEqual(buildCareerViewModel({
    total_food: 26560, active_ms: 3_780_000, total_runs: 81, distance_cells: 10400,
    longest_snake: 31, total_turns: 987, total_deaths: 44, wall_deaths: 12,
    self_deaths: 32, favorite_theme: 'got', favorite_control: 'turn'
  }, {
    themeName: id => id === 'got' ? 'Game of Thrones' : id,
    controlName: id => id.toUpperCase()
  }), {
    totalFood: 26560, activeMs: 3780000, totalRuns: 81, totalDeaths: 44,
    wallDeaths: 12, selfDeaths: 32, distanceCells: 10400, totalTurns: 987,
    longestSnake: 31, timedFinishes: 0, interruptedRuns: 0, dailyRuns: 0,
    dailyWins: 0, vsRounds: 0, vsWins: 0, favoriteTheme: 'got',
    favoriteControl: 'turn', trackingSince: null,
    totalFoodText: '26,560', activeTimeText: '1H 3M', totalRunsText: '81',
    distanceText: '10,400', longestSnakeText: '31', totalTurnsText: '987',
    totalDeathsText: '44', wallDeathsText: '12', selfDeathsText: '32',
    favoriteThemeText: 'Game of Thrones', favoriteControlText: 'TURN'
  });
});
