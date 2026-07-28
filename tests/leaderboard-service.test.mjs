import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeaderboardService } from '../src/leaderboard/leaderboard-service.js';

function createQuery(result) {
  const query = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'range']) query[method] = () => query;
  query.then = resolve => Promise.resolve(result).then(resolve);
  return query;
}

test('leaderboard service owns record, score, and public-card RPC requests', async () => {
  const calls = [];
  const service = createLeaderboardService({
    getClient: () => ({
      from: table => {
        calls.push({ type: 'from', table });
        return createQuery({ data: [{ score: 17 }], error: null });
      },
      rpc: async (name, args) => {
        calls.push({ type: 'rpc', name, args });
        if (name === 'get_public_player_card') return { data: [{ initials: 'RAM', player_code: 'C51B' }], error: null };
        return { data: [{ accepted: true }], error: null };
      }
    })
  });

  assert.equal(await service.fetchRecordTopScore('classic'), 17);
  assert.deepEqual(await service.submitBestScore({ p_score: 17 }), [{ accepted: true }]);
  assert.deepEqual(await service.fetchPublicPlayerCard('player-1'), { initials: 'RAM', player_code: 'C51B' });
  assert.deepEqual(calls.filter(call => call.type === 'rpc').map(call => call.name), [
    'submit_best_score', 'get_public_player_card'
  ]);
});

test('leaderboard service keeps Daily archive and overall leaderboard data requests outside the UI', async () => {
  const tables = [];
  const service = createLeaderboardService({
    getClient: () => ({
      from: table => {
        tables.push(table);
        return createQuery({ data: [], error: null, count: 0 });
      },
      rpc: async name => name === 'get_overall_leaderboard'
        ? { data: [{ total_count: 4, name: 'RAM' }], error: null }
        : { data: [], error: null }
    })
  });

  const archive = await service.loadDailyArchive();
  assert.equal(archive.daysResult.error, null);
  const page = await service.fetchPage({ gameMode: 'classic', control: 'all', theme: 'all', limit: 10, offset: 0 });
  assert.equal(page.count, 4);
  assert.deepEqual(tables, ['daily_leaderboard_days', 'daily_player_stats']);
});
