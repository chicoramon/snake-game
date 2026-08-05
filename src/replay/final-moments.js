export const FINAL_MOMENTS_WINDOW_MS = 8000;
export const FINAL_MOMENTS_PLAYBACK_MS = 6000;

function copyPoint(point) {
  return point ? { x: Number(point.x), y: Number(point.y) } : null;
}

function cloneSnapshot(snapshot, atMs) {
  return Object.freeze({
    atMs,
    snake: Object.freeze((snapshot.snake || []).map(copyPoint)),
    direction: copyPoint(snapshot.direction) || { x: 1, y: 0 },
    food: copyPoint(snapshot.food),
    score: Math.max(0, Math.trunc(Number(snapshot.score) || 0)),
    speed: Math.max(1, Number(snapshot.speed) || 110),
    remainingMs: Number.isFinite(snapshot.remainingMs) ? Math.max(0, snapshot.remainingMs) : null,
    themeId: snapshot.themeId || 'default',
    speedProgress: Math.max(0, Math.min(1, Number(snapshot.speedProgress) || 0)),
    sonicBoomed: snapshot.sonicBoomed === true,
    event: snapshot.event || 'move'
  });
}

export function createFinalMomentsRecorder({ windowMs = FINAL_MOMENTS_WINDOW_MS } = {}) {
  let elapsedMs = 0;
  let snapshots = [];
  let metadata = {};
  let frozen = false;

  function begin(nextMetadata = {}) {
    elapsedMs = 0;
    snapshots = [];
    metadata = { ...nextMetadata };
    frozen = false;
  }

  function advance(dt) {
    if (frozen) return elapsedMs;
    elapsedMs += Math.max(0, Number(dt) || 0);
    return elapsedMs;
  }

  function capture(snapshot, { event } = {}) {
    if (frozen || !snapshot?.snake?.length || !snapshot.food) return false;
    const previous = snapshots[snapshots.length - 1];
    const derivedEvent = event
      || (previous && Number(snapshot.score) > previous.score ? 'eat' : snapshot.event)
      || 'move';
    snapshots.push(cloneSnapshot({ ...snapshot, event: derivedEvent }, elapsedMs));

    const cutoff = Math.max(0, elapsedMs - Math.max(1000, windowMs));
    while (snapshots.length > 2 && snapshots[1].atMs < cutoff) snapshots.shift();
    return true;
  }

  function freeze(summary = {}) {
    frozen = true;
    if (snapshots.length === 1) snapshots.push(cloneSnapshot(snapshots[0], snapshots[0].atMs + 1));
    if (snapshots.length < 2) return null;
    const startedAtMs = snapshots[0].atMs;
    const normalized = snapshots.map(snapshot => Object.freeze({
      ...snapshot,
      atMs: Math.max(0, snapshot.atMs - startedAtMs)
    }));
    return Object.freeze({
      formatVersion: 1,
      durationMs: normalized[normalized.length - 1].atMs,
      snapshots: Object.freeze(normalized),
      metadata: Object.freeze({ ...metadata }),
      summary: Object.freeze({ ...summary })
    });
  }

  return { begin, advance, capture, freeze, get elapsedMs() { return elapsedMs; } };
}

// The first 80% of playback covers most of the source window. The final 5%
// of the source is stretched across the last 20% for the impact slow-down.
export function replaySourceTime(clip, playbackElapsedMs, playbackDurationMs = FINAL_MOMENTS_PLAYBACK_MS) {
  const duration = Math.max(1, Number(clip?.durationMs) || 1);
  const progress = Math.max(0, Math.min(1, playbackElapsedMs / Math.max(1, playbackDurationMs)));
  const sourceProgress = progress < 0.8
    ? 0.95 * (progress / 0.8)
    : 0.95 + 0.05 * ((progress - 0.8) / 0.2);
  return duration * Math.max(0, Math.min(1, sourceProgress));
}

export function sampleFinalMoments(clip, sourceTimeMs) {
  const snapshots = clip?.snapshots || [];
  if (!snapshots.length) return null;
  if (snapshots.length === 1 || sourceTimeMs <= snapshots[0].atMs) {
    return { previous: snapshots[0], current: snapshots[0], interpolation: 1, index: 0 };
  }
  for (let index = 1; index < snapshots.length; index++) {
    const current = snapshots[index];
    if (sourceTimeMs <= current.atMs) {
      const previous = snapshots[index - 1];
      const span = Math.max(1, current.atMs - previous.atMs);
      return {
        previous,
        current,
        interpolation: Math.max(0, Math.min(1, (sourceTimeMs - previous.atMs) / span)),
        index
      };
    }
  }
  const lastIndex = snapshots.length - 1;
  return { previous: snapshots[lastIndex], current: snapshots[lastIndex], interpolation: 1, index: lastIndex };
}

export function finalMomentsCaption(summary = {}) {
  const score = Math.max(0, Number(summary.score) || 0);
  const topScore = Number(summary.topScore);
  if (Number.isFinite(topScore)) {
    if (score > topScore) return 'NEW #1';
    if (score === topScore) return 'ONE BITE SHORT';
    if (topScore - score === 1) return 'TWO BITES FROM GLORY';
  }
  return summary.reason === 'time' ? 'FINAL SECONDS' : 'FINAL MOMENTS';
}
