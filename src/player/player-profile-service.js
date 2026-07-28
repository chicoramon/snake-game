function firstRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

export function createPlayerProfileService({ getClient } = {}) {
  function requireClient(user) {
    const client = getClient?.();
    if (!client || !user) throw new Error('Player session unavailable');
    return client;
  }

  async function loadProfile(user) {
    const client = requireClient(user);
    let result = await client.from('player_profiles')
      .select('initials, player_code, display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (['42703', 'PGRST204'].includes(result.error?.code)) {
      result = await client.from('player_profiles')
        .select('initials, player_code')
        .eq('id', user.id)
        .maybeSingle();
    }
    if (result.error && !['42P01', 'PGRST205'].includes(result.error.code)) throw result.error;
    return result.data || null;
  }

  async function saveInitials(user, initials) {
    const { data, error } = await requireClient(user).rpc('set_player_initials', { p_initials: initials });
    if (error) throw error;
    return firstRow(data) || null;
  }

  async function saveDisplayName(user, displayName) {
    const { data, error } = await requireClient(user).rpc('set_player_display_name', {
      p_display_name: displayName || null
    });
    if (error) throw error;
    return firstRow(data) || null;
  }

  return { loadProfile, saveInitials, saveDisplayName };
}
