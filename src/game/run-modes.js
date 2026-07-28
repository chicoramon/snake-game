export const SPRINT_DURATION_MS = 60_000;
export const RUN_COUNTDOWN_MS = 3_000;

export function modeHudLabel(mode) {
  if (mode === 'daily') return 'DAILY';
  return mode === 'sprint' ? 'SPRINT' : 'CLASSIC';
}

export function isTimedMode(mode) {
  return mode === 'sprint' || mode === 'daily';
}

export function formatTimedRunTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function createTimedRunState({ mode, dailyDurationMs = SPRINT_DURATION_MS } = {}) {
  const durationMs = mode === 'daily' ? dailyDurationMs : SPRINT_DURATION_MS;
  return {
    durationMs,
    remainingMs: durationMs,
    countdownMs: isTimedMode(mode) ? RUN_COUNTDOWN_MS : 0
  };
}

export function advanceCountdown(remainingMs, elapsedMs) {
  return Math.max(0, remainingMs - Math.max(0, elapsedMs));
}

export function advanceSprintTimer(remainingMs, elapsedMs) {
  return Math.max(0, remainingMs - Math.max(0, elapsedMs));
}

// Daily Run time is simulation time, not wall-clock time. Clamp each frame so
// a fixed-step replay can never run beyond the shared challenge duration.
export function accumulateDailyFrame({ durationMs, elapsedMs, tickAccum, frameMs }) {
  const activeElapsedMs = Math.max(0, elapsedMs) + Math.max(0, tickAccum);
  const acceptedMs = Math.min(Math.max(0, frameMs), Math.max(0, durationMs - activeElapsedMs));
  const nextTickAccum = Math.max(0, tickAccum) + acceptedMs;
  return {
    acceptedMs,
    tickAccum: nextTickAccum,
    remainingMs: Math.max(0, durationMs - Math.max(0, elapsedMs) - nextTickAccum)
  };
}
