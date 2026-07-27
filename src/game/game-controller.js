// Owns requestAnimationFrame lifetime and its simulation clock. Gameplay
// rules stay outside this module: each frame is delegated to a supplied
// callback with a clamped delta and an explicit accumulator.
export function createGameController({
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
  now = () => performance.now()
} = {}) {
  let animationFrameId = null;
  let lastTick = 0;
  let frameCallback = null;
  const clock = { tickAccum: 0 };

  function resetClock() {
    lastTick = now();
    clock.tickAccum = 0;
  }

  function stop() {
    if (animationFrameId !== null) cancelFrame(animationFrameId);
    animationFrameId = null;
    frameCallback = null;
  }

  function run(frameNow) {
    animationFrameId = null;
    if (!frameCallback) return;

    const rawDt = Math.max(0, frameNow - lastTick);
    const dt = Math.min(rawDt, 100);
    lastTick = frameNow;
    const shouldContinue = frameCallback({ rawDt, dt, clock });

    if (shouldContinue !== false && frameCallback) {
      animationFrameId = requestFrame(run);
    } else {
      frameCallback = null;
    }
  }

  function start(callback) {
    stop();
    frameCallback = callback;
    resetClock();
    animationFrameId = requestFrame(run);
  }

  return {
    start,
    stop,
    resetClock,
    get active() { return animationFrameId !== null || frameCallback !== null; },
    get clock() { return clock; }
  };
}
