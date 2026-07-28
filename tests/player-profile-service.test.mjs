import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfileService } from '../src/player/player-profile-service.js';

const user = { id: 'player-1' };

test('player profile service reads a profile and falls back when display names are unavailable', async () => {
  const requested = [];
  const client = {
    from: () => ({
      select: columns => ({
        eq: () => ({ maybeSingle: async () => {
          requested.push(columns);
          return columns.includes('display_name')
            ? { data: null, error: { code: '42703' } }
            : { data: { initials: 'RAM', player_code: 'A1B2' }, error: null };
        } })
      })
    })
  };
  const service = createPlayerProfileService({ getClient: () => client });
  assert.deepEqual(await service.loadProfile(user), { initials: 'RAM', player_code: 'A1B2' });
  assert.equal(requested.length, 2);
});

test('player profile service sends initials and display-name RPC payloads', async () => {
  const calls = [];
  const service = createPlayerProfileService({ getClient: () => ({
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: [{ initials: 'RAM', display_name: args.p_display_name || null }], error: null };
    }
  }) });
  assert.equal((await service.saveInitials(user, 'RAM')).initials, 'RAM');
  assert.equal((await service.saveDisplayName(user, 'Ramy')).display_name, 'Ramy');
  assert.deepEqual(calls.map(call => call.name), ['set_player_initials', 'set_player_display_name']);
});
