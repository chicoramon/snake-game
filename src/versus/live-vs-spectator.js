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

  return {
    ...payload,
    snake,
    previousSnake: previousSnapshot?.snake?.length ? previousSnapshot.snake : snake,
    direction,
    food: food && Number.isFinite(food.x) && Number.isFinite(food.y) ? food : null,
    score: Math.max(0, Number(payload?.score) || 0),
    remainingMs: Math.max(0, Number(payload?.remainingMs) || 0),
    alive: payload?.alive !== false,
    receivedAt: Number(payload?.receivedAt) || Date.now(),
    intervalMs: 100
  };
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
