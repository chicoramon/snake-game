const DAY_MS = 24 * 60 * 60 * 1000;

const OPENERS = Object.freeze([
  ['historians', 'The arcade historians confirm:'],
  ['sources', 'Sources inside the cabinet report:'],
  ['calculations', 'After several unnecessary calculations:'],
  ['official', 'The official snake ledger declares:'],
  ['breaking', 'Breaking news from the pixel desk:']
]);

const RULES = Object.freeze([
  {
    id: 'food-banquet', family: 'food-appetite', category: 'food', min: 25,
    value: stats => stats.totalFood,
    reactions: [
      ['snacks', stats => `you have devoured ${formatNumber(stats.totalFood)} snacks.`],
      ['menu', stats => `${formatNumber(stats.totalFood)} food items have vanished on your watch.`],
      ['appetite', stats => `your appetite has reached ${formatNumber(stats.totalFood)} confirmed bites.`]
    ],
    punchlines: [
      ['nutrition', 'Nutritionists have stopped returning our calls.'],
      ['buffet', 'The buffet has requested a transfer.'],
      ['crumbs', 'No crumbs survived the investigation.']
    ]
  },
  {
    id: 'wall-rival', family: 'wall-rivalry', category: 'deaths', min: 3,
    value: stats => stats.wallDeaths,
    reactions: [
      ['meetings', stats => `you have personally met a wall ${formatNumber(stats.wallDeaths)} times.`],
      ['record', stats => `the walls lead your head-to-head series ${formatNumber(stats.wallDeaths)}–0.`]
    ],
    punchlines: [
      ['regards', 'The north wall sends its regards.'],
      ['restraining', 'Architectural surfaces are considering a restraining order.'],
      ['unbeaten', 'Brick remains undefeated.']
    ]
  },
  {
    id: 'self-rival', family: 'self-rivalry', category: 'deaths', min: 3,
    value: stats => stats.selfDeaths,
    reactions: [
      ['collisions', stats => `${formatNumber(stats.selfDeaths)} investigations have pointed back at the snake.`],
      ['rival', stats => `your greatest rival has defeated you ${formatNumber(stats.selfDeaths)} times.`]
    ],
    punchlines: [
      ['mirror', 'The suspect was last seen in the mirror.'],
      ['development', 'Character development remains ongoing.'],
      ['inside', 'The danger was inside the noodle all along.']
    ]
  },
  {
    id: 'distance-no-legs', family: 'distance-travel', category: 'distance', min: 250,
    value: stats => stats.distanceCells,
    reactions: [
      ['cells', stats => `you have travelled ${formatNumber(stats.distanceCells)} grid cells.`],
      ['boards', stats => `your travels equal ${formatDecimal(stats.distanceCells / 640)} full board-length tours.`]
    ],
    punchlines: [
      ['legs', 'Still no legs.'],
      ['passport', 'The passport office remains unconvinced.'],
      ['road', 'The road was long, rectangular, and suspiciously familiar.']
    ]
  },
  {
    id: 'playtime-shift', family: 'playtime', category: 'time', min: 10 * 60 * 1000,
    value: stats => stats.activeMs,
    reactions: [
      ['clocked', stats => `you have clocked ${formatDuration(stats.activeMs)} of active snake duty.`],
      ['service', stats => `${formatDuration(stats.activeMs)} have been donated to the pursuit of food.`]
    ],
    punchlines: [
      ['benefits', 'Benefits remain under negotiation.'],
      ['timesheet', 'The timesheet simply says “hiss.”'],
      ['productive', 'Management calls this extremely productive.']
    ]
  },
  {
    id: 'turns-roadmap', family: 'turning', category: 'controls', min: 100,
    value: stats => stats.totalTurns,
    reactions: [
      ['directions', stats => `you have changed direction ${formatNumber(stats.totalTurns)} times.`],
      ['turns', stats => `${formatNumber(stats.totalTurns)} turns have been officially recorded.`]
    ],
    punchlines: [
      ['roadmap', 'Your development roadmap remains flexible.'],
      ['commitment', 'Commitment to one direction was never the plan.'],
      ['compass', 'The compass has filed for early retirement.']
    ]
  },
  {
    id: 'runs-veteran', family: 'run-count', category: 'runs', min: 10,
    value: stats => stats.totalRuns,
    reactions: [
      ['sorties', stats => `${formatNumber(stats.totalRuns)} runs have left the launch screen.`],
      ['career', stats => `career run number ${formatNumber(stats.totalRuns)} is now in the archive.`]
    ],
    punchlines: [
      ['retirement', 'Retirement remains purely theoretical.'],
      ['cabinet', 'The cabinet remembers every one.'],
      ['again', '“One more game” remains technically accurate.']
    ]
  }
]);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function normalizeCareerStats(stats = {}) {
  return {
    totalFood: number(stats.totalFood ?? stats.total_food),
    activeMs: number(stats.activeMs ?? stats.active_ms),
    totalRuns: number(stats.totalRuns ?? stats.total_runs),
    totalDeaths: number(stats.totalDeaths ?? stats.total_deaths),
    wallDeaths: number(stats.wallDeaths ?? stats.wall_deaths),
    selfDeaths: number(stats.selfDeaths ?? stats.self_deaths),
    distanceCells: number(stats.distanceCells ?? stats.distance_cells),
    totalTurns: number(stats.totalTurns ?? stats.total_turns),
    longestSnake: number(stats.longestSnake ?? stats.longest_snake),
    timedFinishes: number(stats.timedFinishes ?? stats.timed_finishes),
    interruptedRuns: number(stats.interruptedRuns ?? stats.interrupted_runs),
    dailyRuns: number(stats.dailyRuns ?? stats.daily_runs),
    dailyWins: number(stats.dailyWins ?? stats.daily_wins),
    vsRounds: number(stats.vsRounds ?? stats.vs_rounds),
    vsWins: number(stats.vsWins ?? stats.vs_wins),
    favoriteTheme: String(stats.favoriteTheme ?? stats.favorite_theme ?? ''),
    favoriteControl: String(stats.favoriteControl ?? stats.favorite_control ?? ''),
    trackingSince: stats.trackingSince ?? stats.tracking_since ?? null
  };
}

