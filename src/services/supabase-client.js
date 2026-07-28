export function createSupabaseClient({ supabaseGlobal, url, anonKey, onError = console.warn } = {}) {
  try {
    if (!supabaseGlobal || typeof supabaseGlobal.createClient !== 'function') return null;
    return supabaseGlobal.createClient(url, anonKey);
  } catch (error) {
    onError('Supabase init failed:', error);
    return null;
  }
}
