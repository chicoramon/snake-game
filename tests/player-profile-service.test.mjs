import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfileService } from '../src/player/player-profile-service.js';

const user = { id: 'player-1' };

test('player profile service reads preferences and falls back across older profile schemas', async () => {
  const requested = [];
  const client = {
    from: () => ({
      select: columns => ({
        eq: () => ({ maybeSingle: async () => {
          requested.push(columns);
          return columns.includes('preferences')
            ? { data: null, error: { code: '42703' } }
            : { data: { initials: 'RAM', player_code: 'A1B2', display_name: 'Ramy' }, error: null };
        } })
      })
    })
  };
  const service = createPlayerProfileService({ getClient: () => client });
  assert.deepEqual(await service.loadProfile(user), { initials: 'RAM', player_code: 'A1B2', display_name: 'Ramy' });
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

test('player profile service sends the versioned preferences payload', async () => {
  const calls = [];
  const preferences = { version: 1, controlMode: 'tap' };
  const service = createPlayerProfileService({ getClient: () => ({
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: preferences, error: null };
    }
  }) });
  assert.deepEqual(await service.savePreferences(user, preferences), preferences);
  assert.deepEqual(calls, [{
    name: 'set_player_preferences',
    args: { p_preferences: preferences }
  }]);
});