function formatNumber(value) {
  return Math.round(number(value)).toLocaleString('en-US');
}

function formatDecimal(value) {
  return number(value).toFixed(value >= 10 ? 0 : 1);
}

function formatDuration(ms) {
  if (number(ms) < 60000) return 'less than a minute';
  const minutes = Math.round(number(ms) / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value || 'snake')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const METRIC_KEYS = Object.freeze({
  total_food: 'totalFood', active_ms: 'activeMs', total_runs: 'totalRuns',
  total_deaths: 'totalDeaths', wall_deaths: 'wallDeaths', self_deaths: 'selfDeaths',
  distance_cells: 'distanceCells', total_turns: 'totalTurns', longest_snake: 'longestSnake',
  daily_runs: 'dailyRuns', daily_wins: 'dailyWins', vs_rounds: 'vsRounds', vs_wins: 'vsWins'
});

const OPERATORS = Object.freeze({
  gte: (value, threshold) => value >= threshold,
  lte: (value, threshold) => value <= threshold,
  gt: (value, threshold) => value > threshold,
  lt: (value, threshold) => value < threshold,
  eq: (value, threshold) => value === threshold
});

function choose(list, seed, salt) {
  return list[hashSeed(`${seed}:${salt}`) % list.length];
}

function formatTemplateValue(key, stats, identity) {
  if (key === 'display_name') return identity.displayName || identity.initials || 'Player';
  if (key === 'initials') return identity.initials || '???';
  if (key === 'favorite_theme') return identity.favoriteTheme || stats.favoriteTheme || 'the arcade';
  if (key === 'favorite_control') return identity.favoriteControl || stats.favoriteControl || 'mystery controls';
  if (key === 'active_ms') return formatDuration(stats.activeMs);
  const metric = METRIC_KEYS[key];
  return metric ? formatNumber(stats[metric]) : '';
}

export function renderAnnouncerTemplate(template, rawStats = {}, identity = {}) {
  const stats = normalizeCareerStats(rawStats);
  // active_ms renders as a complete, human-readable duration (for example,
  // "5 minutes"). Strip a mistakenly generated unit suffix so an already
  // published line cannot produce "5 minutes milliseconds" in the client.
  const normalizedTemplate = String(template || '').replace(
    /\{active_ms\}\s*(?:ms|milliseconds?|seconds?|minutes?|hours?)\b/gi,
    '{active_ms}'
  );
  return normalizedTemplate.replace(/\{([a-z0-9_]+)\}/gi, (_match, key) => (
    formatTemplateValue(String(key).toLowerCase(), stats, identity)
  ));
}

export function isAnnouncerConditionMet(condition, rawStats = {}) {
  const metric = METRIC_KEYS[condition?.metric];
  const compare = OPERATORS[condition?.operator];
  const threshold = Number(condition?.threshold);
  // Daily/Vs fields are intentionally absent until their authoritative server
  // aggregation is added. Do not turn missing facts into a misleading zero.
  if (!metric || !compare || !Number.isFinite(threshold)) return false;
  const rawValue = rawStats[metric] ?? rawStats[condition.metric];
  if (rawValue == null || !Number.isFinite(Number(rawValue))) return false;
  return compare(Number(rawValue), threshold);
}

function weightedChoice(candidates, seed) {
  const total = candidates.reduce((sum, item) => sum + Math.max(0.1, Number(item.weight) || 1), 0);
  let cursor = (hashSeed(`${seed}:remote-candidate`) / 0x100000000) * total;
  for (const item of candidates) {
    cursor -= Math.max(0.1, Number(item.weight) || 1);
    if (cursor < 0) return item;
  }
  return candidates.at(-1);
}

export function selectCatalogAnnouncerLine({
  catalog = [], stats = {}, history = [], identity = {}, seed = 'snake', now = Date.now()
} = {}) {
  const historyByMessage = new Map((history || []).map(item => [item.messageKey || item.message_key, item]));
  const recentFamilyTimes = new Map();
  for (const item of history || []) {
    const family = item.familyKey || item.family_key;
    const shownAt = new Date(item.lastShownAt || item.last_shown_at || 0).getTime();
    if (family && shownAt) recentFamilyTimes.set(family, Math.max(shownAt, recentFamilyTimes.get(family) || 0));
  }
  const eligible = (catalog || []).filter(line => {
    if (!line?.messageKey || !line?.familyKey || !line?.template) return false;
    if (!isAnnouncerConditionMet(line.conditions, stats)) return false;
    const itemHistory = historyByMessage.get(line.messageKey);
    const maxImpressions = Number(line.maxImpressions);
    if (Number.isFinite(maxImpressions) && maxImpressions > 0 && Number(itemHistory?.impressions || 0) >= maxImpressions) return false;
    const lastFamilyUse = recentFamilyTimes.get(line.familyKey);
    const cooldownMs = Math.max(1, Number(line.cooldownDays) || 30) * DAY_MS;
    return !lastFamilyUse || now - lastFamilyUse >= cooldownMs;
  });
  const selected = weightedChoice(eligible, seed);
  if (!selected) return null;
  return {
    messageKey: selected.messageKey,
    familyKey: selected.familyKey,
    category: selected.category || 'career',
    cooldownDays: Math.max(1, Number(selected.cooldownDays) || 30),
    text: renderAnnouncerTemplate(selected.template, stats, identity),
    source: 'live'
  };
}

function recentFamilies(history, now) {
  const families = new Set();
  for (const item of history || []) {
    const shownAt = new Date(item.lastShownAt || item.last_shown_at || 0).getTime();
    const cooldownDays = Math.max(1, Number(item.cooldownDays || item.cooldown_days) || 30);
    if (shownAt && now - shownAt < cooldownDays * DAY_MS) families.add(item.familyKey || item.family_key);
  }
  return families;
}

export function buildAnnouncerCandidates(rawStats = {}, { seed = 'snake' } = {}) {
  const stats = normalizeCareerStats(rawStats);
  return RULES.filter(rule => rule.value(stats) >= rule.min).map(rule => {
    const opener = choose(OPENERS, seed, `${rule.id}:opener`);
    const reaction = choose(rule.reactions, seed, `${rule.id}:reaction`);
    const punchline = choose(rule.punchlines, seed, `${rule.id}:punchline`);
    return {
      messageKey: `${rule.id}:${opener[0]}:${reaction[0]}:${punchline[0]}`,
      familyKey: rule.family,
      category: rule.category,
      cooldownDays: 30,
      text: `${opener[1]} ${reaction[1](stats)} ${punchline[1]}`
    };
  });
}

export function selectAnnouncerLine({ stats, history = [], seed = 'snake', now = Date.now() } = {}) {
  const candidates = buildAnnouncerCandidates(stats, { seed });
  if (!candidates.length) {
    return {
      messageKey: 'welcome:first-shift',
      familyKey: 'welcome',
      category: 'career',
      cooldownDays: 7,
      text: 'The arcade ledger is open. Go give it something unreasonable to record.'
    };
  }
  const recent = recentFamilies(history, now);
  const unseen = candidates.filter(candidate => !recent.has(candidate.familyKey));
  return choose(unseen.length ? unseen : candidates, seed, 'candidate');
}

export const ARCADE_ANNOUNCER_SCHEMA_VERSION = 1;
