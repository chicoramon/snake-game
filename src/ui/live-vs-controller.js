import { isValidRoomCode, normalizeRoomCode } from '../versus/live-vs-service.js';
import {
  liveVsFormatLabel,
  normalizeLiveVsRoomSettings
} from '../versus/live-vs-rules.js';

const GAMEPLAY_COUNTDOWN_MS = 3000;
const ROULETTE_RESULT_HOLD_MS = 650;

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

export function resolveCurrentStageChoice(localChoice, serverChoice) {
  return localChoice || serverChoice || null;
}

export function createLiveVsController({
  service,
  themes,
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
  onLatencyChange,
  onSpectate,
  onLeave
} = {}) {
  let room = null;
  let pollTimer = null;
  let latencyTimer = null;
  let refreshPending = false;
  let startNotified = false;
  let waitingForResult = false;
  let localStageChoice = null;
  let startTimer = null;
  let rouletteRaf = null;
  let scheduledStartKey = '';
  let createSettings = normalizeLiveVsRoomSettings();
  const latencyByPlayer = new Map();
  const roundNumber = panel.querySelector('#live-vs-round-number');
  const sessionScore = panel.querySelector('#live-vs-session-score');
  const playerOneMeta = panel.querySelector('#live-vs-player-one-meta');
  const playerTwoMeta = panel.querySelector('#live-vs-player-two-meta');
  const playerOneScore = panel.querySelector('#live-vs-player-one-score');
  const playerTwoScore = panel.querySelector('#live-vs-player-two-score');
  const drawCount = panel.querySelector('#live-vs-draw-count');
  const settingsPanel = panel.querySelector('#live-vs-room-settings');
  const settingsOpen = panel.querySelector('#live-vs-settings-open');
  const settingsClose = panel.querySelector('#live-vs-settings-close');
  const settingsSummary = panel.querySelector('#live-vs-settings-summary');
  const formatOptions = panel.querySelector('#live-vs-format-options');
  const speedOptions = panel.querySelector('#live-vs-speed-options');
  const allowKeyboard = panel.querySelector('#live-vs-allow-keyboard');
  const rivalGhost = panel.querySelector('#live-vs-rival-ghost');
  const ruleStrip = panel.querySelector('#live-vs-rule-strip');
  const seriesResult = panel.querySelector('#live-vs-series-result');
  const seriesWinner = panel.querySelector('#live-vs-series-winner');
  const lastRoundPanel = panel.querySelector('#live-vs-last-round');
  const resultTitle = panel.querySelector('#live-vs-result-title');
  const hostResultName = panel.querySelector('#live-vs-host-result-name');
  const guestResultName = panel.querySelector('#live-vs-guest-result-name');
  const hostResultScore = panel.querySelector('#live-vs-host-result-score');
  const guestResultScore = panel.querySelector('#live-vs-guest-result-score');
  const hostResultTime = panel.querySelector('#live-vs-host-result-time');
  const guestResultTime = panel.querySelector('#live-vs-guest-result-time');
  const historyWrap = panel.querySelector('#live-vs-history-wrap');
  const historyCount = panel.querySelector('#live-vs-history-count');
  const historyList = panel.querySelector('#live-vs-history-list');
  const themeName = panel.querySelector('#live-vs-theme-name');
  const waitingPanel = panel.querySelector('#live-vs-waiting');
  const waitingScore = panel.querySelector('#live-vs-waiting-score');
  const waitingStatus = panel.querySelector('#live-vs-waiting-status');
  const spectateButton = panel.querySelector('#live-vs-spectate');
  const stageSelect = panel.querySelector('#live-vs-stage-select');
  const stagePicker = panel.querySelector('#live-vs-stage-picker');
  const stageOpen = panel.querySelector('#live-vs-stage-open');
  const stageClose = panel.querySelector('#live-vs-stage-close');
  const currentStageArt = panel.querySelector('#live-vs-current-stage-art');
  const currentStageName = panel.querySelector('#live-vs-current-stage-name');
  const stageGrid = panel.querySelector('#live-vs-stage-grid');
  const stageLockStatus = panel.querySelector('#live-vs-stage-lock-status');
  const stageReveal = panel.querySelector('#live-vs-stage-reveal');
  const hostStage = panel.querySelector('#live-vs-host-stage');
  const guestStage = panel.querySelector('#live-vs-guest-stage');
  const rouletteStage = panel.querySelector('#live-vs-roulette-stage');
  const rouletteStatus = panel.querySelector('#live-vs-roulette-status');
  const leaveButton = panel.querySelector('#live-vs-leave');
  const themeEntries = Object.entries(themes || {});

  function themeLabel(id) {
    if (id === 'random') return 'Random';
    return themes?.[id]?.name || id || 'Mystery';
  }

  function themeAccent(id) {
    return themes?.[id]?.accent || '#4ecca3';
  }

  function clearStartSequence() {
    if (startTimer) clearTimeout(startTimer);
    if (rouletteRaf) cancelAnimationFrame(rouletteRaf);
    startTimer = null;
    rouletteRaf = null;
    scheduledStartKey = '';
  }

  function cloneThemeArtwork(id) {
    const host = id === 'random'
      ? document.querySelector('.theme-random-btn .theme-icon')
      : document.getElementById(`ti-${id}`);
    const source = host?.firstElementChild;
    if (!source) return null;
    if (source.tagName === 'CANVAS') {
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.getContext('2d')?.drawImage(source, 0, 0);
      return canvas;
    }
    return source.cloneNode(true);
  }

  function createThemeArtwork(id, className = 'live-vs-stage-art') {
    const frame = document.createElement('span');
    frame.className = className;
    frame.setAttribute('aria-hidden', 'true');
    const artwork = cloneThemeArtwork(id);
    if (artwork) frame.appendChild(artwork);
    return frame;
  }

  function buildStageGrid() {
    if (!stageGrid || stageGrid.childElementCount) return;
    const entries = [['random', { name: 'Random', accent: '#f5c542' }], ...themeEntries];
    for (const [id, theme] of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `live-vs-stage-option${id === 'random' ? ' random' : ''}`;
      button.dataset.stage = id;
      button.style.setProperty('--stage-color', theme.accent || '#4ecca3');
      const label = document.createElement('span');
      label.className = 'live-vs-stage-option-name';
      label.textContent = theme.name;
      button.append(createThemeArtwork(id), label);
      button.addEventListener('click', () => {
        const mine = myPlayer();
        if (mine?.ready || !['waiting', 'complete'].includes(room?.status)) return;
        localStageChoice = id;
        if (stagePicker) stagePicker.hidden = true;
        renderRoom();
      });
      stageGrid.appendChild(button);
    }
  }

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

  function renderPlayer(element, player, fallback) {
    const departed = player?.connectionState === 'forfeit';
    element.classList.toggle('empty', !player);
    element.classList.toggle('ready', !!player?.ready);
    element.classList.toggle('departed', departed);
    element.classList.toggle('winner', !!player && !!room?.lastRound?.winnerPlayerId
      && room.lastRound.winnerPlayerId === player.playerId);
    element.innerHTML = `<strong>${player ? escapeHtml(playerLabel(player)) : fallback}</strong>`;
  }

  function renderPlayerScoreMeta(element, player) {
    if (!element) return;
    let state = 'SEARCHING';
    if (player?.connectionState === 'forfeit') state = 'LEFT ARENA';
    else if (player) {
      if (room?.status === 'countdown') state = 'READY';
      else if (room?.status === 'running') state = 'RACING';
      else if (room?.status === 'verifying') state = 'VERIFYING';
      else state = player.ready ? 'READY' : 'SELECTING STAGE';
    }
    const stateLabel = document.createElement('b');
    stateLabel.textContent = state;
    const pingLabel = document.createElement('small');
    if (!latencyDiagnostics || !player) pingLabel.hidden = true;
    else {
      const latency = latencyByPlayer.get(player.playerId);
      pingLabel.textContent = latency == null ? 'PING --' : `PING ${latency} MS`;
    }
    element.replaceChildren(stateLabel, pingLabel);
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
    const archivedRounds = (room?.recentRounds || []).slice(1);
    const earlierRoundCount = Math.max(
      archivedRounds.length,
      Math.max(0, Number(last?.roundNumber || 1) - 1)
    );
    lastRoundPanel.hidden = !last;
    historyWrap.hidden = !last || earlierRoundCount < 1;
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

    if (historyCount) {
      historyCount.textContent = `${earlierRoundCount} EARLIER ${earlierRoundCount === 1 ? 'ROUND' : 'ROUNDS'}`;
    }
    const cards = archivedRounds.map(round => {
      const winner = room.players?.find(player => player.playerId === round.winnerPlayerId);
      const result = round.outcome === 'draw' ? 'DRAW' : `${compactPlayerLabel(winner)} WON`;
      const card = document.createElement('article');
      card.className = 'live-vs-history-card';
      if (round.outcome === 'draw') card.classList.add('draw');
      else if (round.winnerPlayerId === getPlayerId?.()) card.classList.add('you-won');
      else card.classList.add('you-lost');

      const copy = document.createElement('span');
      const roundLabel = document.createElement('small');
      roundLabel.textContent = `ROUND ${round.roundNumber}`;
      const scoreLine = document.createElement('b');
      scoreLine.textContent = `${round.hostScore ?? 0} – ${round.guestScore ?? 0}`;
      const outcome = document.createElement('em');
      outcome.textContent = result;
      copy.append(roundLabel, scoreLine, outcome);
      card.append(createThemeArtwork(round.theme, 'live-vs-history-art'), copy);
      return card;
    });
    historyList.replaceChildren(...cards);
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

  function renderStageSelection() {
    buildStageGrid();
    const mine = myPlayer();
    const completedRound = room?.status === 'complete';
    const selected = completedRound ? localStageChoice : (mine?.themeChoice || localStageChoice);
    const seriesComplete = !!room?.seriesWinnerPlayerId;
    const selectable = !!room && ['waiting', 'complete'].includes(room.status) && !mine?.ready && !seriesComplete;
    if (stageSelect) stageSelect.hidden = !['waiting', 'complete'].includes(room?.status) || seriesComplete;
    if (stageReveal) stageReveal.hidden = room?.status !== 'countdown';
    if (stageOpen) stageOpen.disabled = !selectable;
    if (!selectable && stagePicker) stagePicker.hidden = true;
    if (currentStageName) currentStageName.textContent = selected ? themeLabel(selected) : 'Choose Stage';
    if (currentStageArt) {
      const art = createThemeArtwork(selected || 'random', 'live-vs-stage-art');
      currentStageArt.replaceChildren(...(art ? [art] : []));
      currentStageArt.style.setProperty('--stage-color', themeAccent(selected));
    }
    stageGrid?.querySelectorAll('.live-vs-stage-option').forEach(button => {
      const isSelected = button.dataset.stage === selected;
      button.classList.toggle('selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      button.disabled = !selectable;
    });
    if (stageLockStatus) {
      stageLockStatus.textContent = mine?.ready
        ? `${themeLabel(selected)} locked • waiting for rival`
        : (selected ? `${themeLabel(selected)} selected • press Ready when set` : 'Choose an arena');
    }
  }

  function setStageCard(element, player, fallback) {
    if (!element) return;
    const choice = player?.themeResolved || player?.themeChoice;
    element.style.setProperty('--stage-color', themeAccent(choice));
    const playerName = document.createElement('span');
    playerName.textContent = player ? playerLabel(player) : fallback;
    const stageName = document.createElement('strong');
    stageName.textContent = themeLabel(choice);
    element.replaceChildren(playerName, createThemeArtwork(choice, 'live-vs-stage-card-art'), stageName);
  }

  function setRouletteStage(themeId, final = false) {
    if (!rouletteStage) return;
    rouletteStage.style.setProperty('--stage-color', themeAccent(themeId));
    rouletteStage.classList.toggle('settled', final);
    const stageName = document.createElement('strong');
    stageName.textContent = themeLabel(themeId).toUpperCase();
    rouletteStage.replaceChildren(createThemeArtwork(themeId, 'live-vs-roulette-art'), stageName);
  }

  function startMatchFromLobby(serverOffset) {
    if (startNotified || !room) return;
    startNotified = true;
    waitingForResult = false;
    if (rouletteRaf) cancelAnimationFrame(rouletteRaf);
    rouletteRaf = null;
    setRouletteStage(room.theme, true);
    if (waitingPanel) waitingPanel.hidden = true;
    clearInterval(pollTimer);
    pollTimer = null;
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    onMatchStart?.({
      ...room,
      serverNow: new Date(Date.now() + serverOffset).toISOString()
    });
  }

  function runStageReveal() {
    if (!room?.startsAt) return;
    const host = playerAtSeat(1);
    const guest = playerAtSeat(2);
    const hostChoice = host?.themeResolved || room.theme;
    const guestChoice = guest?.themeResolved || room.theme;
    const revealMs = Date.parse(room.stageRevealAt || room.serverNow || new Date().toISOString());
    const startMs = Date.parse(room.startsAt);
    const boardLaunchMs = Math.max(revealMs, startMs - GAMEPLAY_COUNTDOWN_MS);
    const serverOffset = Date.parse(room.serverNow || new Date().toISOString()) - Date.now();
    const sequenceKey = `${room.id}:${room.roundNumber}:${room.startsAt}`;

    setStageCard(hostStage, host, '1P');
    setStageCard(guestStage, guest, '2P');
    if (stageReveal) stageReveal.hidden = false;
    if (stageSelect) stageSelect.hidden = true;

    if (scheduledStartKey !== sequenceKey) {
      clearStartSequence();
      scheduledStartKey = sequenceKey;
      const delay = Math.max(0, boardLaunchMs - (Date.now() + serverOffset));
      startTimer = setTimeout(() => startMatchFromLobby(serverOffset), delay);
    }

    if (hostChoice === guestChoice) {
      setRouletteStage(room.theme, true);
      if (rouletteStatus) rouletteStatus.textContent = 'UNANIMOUS STAGE • MATCH LOADING';
      return;
    }

    const settleAt = Math.max(revealMs, boardLaunchMs - ROULETTE_RESULT_HOLD_MS);
    const boundaries = [0, .12, .24, .36, .48, .60, .70, .79, .87, .93, .97, 1];
    const animate = () => {
      rouletteRaf = null;
      const authoritativeNow = Date.now() + serverOffset;
      const progress = Math.max(0, Math.min(1, (authoritativeNow - revealMs) / Math.max(1, settleAt - revealMs)));
      let frame = boundaries.findIndex(value => progress < value) - 1;
      if (frame < 0) frame = boundaries.length - 2;
      const settled = progress >= 1;
      setRouletteStage(settled ? room.theme : (frame % 2 === 0 ? hostChoice : guestChoice), settled);
      if (rouletteStatus) {
        rouletteStatus.textContent = settled
          ? `${themeLabel(room.theme).toUpperCase()} SELECTED • GET READY`
          : 'ARENA ROULETTE';
      }
      if (!settled) rouletteRaf = requestAnimationFrame(animate);
    };
    if (!rouletteRaf) rouletteRaf = requestAnimationFrame(animate);
  }

  function maybeStart() {
    if (startNotified || room?.status !== 'countdown' || !room.startsAt) return;
    if (room.stageRevealAt) {
      runStageReveal();
      return;
    }
    const serverOffset = Date.parse(room.serverNow || new Date().toISOString()) - Date.now();
    startMatchFromLobby(serverOffset);
  }

  function departedRival() {
    const mineId = getPlayerId?.();
    return room?.players?.find(player => player.playerId !== mineId && player.connectionState === 'forfeit') || null;
  }

  function statusText(connected) {
    const departed = departedRival();
    if (departed) return `${compactPlayerLabel(departed)} left the battle room. This session is closed.`;
    if (room.status === 'cancelled') return 'Battle room closed.';
    if (room.status === 'expired') return 'Battle room expired.';
    if (waitingForResult) return 'Your run is locked. The rival battle is still live.';
    if (room.status === 'verifying') return 'Your result is verified — waiting for the rival result.';
    if (room.status === 'countdown') return 'Stage decision locked — battle commencing!';
    if (room.seriesWinnerPlayerId) return 'Series decided — the champion has claimed this battle room.';
    if (room.status === 'complete') return 'Round verified. Pick the next arena!';
    if (connected < 2) return 'Arena open — send your rival the invite link.';
    return 'Both fighters connected. Choose and lock your arena.';
  }

  function renderRoom() {
    if (!room) return;
    setup.hidden = true;
    lobby.hidden = false;
    roomCode.textContent = room.code;
    const format = liveVsFormatLabel(room.matchFormat);
    roundNumber.textContent = room.matchFormat === 'continuous'
      ? `ROUND ${room.roundNumber || 1}`
      : `GAME ${room.roundNumber || 1} • ${format}`;
    const hostWins = Number(room.hostWins || 0);
    const guestWins = Number(room.guestWins || 0);
    if (playerOneScore) playerOneScore.textContent = String(hostWins);
    if (playerTwoScore) playerTwoScore.textContent = String(guestWins);
    sessionScore?.setAttribute('aria-label', `Player 1 ${hostWins}, Player 2 ${guestWins}`);
    drawCount.textContent = Number(room.draws || 0)
      ? `${room.draws} ${Number(room.draws) === 1 ? 'DRAW' : 'DRAWS'}`
      : 'NO DRAWS';
    if (ruleStrip) {
      ruleStrip.innerHTML = [
        `<span><i class="live-vs-rule-icon trophy" aria-hidden="true"></i><b>${escapeHtml(format)}</b></span>`,
        `<span><i class="live-vs-rule-icon speed" aria-hidden="true"></i><b>×${Number(room.speedMultiplier) || 1}</b></span>`,
        `<span><i class="live-vs-rule-icon keyboard" aria-hidden="true"></i><b>${room.allowKeyboard === false ? 'OFF' : 'ON'}</b></span>`,
        `<span><i class="live-vs-rule-icon ghost" aria-hidden="true"></i><b>${room.rivalGhostEnabled === false ? 'OFF' : 'ON'}</b></span>`
      ].join('');
    }
    const champion = room.players?.find(player => player.playerId === room.seriesWinnerPlayerId);
    if (seriesResult) seriesResult.hidden = !room.seriesWinnerPlayerId;
    if (seriesWinner && room.seriesWinnerPlayerId) {
      seriesWinner.textContent = `${playerLabel(champion).toUpperCase()} WINS THE SERIES`;
    }
    themeName.textContent = ['countdown', 'running', 'verifying'].includes(room.status)
      ? `${themeLabel(room.theme).toUpperCase()} ARENA`
      : 'STAGE SELECT';
    const connected = room.players?.filter(player => player.connectionState !== 'forfeit').length || 0;
    roomStatus.textContent = statusText(connected);
    const hostPlayer = playerAtSeat(1);
    const guestPlayer = playerAtSeat(2);
    renderPlayer(playerOne, hostPlayer, 'PLAYER 1');
    renderPlayer(playerTwo, guestPlayer, 'PLAYER 2');
    renderPlayerScoreMeta(playerOneMeta, hostPlayer);
    renderPlayerScoreMeta(playerTwoMeta, guestPlayer);
    renderLastRound();

    const mine = myPlayer();
    if (!localStageChoice && mine?.themeChoice && room.status !== 'complete') {
      localStageChoice = mine.themeChoice;
    }
    renderStageSelection();
    const nextRound = Number(room.roundNumber || 1) + (room.status === 'complete' ? 1 : 0);
    const roomClosed = ['cancelled', 'expired'].includes(room.status) || !!departedRival();
    readyButton.disabled = waitingForResult || roomClosed || !!room.seriesWinnerPlayerId || connected < 2
      || !['waiting', 'complete'].includes(room.status)
      || (!mine?.ready && !localStageChoice && !mine?.themeChoice);
    readyButton.textContent = room.seriesWinnerPlayerId
      ? 'Series Complete'
      : (mine?.ready
      ? 'Cancel Ready'
      : `Ready — Round ${nextRound}`);
    readyButton.classList.toggle('armed', !!mine?.ready);
    closeButton.textContent = roomClosed ? 'Return to Main Menu' : 'Leave Battle Room';
    if (departedRival()) {
      setMessage('Rival disconnected from this battle room.', true);
    }
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
    clearStartSequence();
    room = nextRoom;
    startNotified = false;
    waitingForResult = false;
    localStageChoice = myPlayer()?.themeChoice || null;
    if (waitingPanel) waitingPanel.hidden = true;
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
    if (settingsPanel) settingsPanel.hidden = true;
    if (stagePicker) stagePicker.hidden = true;
    closeButton.textContent = 'Back';
    setMessage('Create a battle room or enter a rival invite code.');
    codeInput.blur();
    panel.scrollTop = 0;
  }

  async function create() {
    if (!await ensurePlayer?.()) return;
    if (settingsPanel) settingsPanel.hidden = true;
    createButton.disabled = true;
    setMessage('Building battle arena…');
    try {
      await enterRoom(await service.createRoom(getCurrentTheme?.() || 'default', createSettings));
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
    if (settingsPanel) settingsPanel.hidden = true;
    codeInput.blur();
    panel.scrollTop = 0;
    setMessage(`Invite ${normalized} detected — entering battle room…`);
    await join();
    return !!room;
  }

  async function toggleStageLock() {
    const mine = myPlayer();
    if (!room || !mine) return;
    // On a completed round, the room snapshot still contains the previous
    // round's server choice until the first Ready action creates the next
    // round. The stage highlighted in this client is authoritative here.
    const choice = resolveCurrentStageChoice(localStageChoice, mine.themeChoice);
    if (!mine.ready && !choice) {
      setMessage('Choose an arena before locking in', true);
      return;
    }
    readyButton.disabled = true;
    try {
      room = await service.selectStage(room.id, choice, !mine.ready);
      localStageChoice = myPlayer()?.themeChoice || choice;
      renderRoom();
      await service.announceRoomRefresh(room.id);
    } catch (error) {
      setMessage(error.message || 'Could not lock stage choice', true);
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
    const text = `Join my Snake Vs Casual battle room ${room.code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Snake Vs Casual', text, url });
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
    clearStartSequence();
    startNotified = false;
    waitingForResult = false;
    localStageChoice = null;
    if (historyWrap) historyWrap.open = false;
    panel.classList.remove('waiting-for-rival');
    if (waitingPanel) waitingPanel.hidden = true;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    closeButton.textContent = 'Leave Battle Room';
    setMessage('Round archived • room remains open');
    renderRoom();
    beginPolling();
  }

  function showWaitingRoom() {
    if (!room || !waitingForResult) return;
    panel.classList.add('visible', 'waiting-for-rival');
    panel.setAttribute('aria-hidden', 'false');
    if (waitingPanel) waitingPanel.hidden = false;
    beginPolling();
  }

  function updateWaitingStatus(text, error = false) {
    if (waitingStatus && text) waitingStatus.textContent = text;
    setMessage(text, error);
  }

  function waitForRival({ score = 0, interrupted = false } = {}) {
    if (!room) return;
    waitingForResult = true;
    panel.classList.add('visible', 'waiting-for-rival');
    panel.setAttribute('aria-hidden', 'false');
    setup.hidden = true;
    lobby.hidden = false;
    closeButton.textContent = 'Leave Battle Room';
    if (waitingPanel) waitingPanel.hidden = false;
    if (spectateButton) spectateButton.hidden = interrupted;
    if (waitingScore) waitingScore.textContent = String(Math.max(0, Number(score) || 0));
    if (waitingStatus) {
      waitingStatus.textContent = interrupted
        ? 'Forfeit sent • waiting for the verified battle result'
        : 'Score secured • rival still fighting';
    }
    setMessage(interrupted
      ? 'Match forfeited. Resolving the final result…'
      : 'Your battle is over. Stay in the arena while your rival finishes.');
    renderRoom();
    beginPolling();
  }

  async function close({ leave = true } = {}) {
    clearStartSequence();
    clearInterval(pollTimer);
    pollTimer = null;
    clearInterval(latencyTimer);
    latencyTimer = null;
    panel.classList.remove('visible');
    panel.classList.remove('waiting-for-rival');
    panel.setAttribute('aria-hidden', 'true');
    if (settingsPanel) settingsPanel.hidden = true;
    if (stagePicker) stagePicker.hidden = true;
    if (leave && room?.id) {
      const departedRoom = room;
      try {
        await service.leaveRoom(room.id);
        await service.announceRoomRefresh(room.id);
      } catch (_) {}
      await service.disconnect();
      room = null;
      startNotified = false;
      waitingForResult = false;
      localStageChoice = null;
      onLeave?.(departedRoom);
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
  leaveButton?.addEventListener('click', () => close());
  createButton.addEventListener('click', create);
  joinButton.addEventListener('click', join);
  readyButton.addEventListener('click', toggleStageLock);
  shareButton.addEventListener('click', shareRoom);
  settingsOpen?.addEventListener('click', () => {
    if (settingsPanel) settingsPanel.hidden = false;
  });
  settingsClose?.addEventListener('click', () => {
    if (settingsPanel) settingsPanel.hidden = true;
    settingsOpen?.focus({ preventScroll: true });
  });
  stageOpen?.addEventListener('click', () => {
    if (stageOpen.disabled || !stagePicker) return;
    stagePicker.hidden = false;
  });
  stageClose?.addEventListener('click', () => {
    if (stagePicker) stagePicker.hidden = true;
    stageOpen?.focus({ preventScroll: true });
  });
  spectateButton?.addEventListener('click', () => {
    if (onSpectate?.(room) === false) return;
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
  });
  function bindSettingButtons(container, key, transform = value => value) {
    container?.querySelectorAll('button[data-value]').forEach(button => {
      button.addEventListener('click', () => {
        createSettings = normalizeLiveVsRoomSettings({
          ...createSettings,
          [key]: transform(button.dataset.value)
        });
        container.querySelectorAll('button[data-value]').forEach(option => {
          const selected = option === button;
          option.classList.toggle('selected', selected);
          option.setAttribute('aria-pressed', String(selected));
        });
        updateSettingsSummary();
      });
    });
  }
  function updateSettingsSummary() {
    if (!settingsSummary) return;
    const formatLabel = liveVsFormatLabel(createSettings.matchFormat);
    const values = {
      format: createSettings.matchFormat === 'continuous'
        ? { text: '∞', label: 'Continuous battle' }
        : { text: formatLabel.replace('BEST OF ', 'BO'), label: formatLabel },
      speed: { text: `×${createSettings.speedMultiplier}`, label: `Speed ×${createSettings.speedMultiplier}` },
      keyboard: {
        text: createSettings.allowKeyboard ? 'ON' : 'OFF',
        label: `Keyboard ${createSettings.allowKeyboard ? 'enabled' : 'disabled'}`,
        enabled: createSettings.allowKeyboard
      },
      ghost: {
        text: createSettings.rivalGhostEnabled ? 'ON' : 'OFF',
        label: `Rival ghost ${createSettings.rivalGhostEnabled ? 'enabled' : 'disabled'}`,
        enabled: createSettings.rivalGhostEnabled
      }
    };
    settingsSummary.querySelectorAll('[data-setting]').forEach(chip => {
      const value = values[chip.dataset.setting];
      if (!value) return;
      const text = chip.querySelector('small');
      if (text) text.textContent = value.text;
      chip.setAttribute('aria-label', value.label);
      chip.classList.toggle('off', value.enabled === false);
    });
  }
  bindSettingButtons(formatOptions, 'matchFormat');
  bindSettingButtons(speedOptions, 'speedMultiplier', Number);
  allowKeyboard?.addEventListener('change', () => {
    createSettings = normalizeLiveVsRoomSettings({ ...createSettings, allowKeyboard: allowKeyboard.checked });
    updateSettingsSummary();
  });
  rivalGhost?.addEventListener('change', () => {
    createSettings = normalizeLiveVsRoomSettings({ ...createSettings, rivalGhostEnabled: rivalGhost.checked });
    updateSettingsSummary();
  });
  updateSettingsSummary();

  return {
    open,
    openInvite,
    close,
    refreshRoom,
    returnToLobby,
    showWaitingRoom,
    waitForRival,
    updateWaitingStatus,
    getRoom: () => room,
    isMatchActive: () => startNotified && !!room,
    disconnect: async () => {
      clearStartSequence();
      clearInterval(pollTimer);
      clearInterval(latencyTimer);
      pollTimer = null;
      latencyTimer = null;
      await service.disconnect();
    }
  };
}
