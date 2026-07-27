// Coordinates the irreversible boundaries of a run. The app supplies the
// UI, audio, renderer, and persistence work as callbacks; this module keeps
// their ordering consistent and owns the delayed result handoff.
export function createRunLifecycle({ controller, schedule = setTimeout } = {}) {
  if (!controller || typeof controller.start !== 'function' || typeof controller.stop !== 'function') {
    throw new TypeError('A game controller with start and stop methods is required.');
  }

  function begin({ prepare, reset, afterReset, frame }) {
    controller.stop();
    prepare?.();
    reset?.();
    afterReset?.();
    controller.start(frame);
  }

  function finish({ isActive, markFinished, finalize, resolveOutcome, showResult }) {
    if (!isActive?.()) return false;
    markFinished?.();
    finalize?.();
    const delayMs = Number(resolveOutcome?.() || 0);
    schedule(showResult, Math.max(0, delayMs));
    return true;
  }

  return { begin, finish };
}
