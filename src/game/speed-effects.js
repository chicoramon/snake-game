export const JET_TRAIL_START = 0.7;
export const JET_TRAIL_FULL = 0.9;
export const SONIC_BOOM_THRESHOLD = 1;

export function speedProgress({ speed, baseInterval, minInterval }) {
  const current = Number(speed);
  const base = Number(baseInterval);
  const minimum = Number(minInterval);
  const range = base - minimum;
  if (!Number.isFinite(current) || !Number.isFinite(base) || !Number.isFinite(minimum) || range <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, (base - current) / range));
}

export function jetTrailIntensity(progress) {
  const normalized = Math.max(0, Math.min(1, Number(progress) || 0));
  if (normalized <= JET_TRAIL_START) return 0;
  return Math.min(1, (normalized - JET_TRAIL_START) / (JET_TRAIL_FULL - JET_TRAIL_START));
}

export function reachedSonicBoom(progress) {
  return Number(progress) >= SONIC_BOOM_THRESHOLD;
}
