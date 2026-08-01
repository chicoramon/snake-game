const PENDING_KEY = 'snake_pending_career_runs_v1';
const MAX_PENDING_RUNS = 50;

function readQueue(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.playerId && item?.run?.runId) : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, key, queue) {
  try { storage?.setItem(key, JSON.stringify(queue.slice(-MAX_PENDING_RUNS))); } catch {}
}

export function createCareerStatsService({ getClient, storage = globalThis.localStorage, pendingKey = PENDING_KEY } = {}) {
  async function loadStats() {
    const client = getClient?.();
    if (!client) throw new Error('Career service unavailable');
    const { data, error } = await client.rpc('get_player_career_stats');
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function send(run) {
    const client = getClient?.();
    if (!client) throw new Error('Career service unavailable');
    const { data, error } = await client.rpc('submit_career_run', { p_run: run });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  function queue(playerId, run) {
    const pending = readQueue(storage, pendingKey).filter(item => item.run.runId !== run.runId);
    pending.push({ playerId, run });
    writeQueue(storage, pendingKey, pending);
  }

  async function recordRun({ user, profile, run } = {}) {
    if (!user?.id || !profile || !run?.runId) return { saved: false, skipped: true };
    try {
      const result = await send(run);
      return { saved: true, result };
    } catch (error) {
      queue(user.id, run);
      return { saved: false, queued: true, error };
    }
  }

  async function flush({ user, profile } = {}) {
    if (!user?.id || !profile) return { sent: 0, remaining: readQueue(storage, pendingKey).length };
    const pending = readQueue(storage, pendingKey);
    const remaining = [];
    let sent = 0;
    for (const item of pending) {
      if (item.playerId !== user.id) {
        remaining.push(item);
        continue;
      }
      try {
        await send(item.run);
        sent++;
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(storage, pendingKey, remaining);
    return { sent, remaining: remaining.length };
  }

  return { loadStats, recordRun, flush };
}
