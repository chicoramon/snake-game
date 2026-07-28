function getAuthOrThrow(getClient) {
  const auth = getClient?.()?.auth;
  if (!auth) throw new Error('Player service unavailable');
  return auth;
}

export function createPlayerAuthService({ getClient } = {}) {
  async function getSession() {
    const auth = getAuthOrThrow(getClient);
    const { data, error } = await auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function getOrCreateSession() {
    const existingSession = await getSession();
    if (existingSession) return existingSession;
    const auth = getAuthOrThrow(getClient);
    const { data, error } = await auth.signInAnonymously();
    if (error) throw error;
    return data?.session || (data?.user ? { user: data.user } : null);
  }

  async function saveEmail(email) {
    const auth = getAuthOrThrow(getClient);
    const { error } = await auth.updateUser({ email });
    if (error) throw error;
  }

  async function sendRestoreCode(email) {
    const auth = getAuthOrThrow(getClient);
    const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw error;
  }

  async function verifyCode({ email, token, type }) {
    const auth = getAuthOrThrow(getClient);
    const { data, error } = await auth.verifyOtp({ email, token, type });
    if (error) throw error;
    return data?.session || (data?.user ? { user: data.user } : null);
  }

  function subscribe(callback) {
    const auth = getAuthOrThrow(getClient);
    if (typeof auth.onAuthStateChange !== 'function') return () => {};
    const { data } = auth.onAuthStateChange((_event, session) => callback(session));
    return () => data?.subscription?.unsubscribe?.();
  }

  return { getSession, getOrCreateSession, saveEmail, sendRestoreCode, verifyCode, subscribe };
}
