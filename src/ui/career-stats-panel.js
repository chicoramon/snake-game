import {
  normalizeCareerStats,
  selectAnnouncerLine,
  selectCatalogAnnouncerLine
} from '../stats/arcade-announcer.js';

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function formatCareerDuration(ms) {
  const totalMinutes = Math.floor(number(ms) / 60000);
  if (totalMinutes < 1) return '<1 MIN';
  if (totalMinutes < 60) return `${totalMinutes} MIN`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}H ${minutes}M` : `${hours}H`;
}

export function buildCareerViewModel(rawStats = {}, { themeName = value => value, controlName = value => value } = {}) {
  const stats = normalizeCareerStats(rawStats);
  return {
    ...stats,
    totalFoodText: Math.round(stats.totalFood).toLocaleString('en-US'),
    activeTimeText: formatCareerDuration(stats.activeMs),
    totalRunsText: Math.round(stats.totalRuns).toLocaleString('en-US'),
    distanceText: Math.round(stats.distanceCells).toLocaleString('en-US'),
    longestSnakeText: Math.max(3, Math.round(stats.longestSnake || 3)).toLocaleString('en-US'),
    totalTurnsText: Math.round(stats.totalTurns).toLocaleString('en-US'),
    totalDeathsText: Math.round(stats.totalDeaths).toLocaleString('en-US'),
    wallDeathsText: Math.round(stats.wallDeaths).toLocaleString('en-US'),
    selfDeathsText: Math.round(stats.selfDeaths).toLocaleString('en-US'),
    favoriteThemeText: stats.favoriteTheme ? themeName(stats.favoriteTheme) : 'UNCHARTED',
    favoriteControlText: stats.favoriteControl ? controlName(stats.favoriteControl) : 'UNCHARTED'
  };
}

function todaySeed(identity, stats) {
  const day = new Date().toISOString().slice(0, 10);
  return `${identity.user?.id || identity.profile?.player_code || 'snake'}:${day}:${stats.total_runs || stats.totalRuns || 0}`;
}

export function createCareerStatsPanel({
  careerStatsService,
  announcerService,
  getIdentity,
  themeName = value => value,
  controlName = value => value
} = {}) {
  const panel = document.getElementById('career-stats-panel');
  const playerPanel = document.getElementById('player-panel');
  const launchButton = document.getElementById('player-career-btn');
  const closeButton = document.getElementById('career-stats-back');
  const title = document.getElementById('career-stats-player');
  const source = document.getElementById('career-stats-source');
  const status = document.getElementById('career-stats-status');
  const content = document.getElementById('career-stats-content');
  const transmission = document.getElementById('career-announcer-text');
  const transmissionSource = document.getElementById('career-announcer-source');
  let requestRevision = 0;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  function setVisible(visible) {
    panel?.classList.toggle('visible', visible);
    panel?.setAttribute('aria-hidden', String(!visible));
  }

  function renderStats(rawStats, { cached = false } = {}) {
    const view = buildCareerViewModel(rawStats, { themeName, controlName });
    setText('career-food-value', view.totalFoodText);
    setText('career-time-value', view.activeTimeText);
    setText('career-runs-value', view.totalRunsText);
    setText('career-distance-value', view.distanceText);
    setText('career-longest-value', view.longestSnakeText);
    setText('career-turns-value', view.totalTurnsText);
    setText('career-deaths-value', view.totalDeathsText);
    setText('career-walls-value', view.wallDeathsText);
    setText('career-self-value', view.selfDeathsText);
    setText('career-theme-value', view.favoriteThemeText);
    setText('career-control-value', view.favoriteControlText);
    const since = rawStats.tracking_since || rawStats.trackingSince;
    setText('career-tracking-since', since
      ? `TRACKING SINCE ${new Date(since).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}`
      : 'THE LEDGER HAS JUST OPENED');
    source.textContent = cached ? 'OFFLINE SNAPSHOT' : 'LIVE LEDGER';
    source.classList.toggle('cached', cached);
    status.hidden = true;
    content.hidden = false;
    return view;
  }

  async function open() {
    const revision = ++requestRevision;
    const identity = getIdentity?.() || {};
    playerPanel?.classList.remove('visible');
    setVisible(true);
    content.hidden = true;
    status.hidden = false;
    status.textContent = 'READING THE ARCADE LEDGER...';
    source.textContent = 'SYNCING';
    source.classList.remove('cached');
    transmission.textContent = 'TUNING THE CABINET RADIO...';
    transmissionSource.textContent = 'ARCADE ANNOUNCER';
    if (!identity.user?.id || !identity.profile) {
      title.textContent = 'PLAYER REQUIRED';
      status.textContent = 'CHOOSE ARCADE INITIALS TO START YOUR CAREER LEDGER.';
      return;
    }
    title.textContent = identity.profile.display_name || `${identity.profile.initials}·${identity.profile.player_code}`;

    const [statsResult, catalogResult, historyResult] = await Promise.allSettled([
      careerStatsService.loadStats({ user: identity.user }),
      announcerService.loadCatalog(),
      announcerService.loadHistory()
    ]);
    if (revision !== requestRevision || !panel.classList.contains('visible')) return;

    let rawStats = statsResult.status === 'fulfilled' ? statsResult.value : null;
    let cached = false;
    if (!rawStats) {
      rawStats = careerStatsService.loadCachedStats({ user: identity.user });
      cached = !!rawStats;
    }
    if (!rawStats) {
      status.textContent = 'THE LEDGER IS OFFLINE. PLAY DATA IS SAFE; TRY AGAIN WHEN THE CABINET RECONNECTS.';
      source.textContent = 'SIGNAL LOST';
      source.classList.add('cached');
      return;
    }

    renderStats(rawStats, { cached });
    const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
    const identityTokens = {
      displayName: identity.profile.display_name || '',
      initials: identity.profile.initials || '',
      favoriteTheme: themeName(rawStats.favorite_theme || rawStats.favoriteTheme || ''),
      favoriteControl: controlName(rawStats.favorite_control || rawStats.favoriteControl || '')
    };
    const seed = todaySeed(identity, rawStats);
    const liveLine = catalogResult.status === 'fulfilled'
      ? selectCatalogAnnouncerLine({
          catalog: catalogResult.value, stats: rawStats, history, identity: identityTokens, seed
        })
      : null;
    const line = liveLine || selectAnnouncerLine({ stats: rawStats, history, seed });
    transmission.textContent = line.text;
    transmissionSource.textContent = liveLine ? 'LIVE ARCADE TRANSMISSION' : 'CABINET RESERVE TRANSMISSION';
    announcerService.recordImpression(line).catch(() => {});
  }

  function close() {
    requestRevision++;
    setVisible(false);
    playerPanel?.classList.add('visible');
  }

  function bind() {
    launchButton?.addEventListener('click', open);
    closeButton?.addEventListener('click', close);
    panel?.addEventListener('click', event => { if (event.target === panel) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panel?.classList.contains('visible')) close();
    });
  }

  return { bind, open, close };
}
