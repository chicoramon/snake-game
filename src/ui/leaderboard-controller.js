export function createLeaderboardController({
  elements,
  leaderboardService,
  controls,
  themes,
  getState,
  currentUtcDateKey,
  escHtml,
  isSchemaError,
  refreshDailyChallenge,
  ensureDailyChallenge,
  formatDailyFoodTime
}) {
  const {
    leaderboardOverlay, lbGameModeFilters, lbControlFilters,
    lbBody, lbLoading, lbEmpty, lbTable, lbPagination, lbPrev, lbNext,
    lbPageInfo, lbBack, lbBtn, publicPlayerCardPanel, publicPlayerCardName,
    publicPlayerArcadeId, publicPlayerCardMessage, publicPlayerCardClose
  } = elements;

const publicPlayerCardCache = new Map();
let publicPlayerCardTrigger = null;
let publicPlayerCardRequestId = 0;

function leaderboardPlayerLabel(row) {
  const initials = row?.name || row?.initials || '---';
  return `${initials}${row?.player_code ? `\u00b7${row.player_code}` : ''}`;
}

function leaderboardPlayerIdentity(row) {
  const label = leaderboardPlayerLabel(row);
  if (!row?.player_id) return `<span>${escHtml(label)}</span>`;
  const playerId = escHtml(String(row.player_id));
  const safeLabel = escHtml(label);
  return `<button class="lb-player-link" type="button" data-player-id="${playerId}" data-player-label="${safeLabel}" aria-label="View player card for ${safeLabel}">${safeLabel}</button>`;
}

function hidePublicPlayerCard({ restoreFocus = true } = {}) {
  publicPlayerCardRequestId++;
  publicPlayerCardPanel.classList.remove('visible');
  publicPlayerCardPanel.setAttribute('aria-hidden', 'true');
  if (restoreFocus && publicPlayerCardTrigger?.isConnected) publicPlayerCardTrigger.focus();
  publicPlayerCardTrigger = null;
}

async function showPublicPlayerCard(playerId, trigger) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(playerId || '')) return;
  const requestId = ++publicPlayerCardRequestId;
  publicPlayerCardTrigger = trigger || null;
  publicPlayerCardName.textContent = 'Loading...';
  publicPlayerArcadeId.textContent = trigger?.dataset.playerLabel || '';
  publicPlayerCardMessage.textContent = 'Retrieving public player identity...';
  publicPlayerCardPanel.classList.add('visible');
  publicPlayerCardPanel.setAttribute('aria-hidden', 'false');
  publicPlayerCardClose.focus();

  try {
    let card = publicPlayerCardCache.get(playerId);
    if (!card) {
      if (!getState().sb) throw new Error('Player cards are unavailable offline');
      card = await leaderboardService.fetchPublicPlayerCard(playerId);
      if (!card) throw new Error('Player card unavailable');
      publicPlayerCardCache.set(playerId, card);
    }
    if (requestId !== publicPlayerCardRequestId) return;
    publicPlayerCardName.textContent = card.display_name || 'No Display Name Set';
    publicPlayerArcadeId.textContent = leaderboardPlayerLabel(card);
    publicPlayerCardMessage.textContent = card.display_name
      ? 'Public player identity'
      : 'This player has not added a public display name.';
  } catch (error) {
    if (requestId !== publicPlayerCardRequestId) return;
    publicPlayerCardName.textContent = 'Player Card Unavailable';
    publicPlayerCardMessage.textContent = isSchemaError(error)
      ? 'Player-card database update required'
      : (error.message || 'Could not load this player card');
  }
}

publicPlayerCardClose.addEventListener('click', () => hidePublicPlayerCard());
publicPlayerCardPanel.addEventListener('click', event => {
  if (event.target === publicPlayerCardPanel) hidePublicPlayerCard();
});
publicPlayerCardPanel.addEventListener('keydown', event => {
  if (event.key === 'Escape') hidePublicPlayerCard();
});
leaderboardOverlay.addEventListener('click', event => {
  const trigger = event.target.closest('.lb-player-link[data-player-id]');
  if (!trigger || !leaderboardOverlay.contains(trigger)) return;
  showPublicPlayerCard(trigger.dataset.playerId, trigger);
});

