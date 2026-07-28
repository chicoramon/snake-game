import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerAuthService } from '../src/player/player-auth-service.js';

test('player auth service creates an anonymous session only when needed', async () => {
  const calls = [];
  const service = createPlayerAuthService({
    getClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInAnonymously: async () => {
          calls.push('anonymous');
          return { data: { session: { user: { id: 'guest-1' } } }, error: null };
        }
      }
    })
  });
  const session = await service.getOrCreateSession();
  assert.equal(session.user.id, 'guest-1');
  assert.deepEqual(calls, ['anonymous']);
});

test('player auth service owns email-code transport and auth subscriptions', async () => {
  const calls = [];
  let callback;
  const service = createPlayerAuthService({
    getClient: () => ({
      auth: {
        updateUser: async value => { calls.push(['save', value]); return { error: null }; },
        signInWithOtp: async value => { calls.push(['restore', value]); return { error: null }; },
        verifyOtp: async value => ({ data: { session: { user: { id: value.email } } }, error: null }),
        onAuthStateChange: handler => {
          callback = handler;
          return { data: { subscription: { unsubscribe: () => calls.push(['unsubscribe']) } } };
        }
      }
    })
  });
  await service.saveEmail('ram@example.com');
  await service.sendRestoreCode('ram@example.com');
  assert.equal((await service.verifyCode({ email: 'ram@example.com', token: '12345678', type: 'email' })).user.id, 'ram@example.com');
  let observed = null;
  const unsubscribe = service.subscribe(session => { observed = session; });
  callback('SIGNED_IN', { user: { id: 'player-1' } });
  unsubscribe();
  assert.equal(observed.user.id, 'player-1');
  assert.deepEqual(calls, [
    ['save', { email: 'ram@example.com' }],
    ['restore', { email: 'ram@example.com', options: { shouldCreateUser: false } }],
    ['unsubscribe']
  ]);
});
