import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseClient } from '../src/services/supabase-client.js';

test('Supabase client creation is safe when the browser SDK is unavailable', () => {
  assert.equal(createSupabaseClient({ supabaseGlobal: null }), null);
});

test('Supabase client creation returns a usable public client and contains startup failures', () => {
  const client = { auth: {} };
  assert.equal(createSupabaseClient({
    supabaseGlobal: { createClient: (url, key) => ({ ...client, url, key }) },
    url: 'https://example.supabase.co',
    anonKey: 'public-key'
  }).url, 'https://example.supabase.co');
  const warnings = [];
  assert.equal(createSupabaseClient({
    supabaseGlobal: { createClient: () => { throw new Error('offline'); } },
    onError: (...args) => warnings.push(args)
  }), null);
  assert.equal(warnings.length, 1);
});