const dailyArchivePanel = document.createElement('section');
dailyArchivePanel.id = 'dailyArchivePanel';
dailyArchivePanel.hidden = true;
dailyArchivePanel.setAttribute('aria-label', 'Daily Run archive and records');
dailyArchivePanel.innerHTML = `
  <div class="daily-archive-nav">
    <button class="daily-day-btn" id="dailyDayPrev" type="button" aria-label="Older Daily Run">&#9664;</button>
    <div id="dailyArchiveHeading" aria-live="polite">Today</div>
    <button class="daily-day-btn" id="dailyDayNext" type="button" aria-label="Newer Daily Run">&#9654;</button>
  </div>
  <button id="dailyTodayBtn" type="button" hidden>Return to Today</button>
  <p id="dailyArchiveSummary"></p>
  <div id="dailyLegendsSection" hidden>
    <h3 class="daily-legends-title">Daily Legends</h3>
    <div id="dailyLegendCards"></div>
    <table class="lb-table" id="dailyLegendsTable">
      <thead><tr><th>#</th><th>Player</th><th>Wins</th><th>Best Streak</th><th>Podiums</th></tr></thead>
      <tbody id="dailyLegendsBody"></tbody>
    </table>
  </div>`;
leaderboardOverlay.querySelector('.lb-filter-group').insertAdjacentElement('afterend', dailyArchivePanel);
const dailyDayPrev = document.getElementById('dailyDayPrev');
const dailyDayNext = document.getElementById('dailyDayNext');
const dailyTodayBtn = document.getElementById('dailyTodayBtn');
const dailyArchiveHeading = document.getElementById('dailyArchiveHeading');
const dailyArchiveSummary = document.getElementById('dailyArchiveSummary');
const dailyLegendsSection = document.getElementById('dailyLegendsSection');
const dailyLegendCards = document.getElementById('dailyLegendCards');
const dailyLegendsTable = document.getElementById('dailyLegendsTable');
const dailyLegendsBody = document.getElementById('dailyLegendsBody');

const LB_PAGE_SIZE = 10;
const lbState = {
  gameMode: 'classic', control: 'all', theme: 'all', page: 0, total: 0, requestId: 0,
  dailyDate: currentUtcDateKey(), dailyDays: [], dailyStats: [], dailyArchiveLoaded: false,
  dailyArchiveError: false
};
let dailyArchiveCountdownTimer = null;

function formatDailyRunTimeLeft() {
  const now = new Date();
  const nextUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const totalSeconds = Math.max(0, Math.ceil((nextUtcDay - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function syncDailyArchiveCountdown() {
  clearInterval(dailyArchiveCountdownTimer);
  dailyArchiveCountdownTimer = null;
  const shouldRun = leaderboardOverlay.classList.contains('visible') &&
    lbState.gameMode === 'daily' && lbState.dailyDate === currentUtcDateKey();
  if (!shouldRun) return;
  dailyArchiveCountdownTimer = setInterval(() => {
    if (lbState.dailyDate !== currentUtcDateKey()) {
      renderDailyArchive();
      syncDailyArchiveCountdown();
      return;
    }
    renderDailyArchive();
  }, 1000);
}

function formatDailyArchiveDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC'
  }).format(date).toUpperCase();
}

function dailyArchiveMeta(dateKey = lbState.dailyDate) {
  return lbState.dailyDays.find(day => day.challenge_date === dateKey) || null;
}

function dailyStatsPlayerLabel(row) {
  return `${row.name || '---'}${row.player_code ? `\u00b7${row.player_code}` : ''}`;
}

function renderDailyLegends() {
  const stats = lbState.dailyStats || [];
  dailyLegendsSection.hidden = stats.length === 0;
  dailyLegendCards.innerHTML = '';
  dailyLegendsBody.innerHTML = '';
  if (!stats.length) return;

  const byWins = [...stats].sort((a, b) =>
    Number(b.wins) - Number(a.wins) ||
    Number(b.podiums) - Number(a.podiums) ||
    Number(b.days_played) - Number(a.days_played) ||
    dailyStatsPlayerLabel(a).localeCompare(dailyStatsPlayerLabel(b))
  );
  const byWinStreak = [...stats].sort((a, b) =>
    Number(b.longest_win_streak) - Number(a.longest_win_streak) || Number(b.wins) - Number(a.wins)
  );
  const byPlayStreak = [...stats].sort((a, b) =>
    Number(b.longest_play_streak) - Number(a.longest_play_streak) || Number(b.days_played) - Number(a.days_played)
  );
  const records = [
    ['Most Wins', byWins[0], `${Number(byWins[0].wins)} wins`],
    ['Win Streak', byWinStreak[0], `${Number(byWinStreak[0].longest_win_streak)} days`],
    ['Play Streak', byPlayStreak[0], `${Number(byPlayStreak[0].longest_play_streak)} days`]
  ];
  records.forEach(([label, row, value]) => {
    const card = document.createElement('div');
    card.className = 'daily-legend-card';
    card.innerHTML = `<span class="daily-legend-label">${escHtml(label)}</span><span class="daily-legend-player">${leaderboardPlayerIdentity(row)}</span><span class="daily-legend-value">${escHtml(value)}</span>`;
    dailyLegendCards.appendChild(card);
  });

  byWins.slice(0, 5).forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index === 0) tr.classList.add('top1');
    else if (index === 1) tr.classList.add('top2');
    else if (index === 2) tr.classList.add('top3');
    if (getState().currentUser && row.player_id === getState().currentUser.id) tr.classList.add('you');
    const you = getState().currentUser && row.player_id === getState().currentUser.id ? '<span class="lb-you-badge">YOU</span>' : '';
    tr.innerHTML = `<td class="lb-rank">${index + 1}</td><td>${leaderboardPlayerIdentity(row)}${you}</td><td>${Number(row.wins)}</td><td>${Number(row.longest_win_streak)}</td><td>${Number(row.podiums)}</td>`;
    dailyLegendsBody.appendChild(tr);
  });
}

