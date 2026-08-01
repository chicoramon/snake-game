export function createAnnouncerService({ getClient } = {}) {
  function requireClient() {
    const client = getClient?.();
    if (!client) throw new Error('Arcade Announcer service unavailable');
    return client;
  }

  async function call(name, payload) {
    const { data, error } = await requireClient().rpc(name, payload);
    if (error) throw error;
    // These RPCs return JSON arrays directly. A one-line catalog is still a
    // catalog, not a scalar row, so preserve the response shape verbatim.
    return data;
  }

  async function loadCatalog() {
    const data = await call('get_arcade_announcer_catalog');
    return Array.isArray(data) ? data : [];
  }

  async function loadHistory() {
    const data = await call('get_player_announcer_history');
    return Array.isArray(data) ? data : [];
  }

  async function recordImpression(line) {
    if (!line?.messageKey || !line?.familyKey) return false;
    await call('record_arcade_announcer_impression', {
      p_message_key: line.messageKey,
      p_family_key: line.familyKey
    });
    return true;
  }

  return { loadCatalog, loadHistory, recordImpression };
}
