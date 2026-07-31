const DEFAULT_SNAPSHOT_INTERVAL_MS = 67;
const MIN_SNAPSHOT_INTERVAL_MS = 16;
const MAX_SNAPSHOT_INTERVAL_MS = 250;
const MAX_EXTRAPOLATION = 0.35;

function clampSnapshotInterval(value) {
  return Math.max(
    MIN_SNAPSHOT_INTERVAL_MS,
    Math.min(MAX_SNAPSHOT_INTERVAL_MS, Number(value) || DEFAULT_SNAPSHOT_INTERVAL_MS)
  );
}

function requiresCorrectionSnap(snake, previousSnapshot, sequence) {
  const previousSnake = previousSnapshot?.snake;
  if (!previousSnake?.length || previousSnake.length !== snake.length) return true;
  const previousSequence = Number(previousSnapshot?.sequence);
  if (Number.isFinite(previousSequence) && Number.isFinite(sequence) && sequence - previousSequence > 3) return true;
  return snake.some((segment, index) => {
    const previous = previousSnake[index];
    return !previous || Math.abs(segment.x - previous.x) > 2 || Math.abs(segment.y - previous.y) > 2;
  });
}

export function decodeSpectatorSnapshot(payload, previousSnapshot = null) {
  const snake = Array.isArray(payload?.snake)
    ? payload.snake
        .filter(point => Array.isArray(point) && point.length >= 2)
        .map(([x, y]) => ({ x: Number(x), y: Number(y) }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];
  const direction = Array.isArray(payload?.direction)
    ? { x: Number(payload.direction[0]) || 0, y: Number(payload.direction[1]) || 0 }
    : { x: 1, y: 0 };
  const food = Array.isArray(payload?.food)
    ? { x: Number(payload.food[0]), y: Number(payload.food[1]) }
    : null;
  const receivedAt = Number(payload?.receivedAt) || Date.now();
  const observedInterval = previousSnapshot?.receivedAt
    ? receivedAt - Number(previousSnapshot.receivedAt)
    : DEFAULT_SNAPSHOT_INTERVAL_MS;
  const intervalMs = clampSnapshotInterval(payload?.intervalMs || observedInterval);
  const previousSnake = requiresCorrectionSnap(snake, previousSnapshot, Number(payload?.sequence))
    ? snake
    : previousSnapshot.snake;

  return {
    ...payload,
    snake,
    previousSnake,
    direction,
    food: food && Number.isFinite(food.x) && Number.isFinite(food.y) ? food : null,
    score: Math.max(0, Number(payload?.score) || 0),
    remainingMs: Math.max(0, Number(payload?.remainingMs) || 0),
    alive: payload?.alive !== false,
    receivedAt,
    intervalMs
  };
}

// Produces a render-only position between authoritative network snapshots.
// A short extrapolation window hides a late packet, but never advances more
// than 35% of one snapshot movement beyond the newest server state.
export function interpolateRivalGhost(snapshot, now = Date.now()) {
  if (!snapshot?.snake?.length) return { snake: [], progress: 1, extrapolating: false };
  const intervalMs = clampSnapshotInterval(snapshot.intervalMs);
  const age = Math.max(0, Number(now) - (Number(snapshot.receivedAt) || Number(now)));
  const progress = Math.min(1 + MAX_EXTRAPOLATION, age / intervalMs);
  const previousSnake = snapshot.previousSnake?.length === snapshot.snake.length
    ? snapshot.previousSnake
    : snapshot.snake;
  const snake = snapshot.snake.map((segment, index) => {
    const previous = previousSnake[index] || segment;
    const dx = segment.x - previous.x;
    const dy = segment.y - previous.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) return { ...segment };
    return {
      x: previous.x + dx * progress,
      y: previous.y + dy * progress
    };
  });
  return { snake, progress, extrapolating: progress > 1 };
}

export function spectatorRemainingMs(snapshot, now = Date.now()) {
  if (!snapshot) return 0;
  const age = Math.max(0, now - (Number(snapshot.receivedAt) || now));
  return Math.max(0, (Number(snapshot.remainingMs) || 0) - age);
}

export function spectatorFeedStatus(snapshot, now = Date.now()) {
  if (!snapshot) return 'syncing';
  const age = Math.max(0, now - (Number(snapshot.receivedAt) || now));
  if (age <= 1500) return 'live';
  if (age <= 5000) return 'reconnecting';
  return 'signal-lost';
}