function renderDailyArchive() {
  if (lbState.gameMode !== 'daily') return;
  const dateKey = lbState.dailyDate || currentUtcDateKey();
  const today = currentUtcDateKey();
  const meta = dailyArchiveMeta(dateKey);
  const isToday = dateKey === today;
  const challengeNumber = Number(meta?.challenge_number || (isToday ? getState().dailyChallenge?.number : 0));
  const themeId = meta?.theme || (isToday ? getState().dailyChallenge?.theme : null);
  const themeName = themeId && themes[themeId] ? themes[themeId].name : (themeId || 'Theme Pending');
  dailyArchiveHeading.textContent = `${formatDailyArchiveDate(dateKey)} • ${challengeNumber ? `CHALLENGE #${challengeNumber}` : 'DAILY RUN'} • ${themeName}`;
  dailyTodayBtn.hidden = isToday;

  if (lbState.dailyArchiveError) {
    dailyArchiveSummary.textContent = 'Archive update required in Supabase';
  } else if (isToday && meta?.winner_name) {
    const leader = leaderboardPlayerIdentity({
      name: meta.winner_name,
      player_code: meta.winner_player_code,
      player_id: meta.winner_player_id
    });
    const players = Number(meta.participant_count || 0);
    dailyArchiveSummary.innerHTML = `Current leader ${leader} • Score ${Number(meta.winning_score)} • ${players} player${players === 1 ? '' : 's'} • Ends in ${escHtml(formatDailyRunTimeLeft())}`;
  } else if (isToday) {
    const players = Number(meta?.participant_count || 0);
    dailyArchiveSummary.textContent = `Today's race is open • ${players} player${players === 1 ? '' : 's'} • Ends in ${formatDailyRunTimeLeft()}`;
  } else if (meta?.winner_name) {
    const winner = leaderboardPlayerIdentity({
      name: meta.winner_name,
      player_code: meta.winner_player_code,
      player_id: meta.winner_player_id
    });
    const players = Number(meta.participant_count || 0);
    dailyArchiveSummary.innerHTML = `Winner ${winner} • Score ${Number(meta.winning_score)} • ${players} player${players === 1 ? '' : 's'}`;
  } else {
    dailyArchiveSummary.textContent = 'No verified finishers';
  }

  const older = lbState.dailyDays.find(day => day.challenge_date < dateKey);
  const newer = [...lbState.dailyDays].reverse().find(day => day.challenge_date > dateKey);
  dailyDayPrev.disabled = !older;
  dailyDayNext.disabled = !newer;
  dailyDayPrev.dataset.date = older?.challenge_date || '';
  dailyDayNext.dataset.date = newer?.challenge_date || '';
  renderDailyLegends();
}

