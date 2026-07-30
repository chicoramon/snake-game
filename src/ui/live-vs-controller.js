import { isValidRoomCode, normalizeRoomCode } from '../versus/live-vs-service.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function playerLabel(player) {
  const arcadeId = `${player?.initials || '---'}${player?.playerCode ? `·${player.playerCode}` : ''}`;
  return player?.displayName ? player.displayName : arcadeId;
}

function compactPlayerLabel(player) {
  return player?.initials || (player?.seat === 1 ? '1P' : '2P');
}

function formatRoundTime(milliseconds) {
  if (milliseconds == null) return 'NO FOOD';
  return `${(Math.max(0, Number(milliseconds)) / 1000).toFixed(2)}s`;
}

function inviteUrl(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('vs', code);
  return url.toString();
}

export function createLiveVsController({
  service,
  panel,
  openButton,
  closeButton,
  createButton,
  joinButton,
  codeInput,
  lobby,
  setup,
  roomCode,
  roomStatus,
  playerOne,
  playerTwo,
  readyButton,
  shareButton,
  message,
  latencyDiagnostics = false,
  getCurrentTheme,
  getPlayerId,
  ensurePlayer,
  onMatchStart,
  onGhost,
  onConnectionChange,
  onLatencyChange
} = {}) {
  let room = null;
  let pollTimer = null;
  let latencyTimer = null;
  let refreshPending = false;
  let startNotified = false;
  const latencyByPlayer = new Map();
  const roundNumber = panel.querySelector('#live-vs-round-number');
  const sessionScore = panel.querySelector('#live-vs-session-score');
  const drawCount = panel.querySelector('#live-vs-draw-count');
  const lastRoundPanel = panel.querySelector('#live-vs-last-round');
  const resultTitle = panel.querySelector('#live-vs-result-title');
  const hostResultName = panel.querySelector('#live-vs-host-result-name');
  const guestResultName = panel.querySelector('#live-vs-guest-result-name');
  const hostResultScore = panel.querySelector('#live-vs-host-result-score');
  const guestResultScore = panel.querySelector('#live-vs-guest-result-score');
  const hostResultTime = panel.querySelector('#live-vs-host-result-time');
  const guestResultTime = panel.querySelector('#live-vs-guest-result-time');
  const historyWrap = panel.querySelector('#live-vs-history-wrap');
  const historyList = panel.querySelector('#live-vs-history-list');
  const themeName = panel.querySelector('#live-vs-theme-name');

  function setMessage(text = '', error = false) {
    message.textContent = text;
    message.classList.toggle('error', error);
  }

  function myPlayer() {
    return room?.players?.find(player => player.playerId === getPlayerId?.()) || null;
  }

  function playerAtSeat(seat) {
    return room?.players?.find(player => player.seat === seat) || null;
  }

  function winsForSeat(seat) {
    return seat === 1 ? Number(room?.hostWins || 0) : Number(room?.guestWins || 0);
  }

  function renderPlayer(element, player, fallback) {
    const latency = player ? latencyByPlayer.get(player.playerId) : null;
    const wins = player ? winsForSeat(player.seat) : 0;
    const readyText = player?.ready ? 'READY' : (player ? 'STANDING BY' : 'SEARCHING');
    element.classList.toggle('empty', !player);
    element.classList.toggle('ready', !!player?.ready);
    element.classList.toggle('winner', !!player && !!room?.lastRound?.winnerPlayerId
      && room.lastRound.winnerPlayerId === player.playerId);
    element.innerHTML = player
      ? `<span class="live-vs-seat">PLAYER ${player.seat}</span>
         <strong>${escapeHtml(playerLabel(player))}</strong>
         <span class="live-vs-win-count">${wins} ${wins === 1 ? 'WIN' : 'WINS'}</span>
         <span class="live-vs-ready-state">${readyText}</span>
         ${latencyDiagnostics ? `<small>${latency == null ? 'PING --' : `PING ${latency} MS`}</small>` : ''}`
      : `<span class="live-vs-seat">PLAYER ${fallback.slice(-1)}</span>
         <strong>${fallback}</strong><span class="live-vs-ready-state">${readyText}…</span>`;
  }

  function resultHeading(lastRound) {
    if (!lastRound) return '';
    if (lastRound.outcome === 'draw') return `ROUND ${lastRound.roundNumber} DRAW`;
    if (lastRound.outcome === 'forfeit') return `ROUND ${lastRound.roundNumber} FORFEIT`;
    const winner = room.players?.find(player => player.playerId === lastRound.winnerPlayerId);
    return `${compactPlayerLabel(winner)} WINS ROUND ${lastRound.roundNumber}`;
  }

  function renderLastRound() {
    const last = room?.lastRound;
    const host = playerAtSeat(1);
    const guest = playerAtSeat(2);
    lastRoundPanel.hidden = !last;
    historyWrap.hidden = !(room?.recentRounds?.length > 1);
    if (!last) return;

    resultTitle.textContent = resultHeading(last);
    hostResultName.textContent = compactPlayerLabel(host);
    guestResultName.textContent = compactPlayerLabel(guest);
    hostResultScore.textContent = String(last.hostScore ?? 0);
    guestResultScore.textContent = String(last.guestScore ?? 0);
    hostResultTime.textContent = formatRoundTime(last.hostFinalFoodMs);
    guestResultTime.textContent = formatRoundTime(last.guestFinalFoodMs);
    lastRoundPanel.classList.toggle('you-won', last.winnerPlayerId === getPlayerId?.());
    lastRoundPanel.classList.toggle('you-lost', !!last.winnerPlayerId && last.winnerPlayerId !== getPlayerId?.());

    historyList.innerHTML = (room.recentRounds || []).slice(1).map(round => {
      const winner = room.players?.find(player => player.playerId === round.winnerPlayerId);
      const result = round.outcome === 'draw' ? 'DRAW' : `${compactPlayerLabel(winner)} WON`;
      return `<div><span>R${round.roundNumber}</span><b>${round.hostScore}–${round.guestScore}</b><em>${escapeHtml(result)}</em></div>`;
    }).join('');
  }

  function reportLatencies() {
    if (!latencyDiagnostics) return;
    const mineId = getPlayerId?.();
    const rival = room?.players?.find(player => player.playerId !== mineId);
    onLatencyChange?.({
      localMs: mineId ? latencyByPlayer.get(mineId) ?? null : null,
      rivalMs: rival ? latencyByPlayer.get(rival.playerId) ?? null : null
    });
  }

  function maybeStart() {
    if (startNotified || room?.status !== 'countdown' || !room.startsAt) return;
    startNotified = true;
    clearInterval(pollTimer);
    pollTimer = null;
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    onMatchStart?.(room);
  }

  function statusText(connected) {
    if (room.status === 'countdown') return 'Both fighters locked in — battle commencing!';
    if (room.status === 'complete') return 'Round verified. Ready up for the rematch!';
    if (connected < 2) return 'Arena open — send your rival the invite link.';
    return 'Both fighters connected. Choose when the battle begins.';
  }

  function renderRoom() {
    if (!room) return;
    setup.hidden = true;
    lobby.hidden = false;
    roomCode.textContent = room.code;
    roundNumber.textContent = `ROUND ${room.roundNumber || 1}`;
    sessionScore.textContent = `${room.hostWins || 0} — ${room.guestWins || 0}`;
    drawCount.textContent = Number(room.draws || 0)
      ? `${room.draws} ${Number(room.draws) === 1 ? 'DRAW' : 'DRAWS'}`
      : 'NO DRAWS';
    themeName.textContent = `${String(room.theme || 'default').replace(/[-_]/g, ' ').toUpperCase()} ARENA`;
    const connected = room.players?.length || 0;
    roomStatus.textContent = statusText(connected);
    renderPlayer(playerOne, playerAtSeat(1), 'PLAYER 1');
    renderPlayer(playerTwo, playerAtSeat(2), 'PLAYER 2');
    renderLastRound();

    const mine = myPlayer();
    const nextRound = Number(room.roundNumber || 1) + (room.status === 'complete' ? 1 : 0);
    readyButton.disabled = connected < 2 || !['waiting', 'complete'].includes(room.status);
    readyButton.textContent = mine?.ready
      ? 'Cancel Ready'
      : `${room.status === 'complete' ? 'Rematch' : 'Ready'} — Round ${nextRound}`;
    readyButton.classList.toggle('armed', !!mine?.ready);
    maybeStart();
  }

  async function refreshRoom() {
    if (!room?.id || refreshPending) return room;
    refreshPending = true;
    try {
      room = await service.getRoom(room.id);
      renderRoom();
      return room;
    } catch (error) {
      setMessage(error.message || 'Could not refresh room', true);
      return null;
    } finally {
      refreshPending = false;
    }
  }

  async function sampleLatency() {
    if (!latencyDiagnostics || !room?.id) return;
    try {
      const sample = await service.measureLatency(room.id);
      room = sample.room;
      const playerId = getPlayerId?.();
      if (playerId) latencyByPlayer.set(playerId, sample.latencyMs);
      renderRoom();
      reportLatencies();
      await service.broadcastLatency({ matchId: room.id, latencyMs: sample.latencyMs });
    } catch (_) {
      // The room refresh and connection-state handlers own visible failures.
    }
  }

  function beginPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(refreshRoom, 1500);
    clearInterval(latencyTimer);
    latencyTimer = latencyDiagnostics ? setInterval(sampleLatency, 2500) : null;
    if (latencyDiagnostics) sampleLatency();
  }

  async function enterRoom(nextRoom) {
    room = nextRoom;
    startNotified = false;
    latencyByPlayer.clear();
    setMessage();
    renderRoom();
    await service.connect(room.id, {
      onRoomRefresh: refreshRoom,
      onGhost,
      onLatency: latencyDiagnostics ? payload => {
        latencyByPlayer.set(payload.playerId, Math.max(0, Math.round(Number(payload.latencyMs) || 0)));
        renderRoom();
        reportLatencies();
      } : undefined,
      onPresence: presence => {
        onConnectionChange?.(presence);
        refreshRoom();
      },
      onStatus: status => {
        onConnectionChange?.(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setMessage('Battle link interrupted — reconnecting…', true);
        } else if (status === 'SUBSCRIBED') {
          setMessage('Battle link online');
        }
      }
    });
    beginPolling();
  }

  async function open() {
    if (!await ensurePlayer?.()) return;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    if (room) {
      renderRoom();
      beginPolling();
      return;
    }
    setup.hidden = false;
    lobby.hidden = true;
    closeButton.textContent = 'Back';
    setMessage('Create a battle room or enter a rival invite code.');
    codeInput.focus();
  }

  async function create() {
    if (!await ensurePlayer?.()) return;
    createButton.disabled = true;
    setMessage('Building battle arena…');
    try {
      await enterRoom(await service.createRoom(getCurrentTheme?.() || 'default'));
      closeButton.textContent = 'Leave Battle Room';
    } catch (error) {
      setMessage(error.message || 'Could not create room', true);
    } finally {
      createButton.disabled = false;
    }
  }

  async function join() {
    const code = normalizeRoomCode(codeInput.value);
    codeInput.value = code;
    if (!isValidRoomCode(code)) {
      setMessage('Enter the six-character room code', true);
      return;
    }
    if (!await ensurePlayer?.()) return;
    joinButton.disabled = true;
    setMessage('Entering battle room…');
    try {
      await enterRoom(await service.joinRoom(code));
      closeButton.textContent = 'Leave Battle Room';
    } catch (error) {
      setMessage(error.message || 'Could not join room', true);
    } finally {
      joinButton.disabled = false;
    }
  }

  async function openInvite(code) {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) return false;
    codeInput.value = normalized;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    setup.hidden = false;
    lobby.hidden = true;
    setMessage(`Invite ${normalized} detected — entering battle room…`);
    await join();
    return !!room;
  }

  async function toggleReady() {
    const mine = myPlayer();
    if (!room || !mine) return;
    readyButton.disabled = true;
    try {
      room = await service.setReady(room.id, !mine.ready);
      renderRoom();
      await service.announceRoomRefresh(room.id);
    } catch (error) {
      setMessage(error.message || 'Could not update ready state', true);
    } finally {
      if (room?.status !== 'countdown') {
        readyButton.disabled = (room?.players?.length || 0) < 2
          || !['waiting', 'complete'].includes(room?.status);
      }
    }
  }

  async function shareRoom() {
    if (!room?.code) return;
    const url = inviteUrl(room.code);
    const text = `Join my Snake Live Vs battle room ${room.code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Snake Live Vs', text, url });
        setMessage('Invite ready to send');
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Joinable invite link copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          setMessage('Joinable invite link copied');
        } catch (_) {
          setMessage(`Share this link: ${url}`);
        }
      }
    }
  }

  function returnToLobby(nextRoom) {
    if (nextRoom) room = nextRoom;
    if (!room) return;
    startNotified = false;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    closeButton.textContent = 'Leave Battle Room';
    setMessage('Round archived • room remains open');
    renderRoom();
    beginPolling();
  }

  async function close({ leave = true } = {}) {
    clearInterval(pollTimer);
    pollTimer = null;
    clearInterval(latencyTimer);
    latencyTimer = null;
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    if (leave && room?.id && !startNotified) {
      try { await service.leaveRoom(room.id); } catch (_) {}
      await service.disconnect();
      room = null;
    }
  }

  codeInput.addEventListener('input', () => {
    codeInput.value = normalizeRoomCode(codeInput.value);
  });
  codeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') join();
  });
  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', () => close());
  createButton.addEventListener('click', create);
  joinButton.addEventListener('click', join);
  readyButton.addEventListener('click', toggleReady);
  shareButton.addEventListener('click', shareRoom);

  return {
    open,
    openInvite,
    close,
    refreshRoom,
    returnToLobby,
    getRoom: () => room,
    isMatchActive: () => startNotified && !!room,
    disconnect: async () => {
      clearInterval(pollTimer);
      clearInterval(latencyTimer);
      pollTimer = null;
      latencyTimer = null;
      await service.disconnect();
    }
  };
}
