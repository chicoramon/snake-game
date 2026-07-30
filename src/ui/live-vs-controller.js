import { isValidRoomCode, normalizeRoomCode } from '../versus/live-vs-service.js';

function playerLabel(player) {
  const arcadeId = `${player?.initials || '---'}${player?.playerCode ? `·${player.playerCode}` : ''}`;
  return player?.displayName ? `${player.displayName} (${arcadeId})` : arcadeId;
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
  getCurrentTheme,
  getPlayerId,
  ensurePlayer,
  onMatchStart,
  onGhost,
  onConnectionChange
} = {}) {
  let room = null;
  let pollTimer = null;
  let refreshPending = false;
  let startNotified = false;

  function setMessage(text = '', error = false) {
    message.textContent = text;
    message.classList.toggle('error', error);
  }

  function myPlayer() {
    return room?.players?.find(player => player.playerId === getPlayerId?.()) || null;
  }

  function renderPlayer(element, player, fallback) {
    element.classList.toggle('empty', !player);
    element.innerHTML = player
      ? `<strong>${playerLabel(player)}</strong><span>${player.ready ? 'READY!' : 'NOT READY'}</span>`
      : `<strong>${fallback}</strong><span>WAITING…</span>`;
  }

  function maybeStart() {
    if (startNotified || room?.status !== 'countdown' || !room.startsAt) return;
    startNotified = true;
    clearInterval(pollTimer);
    pollTimer = null;
    panel.classList.remove('visible');
    onMatchStart?.(room);
  }

  function renderRoom() {
    if (!room) return;
    setup.hidden = true;
    lobby.hidden = false;
    roomCode.textContent = room.code;
    const connected = room.players?.length || 0;
    roomStatus.textContent = room.status === 'countdown'
      ? 'Both players ready — battle commencing!'
      : `${connected}/2 fighters connected`;
    renderPlayer(playerOne, room.players?.find(player => player.seat === 1), 'PLAYER 1');
    renderPlayer(playerTwo, room.players?.find(player => player.seat === 2), 'PLAYER 2');
    const mine = myPlayer();
    readyButton.disabled = connected < 2 || room.status === 'countdown';
    readyButton.textContent = mine?.ready ? 'Cancel Ready' : 'Ready!';
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

  async function enterRoom(nextRoom) {
    room = nextRoom;
    startNotified = false;
    setMessage();
    renderRoom();
    await service.connect(room.id, {
      onRoomRefresh: refreshRoom,
      onGhost,
      onPresence: presence => {
        onConnectionChange?.(presence);
        refreshRoom();
      },
      onStatus: status => {
        onConnectionChange?.(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setMessage('Realtime link interrupted — reconnecting…', true);
        } else if (status === 'SUBSCRIBED') {
          setMessage('Realtime link established');
        }
      }
    });
    clearInterval(pollTimer);
    pollTimer = setInterval(refreshRoom, 1500);
  }

  async function open() {
    if (!await ensurePlayer?.()) return;
    setup.hidden = false;
    lobby.hidden = true;
    setMessage('Create a private room or enter a rival code.');
    panel.classList.add('visible');
    codeInput.focus();
  }

  async function create() {
    if (!await ensurePlayer?.()) return;
    createButton.disabled = true;
    setMessage('Forging arena…');
    try {
      await enterRoom(await service.createRoom(getCurrentTheme?.() || 'default'));
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
    setMessage('Entering arena…');
    try {
      await enterRoom(await service.joinRoom(code));
    } catch (error) {
      setMessage(error.message || 'Could not join room', true);
    } finally {
      joinButton.disabled = false;
    }
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
      if (room?.status !== 'countdown') readyButton.disabled = (room?.players?.length || 0) < 2;
    }
  }

  async function shareRoom() {
    if (!room?.code) return;
    const text = `Join my Snake Live Vs room: ${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Snake Live Vs', text });
      else await navigator.clipboard.writeText(room.code);
      setMessage(navigator.share ? 'Invite opened' : 'Room code copied');
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Share the room code shown above');
    }
  }

  async function close({ leave = true } = {}) {
    clearInterval(pollTimer);
    pollTimer = null;
    panel.classList.remove('visible');
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
    close,
    refreshRoom,
    getRoom: () => room,
    isMatchActive: () => startNotified && !!room,
    disconnect: service.disconnect
  };
}