async function loadDailyArchiveData({ force = false } = {}) {
  if (!getState().sb || (lbState.dailyArchiveLoaded && !force)) {
    renderDailyArchive();
    return;
  }
  const { daysResult, statsResult } = await leaderboardService.loadDailyArchive();
  lbState.dailyArchiveError = !!daysResult.error || !!statsResult.error;
  if (!daysResult.error) lbState.dailyDays = daysResult.data || [];
  if (!statsResult.error) lbState.dailyStats = statsResult.data || [];
  lbState.dailyArchiveLoaded = !lbState.dailyArchiveError;

  const today = getState().dailyChallenge?.date || currentUtcDateKey();
  if (!lbState.dailyDays.some(day => day.challenge_date === today)) {
    lbState.dailyDays.unshift({
      challenge_date: today,
      challenge_number: getState().dailyChallenge?.number || null,
      theme: getState().dailyChallenge?.theme || null,
      participant_count: 0
    });
  }
  lbState.dailyDays.sort((a, b) => b.challenge_date.localeCompare(a.challenge_date));
  renderDailyArchive();
}

async function prepareDailyLeaderboard() {
  await refreshDailyChallenge({ force: true });
  lbState.dailyDate = getState().dailyChallenge?.date || currentUtcDateKey();
  await loadDailyArchiveData({ force: true });
  syncDailyArchiveCountdown();
  loadLeaderboard();
}

function selectDailyLeaderboardDate(dateKey) {
  if (!dateKey || dateKey === lbState.dailyDate) return;
  lbState.dailyDate = dateKey;
  lbState.page = 0;
  renderDailyArchive();
  syncDailyArchiveCountdown();
  loadLeaderboard();
}

