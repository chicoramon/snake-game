const ROOM_CODE_PATTERN = /^[A-F0-9]{6}$/;

function throwIfError(result, fallback) {
  if (result?.error) throw result.error;
  if (!result?.data) throw new Error(fallback);
  return result.data;
}

export function normalizeRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6);
}

export function isValidRoomCode(value) {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

export function createLiveVsService({ supabase, getPlayerId, now = () => Date.now() } = {}) {
  let channel = null;
  let sequence = 0;
  let lastBroadcastAt = 0;

  function requireClient() {
    if (!supabase?.rpc) throw new Error('Live Vs is unavailable while player services are offline');
  }

  async function createRoom(theme) {
    requireClient();
    return throwIfError(
      await supabase.rpc('create_live_vs_room', { p_theme: theme }),
      'Could not create the Vs room'
    );
  }

  async function joinRoom(code) {
    requireClient();
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) throw new Error('Enter the six-character room code');
    return throwIfError(
      await supabase.rpc('join_live_vs_room', { p_room_code: normalized }),
      'Could not join the Vs room'
    );
  }

  async function getRoom(matchId) {
    requireClient();
    return throwIfError(
      await supabase.rpc('get_live_vs_room', { p_match_id: matchId }),
      'Vs room is no longer available'
    );
  }

  async function measureLatency(matchId) {
    const startedAt = now();
    const room = await getRoom(matchId);
    return {
      room,
      latencyMs: Math.max(0, Math.round(now() - startedAt))
    };
  }

  async function setReady(matchId, ready) {
    requireClient();
    return throwIfError(
      await supabase.rpc('set_live_vs_ready', { p_match_id: matchId, p_ready: !!ready }),
      'Could not update ready state'
    );
  }

  async function selectStage(matchId, themeChoice, locked = true) {
    requireClient();
    return throwIfError(
      await supabase.rpc('select_live_vs_stage', {
        p_match_id: matchId,
        p_theme_choice: themeChoice,
        p_locked: !!locked
      }),
      'Could not lock the Vs Casual stage'
    );
  }

  async function leaveRoom(matchId) {
    if (!supabase?.rpc || !matchId) return;
    const { error } = await supabase.rpc('leave_live_vs_room', { p_match_id: matchId });
    if (error) throw error;
  }

  async function disconnect() {
    const active = channel;
    channel = null;
    sequence = 0;
    lastBroadcastAt = 0;
    if (!active) return;
    try { await active.untrack?.(); } catch (_) {}
    try { await supabase?.removeChannel?.(active); } catch (_) {}
  }

  async function connect(matchId, {
    onRoomRefresh,
    onGhost,
    onLatency,
    onPresence,
    onStatus
  } = {}) {
    requireClient();
    await disconnect();
    const playerId = getPlayerId?.();
    if (!playerId) throw new Error('Player identity is still loading');
    if (supabase.realtime?.setAuth && supabase.auth?.getSession) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) await supabase.realtime.setAuth(token);
    }

    const topic = `vs:${matchId}`;
    channel = supabase.channel(topic, {
      config: {
        private: true,
        broadcast: { self: false, ack: false },
        presence: { key: playerId }
      }
    });

    channel
      .on('broadcast', { event: 'room-refresh' }, payload => onRoomRefresh?.(payload.payload))
      .on('broadcast', { event: 'ghost-state' }, payload => {
        const state = payload.payload;
        if (!state || state.playerId === playerId) return;
        onGhost?.({ ...state, receivedAt: now() });
      })
      .on('broadcast', { event: 'latency-state' }, payload => {
        const state = payload.payload;
        if (!state || state.playerId === playerId || state.matchId !== matchId) return;
        onLatency?.(state);
      })
      .on('presence', { event: 'sync' }, () => onPresence?.(channel.presenceState()))
      .subscribe(async status => {
        onStatus?.(status);
        if (status !== 'SUBSCRIBED') return;
        await channel.track({ playerId, onlineAt: new Date(now()).toISOString() });
      });

    return channel;
  }

  async function announceRoomRefresh(matchId) {
    if (!channel) return;
    await channel.send({
      type: 'broadcast',
      event: 'room-refresh',
      payload: { matchId, sentAt: now() }
    });
  }

  async function broadcastGhost({
    matchId,
    tick,
    snake,
    direction,
    food = null,
    score,
    remainingMs = 0,
    alive,
    force = false
  }) {
    if (!channel) return false;
    const timestamp = now();
    if (!force && timestamp - lastBroadcastAt < 100) return false;
    lastBroadcastAt = timestamp;
    sequence++;
    await channel.send({
      type: 'broadcast',
      event: 'ghost-state',
      payload: {
        matchId,
        playerId: getPlayerId?.(),
        sequence,
        tick,
        snake: snake.map(({ x, y }) => [x, y]),
        direction: [direction.x, direction.y],
        food: food ? [food.x, food.y] : null,
        score,
        remainingMs: Math.max(0, Math.round(Number(remainingMs) || 0)),
        alive,
        sentAt: timestamp
      }
    });
    return true;
  }

  async function broadcastLatency({ matchId, latencyMs }) {
    if (!channel) return false;
    const measured = Math.max(0, Math.min(9999, Math.round(Number(latencyMs) || 0)));
    await channel.send({
      type: 'broadcast',
      event: 'latency-state',
      payload: {
        matchId,
        playerId: getPlayerId?.(),
        latencyMs: measured,
        measuredAt: now()
      }
    });
    return true;
  }

  async function submitResult({ matchId, roundNumber, controlMethod, replay, finalFoodMs }) {
    if (!supabase?.functions?.invoke) throw new Error('Live Vs verification is unavailable');
    const { data, error } = await supabase.functions.invoke('submit-live-vs-result', {
      body: { matchId, roundNumber, controlMethod, replay, finalFoodMs }
    });
    if (error) {
      const functionStatus = Number(error?.context?.status);
      let message = error.message || 'Live Vs verification failed';
      try {
        const payload = await error.context?.json?.();
        if (payload?.error) message = payload.error;
      } catch (_) {}
      const failure = new Error(message);
      failure.status = Number.isFinite(functionStatus) ? functionStatus : null;
      throw failure;
    }
    return data;
  }

  return {
    createRoom,
    joinRoom,
    getRoom,
    measureLatency,
    setReady,
    selectStage,
    leaveRoom,
    connect,
    disconnect,
    announceRoomRefresh,
    broadcastGhost,
    broadcastLatency,
    submitResult
  };
}
