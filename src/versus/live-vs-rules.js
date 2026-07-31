export const LIVE_VS_MATCH_FORMATS = Object.freeze([
  'continuous',
  'best_of_3',
  'best_of_5',
  'best_of_7'
]);

export const LIVE_VS_SPEED_MULTIPLIERS = Object.freeze([1, 2, 4]);

export function normalizeLiveVsRoomSettings(settings = {}) {
  const matchFormat = LIVE_VS_MATCH_FORMATS.includes(settings.matchFormat)
    ? settings.matchFormat
    : 'continuous';
  const speedMultiplier = LIVE_VS_SPEED_MULTIPLIERS.includes(Number(settings.speedMultiplier))
    ? Number(settings.speedMultiplier)
    : 1;
  return {
    matchFormat,
    speedMultiplier,
    allowKeyboard: settings.allowKeyboard !== false,
    rivalGhostEnabled: settings.rivalGhostEnabled !== false
  };
}

export function liveVsSeriesTarget(matchFormat) {
  return ({ best_of_3: 2, best_of_5: 3, best_of_7: 4 })[matchFormat] || 0;
}

export function liveVsFormatLabel(matchFormat) {
  return ({
    best_of_3: 'BEST OF 3',
    best_of_5: 'BEST OF 5',
    best_of_7: 'BEST OF 7'
  })[matchFormat] || 'CONTINUOUS';
}

export function scaleLiveVsInterval(intervalMs, speedMultiplier = 1) {
  const multiplier = LIVE_VS_SPEED_MULTIPLIERS.includes(Number(speedMultiplier))
    ? Number(speedMultiplier)
    : 1;
  return Math.max(1, Math.round(Number(intervalMs) / multiplier));
}

export function liveVsGhostInterval(speedMultiplier = 1) {
  // Keep network traffic proportional to the room's gameplay speed. Rendering
  // remains refresh-rate smooth by interpolating between these snapshots.
  return ({ 1: 67, 2: 40, 4: 25 })[Number(speedMultiplier)] || 67;
}
