import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDailyRunService,
  outranksDailyLeader
} from '../src/daily/daily-run-service.js';

function createService(client) {
  return createDailyRunService({
    getClient: () => client,
    getUser: () => ({ id: 'player-1' }),
    getThemes: () => ({ default: {} }),
    getCurrentDate: () => '2026-07-28',
    boardCols: 20,
    boardRows: 32,
    rulesetVersion: 'snake-core-v1',
    defaultDurationMs: 60_000
  });
}

const challengeRow = {
  challenge_id: 12,
  challenge_date: '2026-07-28',
  challenge_number: 4,
  seed: 1234,
  theme: 'default',
  duration_ms: 60_000,
  board_cols: 20,
  board_rows: 32,
  ruleset_version: 'snake-core-v1',
  attempts_remaining: -1
};

test('Daily Run service maps and validates authoritative challenges', async () => {
  const service = createService({ rpc: async () => ({ data: [challengeRow], error: null }) });
  const challenge = await service.loadChallenge();
  assert.equal(challenge.date, '2026-07-28');
  assert.equal(challenge.attemptsRemaining, -1);
  assert.equal(challenge.bestKey, 'snake_daily_best_2026-07-28');
});

test('Daily Run service owns reservation and verified submission requests', async () => {
  const calls = [];
  const service = createService({
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data: [{ ...challengeRow, ranked: true, attempt_id: 'attempt-1', attempt_number: 7, run_token: 'token' }],
        error: null
      };
    },
    functions: {
      invoke: async (name, options) => {
        calls.push({ name, options });
        return { data: { verified: true, attemptsRemaining: -1 }, error: null };
      }
    }
  });
  const reservation = await service.reserveAttempt('request-1');
  assert.equal(reservation.attempt.number, 7);
  assert.equal(reservation.challenge.attemptsUsed, 7);
  const result = await service.submitAttempt({ attemptId: 'attempt-1' });
  assert.equal(result.verified, true);
  assert.deepEqual(calls.map(call => call.name), ['start_daily_attempt', 'submit-daily-attempt']);
});

test('Daily Run service reads the undisputed current leader across controls', async () => {
  const filters = [];
  const query = {
    select: () => query,
    eq: (column, value) => {
      filters.push([column, value]);
      return query;
    },
    limit: async () => ({ data: [{ score: 28, final_food_ms: 54_200 }], error: null })
  };
  const service = createService({
    from: table => {
      assert.equal(table, 'daily_leaderboard');
      return query;
    }
  });

  const leader = await service.fetchTopScore('2026-07-28');
  assert.deepEqual(leader, { score: 28, finalFoodMs: 54_200 });
  assert.deepEqual(filters, [
    ['challenge_date', '2026-07-28'],
    ['leaderboard_rank', 1]
  ]);
});

test('Daily ranking compares score first and final-food time second', () => {
  const leader = { score: 21, finalFoodMs: 56_740 };
  assert.equal(outranksDailyLeader({ score: 22, finalFoodMs: 59_000 }, leader), true);
  assert.equal(outranksDailyLeader({ score: 21, finalFoodMs: 55_900 }, leader), true);
  assert.equal(outranksDailyLeader({ score: 21, finalFoodMs: 56_740 }, leader), false);
  assert.equal(outranksDailyLeader({ score: 21, finalFoodMs: 57_000 }, leader), false);
  assert.equal(outranksDailyLeader({ score: 20, finalFoodMs: 40_000 }, leader), false);
});

test('Daily Run service preserves function error status for safe retry decisions', async () => {
  const service = createService({
    functions: {
      invoke: async () => ({
        data: null,
        error: {
          message: 'Function returned an error',
          context: {
            status: 503,
            json: async () => ({ error: 'Temporary verification outage' })
          }
        }
      })
    }
  });

  await assert.rejects(
    () => service.submitAttempt({ attemptId: 'attempt-1' }),
    error => error.message === 'Temporary verification outage' && error.status === 503
  );
});
