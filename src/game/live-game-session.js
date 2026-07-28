import {
  advanceCountdown,
  advanceSprintTimer,
  accumulateDailyFrame
} from './run-modes.js';

// Owns the live rAF-frame choreography. The app keeps its game state and UI
// decisions, while this coordinator guarantees the order of countdowns,
// simulation ticks, timed-mode clocks, effects, and the final draw.
export function createLiveGameSession({
  renderer,
  getState,
  onCountdownChange,
  onCountdownComplete,
  onSprintTimeChange,
  onDailyElapsedChange,
  onTick,
  onFinish,
  getDailyDuration,
  getFpsElement
} = {}) {
  if (!renderer || typeof getState !== 'function' || typeof onTick !== 'function') {
    throw new TypeError('renderer, getState, and onTick are required for a live game session.');
  }

  function frame({ rawDt, dt, clock }) {
    let state = getState();
    if (!state.alive && !renderer.hasActiveEffects()) return false;

    if (state.alive && !state.paused) {
      if (state.countdownActive) {
        const remainingMs = advanceCountdown(state.countdownRemainingMs, rawDt);
        onCountdownChange?.(remainingMs);
        if (remainingMs <= 0) {
          clock.tickAccum = 0;
          onCountdownComplete?.();
        }
      } else if (state.runGameMode === 'daily') {
        const durationMs = getDailyDuration?.() ?? 60000;
        const dailyFrame = accumulateDailyFrame({
          durationMs,
          elapsedMs: state.dailyTickElapsedMs,
          tickAccum: clock.tickAccum,
          frameMs: dt
        });
        clock.tickAccum = dailyFrame.tickAccum;
        let elapsedMs = state.dailyTickElapsedMs;
        while ((state = getState()).alive && clock.tickAccum >= state.speed && elapsedMs + state.speed <= durationMs) {
          const interval = state.speed;
          elapsedMs += interval;
          onTick();
          clock.tickAccum -= interval;
        }
        onDailyElapsedChange?.(elapsedMs);
        onSprintTimeChange?.(dailyFrame.remainingMs);
        if (getState().alive && dailyFrame.remainingMs <= 0) onFinish?.('time');
      } else {
        if (state.runGameMode === 'sprint') {
          const remainingMs = advanceSprintTimer(state.sprintRemainingMs, rawDt);
          onSprintTimeChange?.(remainingMs);
          if (remainingMs <= 0) onFinish?.('time');
        }
        clock.tickAccum += dt;
        while ((state = getState()).alive && clock.tickAccum >= state.speed) {
          onTick();
          clock.tickAccum -= state.speed;
        }
      }
    }

    state = getState();
    renderer.update(dt);
    renderer.draw(state.alive && !state.paused ? clock.tickAccum / state.speed : 1);
    renderer.updateFps(getFpsElement?.());
    return true;
  }

  return { frame };
}