function buildFilterGroup(container, values, stateKey, labelFor) {
  container.innerHTML = '';
  values.forEach(value => {
    const btn = document.createElement('button');
    const active = value === lbState[stateKey];
    btn.className = 'lb-filter' + (active ? ' active' : '');
    btn.textContent = labelFor(value);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      if (lbState[stateKey] === value) return;
      lbState[stateKey] = value;
      lbState.page = 0;
      container.querySelectorAll('.lb-filter').forEach(b => {
        const selected = b === btn;
        b.classList.toggle('active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      if (stateKey === 'gameMode') buildFilters();
      if (stateKey === 'gameMode' && value === 'daily') {
        prepareDailyLeaderboard();
      } else {
        loadLeaderboard();
      }
    });
    container.appendChild(btn);
  });
}

function buildFilters() {
  buildFilterGroup(
    lbGameModeFilters,
    ['classic', 'sprint', 'daily'],
    'gameMode',
    value => value === 'sprint' ? 'Sprint 60' : (value === 'daily' ? 'Daily Run' : 'Classic')
  );
  buildFilterGroup(
    lbControlFilters,
    ['all', 'dpad', 'turn', 'tap', 'keyboard', 'controller'],
    'control',
    value => value === 'all' ? 'All' : controls[value]
  );
  const daily = lbState.gameMode === 'daily';
  dailyArchivePanel.hidden = !daily;
  lbControlFilters.closest('.lb-filter-group').hidden = daily;
  const themeHeading = lbTable.querySelector('th.lb-theme-col');
  if (themeHeading) themeHeading.textContent = daily ? 'Final Food' : 'Theme';
  if (daily) renderDailyArchive();
  syncDailyArchiveCountdown();
}

function updatePagination() {
  const pageCount = Math.max(1, Math.ceil(lbState.total / LB_PAGE_SIZE));
  lbPageInfo.textContent = `Page ${lbState.page + 1} of ${pageCount}`;
  lbPrev.disabled = lbState.page === 0;
  lbNext.disabled = lbState.page + 1 >= pageCount;
  lbPagination.style.display = lbState.total > 0 ? 'flex' : 'none';
}

async function loadLeaderboard() {
  if (!getState().sb) {
    lbLoading.style.display = 'none';
    lbTable.style.display = 'none';
    lbPagination.style.display = 'none';
    lbEmpty.style.display = 'block';
    lbEmpty.textContent = 'Leaderboard unavailable';
    return;
  }
  const requestId = ++lbState.requestId;
  lbLoading.style.display = 'block';
  lbEmpty.style.display = 'none';
  lbTable.style.display = 'none';
  lbPagination.style.display = 'none';
  const from = lbState.page * LB_PAGE_SIZE;
  const challenge = lbState.gameMode === 'daily' ? (getState().dailyChallenge || ensureDailyChallenge()) : null;
  const result = await leaderboardService.fetchPage({
    gameMode: lbState.gameMode,
    control: lbState.control,
    theme: 'all',
    date: lbState.dailyDate || challenge?.date,
    limit: LB_PAGE_SIZE,
    offset: from
  });
  const { data, error, count } = result;
  if (requestId !== lbState.requestId) return;
  lbLoading.style.display = 'none';
  if (error || !data || data.length === 0) {
    lbEmpty.style.display = 'block';
    lbEmpty.textContent = error
      ? (isSchemaError(error)
          ? 'Leaderboard update required'
          : 'Failed to load')
      : (lbState.gameMode === 'daily' && lbState.dailyDate !== currentUtcDateKey()
          ? 'No ranked scores for this day.'
          : 'No scores yet. Be the first!');
    lbState.total = error ? 0 : (count || 0);
    updatePagination();
    return;
  }
  lbState.total = count ?? data.length;
  lbTable.style.display = 'table';
  lbBody.innerHTML = '';
  data.forEach((row, i) => {
    const rank = Number(row.leaderboard_rank) || from + i + 1;
    const tr = document.createElement('tr');
    if (rank === 1) tr.classList.add('top1');
    else if (rank === 2) tr.classList.add('top2');
    else if (rank === 3) tr.classList.add('top3');
    const isOwnRow = !!getState().currentUser && row.player_id === getState().currentUser.id;
    if (isOwnRow) tr.classList.add('you');
    const method = controls[row.control_method] || controls.legacy;
    const methodLabel = lbState.gameMode === 'daily' && row.attempt_number
      ? `TRY ${row.attempt_number} • ${method}`
      : method;
    const identity = leaderboardPlayerIdentity(row);
    const you = isOwnRow ? '<span class="lb-you-badge">YOU</span>' : '';
    const detail = lbState.gameMode === 'daily'
      ? formatDailyFoodTime(row.final_food_ms == null ? null : Number(row.final_food_ms))
      : escHtml(row.theme);
    tr.innerHTML = `<td class="lb-rank">${rank}</td><td>${identity}${you}<span class="lb-method-tag">${escHtml(methodLabel)}</span></td><td class="lb-theme-col">${detail}</td><td class="lb-score">${row.score}</td>`;
    lbBody.appendChild(tr);
  });
  updatePagination();
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showLeaderboard() {
  lbState.gameMode = getState().gameMode;
  lbState.control = 'all';
  lbState.theme = 'all';
  lbState.page = 0;
  lbState.dailyDate = currentUtcDateKey();
  buildFilters();
  leaderboardOverlay.classList.add('visible');
  if (lbState.gameMode === 'daily') prepareDailyLeaderboard();
  else loadLeaderboard();
}

function hideLeaderboard() {
  leaderboardOverlay.classList.remove('visible');
  syncDailyArchiveCountdown();
}

lbBtn.addEventListener('click', showLeaderboard);
lbBack.addEventListener('click', hideLeaderboard);
dailyDayPrev.addEventListener('click', () => selectDailyLeaderboardDate(dailyDayPrev.dataset.date));
dailyDayNext.addEventListener('click', () => selectDailyLeaderboardDate(dailyDayNext.dataset.date));
dailyTodayBtn.addEventListener('click', () => selectDailyLeaderboardDate(currentUtcDateKey()));
lbPrev.addEventListener('click', () => {
  if (lbState.page === 0) return;
  lbState.page--;
  loadLeaderboard();
});
lbNext.addEventListener('click', () => {
  if ((lbState.page + 1) * LB_PAGE_SIZE >= lbState.total) return;
  lbState.page++;
  loadLeaderboard();
});

  return { loadLeaderboard, loadDailyArchiveData, showLeaderboard, hideLeaderboard };
}
