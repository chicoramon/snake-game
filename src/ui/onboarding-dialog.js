const ONBOARDING_KEY = 'snake_onboarding_v1';

function loadProgress(storage) {
  try {
    const savedValue = storage.getItem(ONBOARDING_KEY);
    if (savedValue) {
      const saved = JSON.parse(savedValue);
      return {
        completed: saved.completed === true,
        step: Math.max(0, Math.min(4, Number(saved.step) || 0))
      };
    }

    // The app writes several preferences during startup, so only this
    // dedicated completion marker can reliably tell us whether the tour was
    // already shown. Existing installations therefore see it once, then can
    // replay it only through the Help button.
    return { completed: false, step: 0 };
  } catch {
    return { completed: false, step: 0 };
  }
}

export function createOnboardingDialog({
  onControlSelect = () => {},
  onGameModeSelect = () => {},
  onOpenPlayer = () => {},
  onPlay = () => {},
  onBeforeOpen = () => {},
  onAfterClose = () => {},
  menuAudio = null,
  force = false,
  storage = window.localStorage
} = {}) {
  const panel = document.getElementById('onboarding-panel');
  const helpButton = document.getElementById('how-to-play-btn');
  const progressEl = document.getElementById('onboarding-progress');
  const nextButton = document.getElementById('onboarding-next');
  const backButton = document.getElementById('onboarding-back');
  const skipButton = document.getElementById('onboarding-skip');
  const playButton = document.getElementById('onboarding-play-now');
  const screen = panel.querySelector('.onboarding-screen');
  const trainingPad = document.getElementById('control-training-pad');
  const trainingMessage = document.getElementById('control-training-message');
  const trainingControlLabel = document.getElementById('trainer-control-label');
  const modeStatus = document.getElementById('onboarding-mode-status');
  const stageLabel = document.getElementById('onboarding-stage-label');
  const steps = [...panel.querySelectorAll('[data-onboarding-step]')];
  const progressPips = [...panel.querySelectorAll('[data-onboarding-pip]')];
  const stageLabels = ['Boot Sequence', 'Control System', 'Mission Select', 'Ranked Network', 'Player Legacy'];
  const controlLabels = { tap: 'Tap Grid', turn: 'Turn Buttons', dpad: 'D-Pad' };
  const drillSequences = {
    tap: ['left', 'right'],
    turn: ['left', 'right'],
    dpad: ['up', 'left', 'down', 'right']
  };
  const drillPrompts = {
    tap: {
      left: 'Target 01 // Tap the left half.',
      right: 'Target 02 // Clean turn. Tap the right half.'
    },
    turn: {
      left: 'Target 01 // Hit the left-turn button.',
      right: 'Target 02 // Now hit the right-turn button.'
    },
    dpad: {
      up: 'Target 01 of 04 // Press Up.',
      left: 'Target 02 of 04 // Press Left.',
      down: 'Target 03 of 04 // Press Down.',
      right: 'Target 04 of 04 // Press Right.'
    }
  };
  const modeLabels = {
    classic: 'Classic selected // Endurance rules',
    sprint: 'Sprint 60 selected // One-minute attack',
    daily: 'Daily Run selected // Today’s world challenge'
  };
  const state = { ...loadProgress(storage), control: null, mode: null, turns: 0 };
  const trainingProgress = Object.fromEntries(
    Object.keys(drillSequences).map(control => [control, 0])
  );
  if (force) {
    state.completed = false;
    state.step = 0;
  }

  function save() {
    try { storage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: state.completed, step: state.step })); } catch {}
  }

  function trainingComplete() {
    return Boolean(state.control)
      && trainingProgress[state.control] >= drillSequences[state.control].length;
  }

  function renderTrainingProgress(mode) {
    const sequence = drillSequences[mode];
    const completed = trainingProgress[mode];
    state.turns = completed;
    trainingPad.dataset.turns = String(completed);
    trainingPad.querySelectorAll('.completed').forEach(target => target.classList.remove('completed'));
    sequence.slice(0, completed).forEach(input => {
      const selector = mode === 'dpad'
        ? `[data-training-dir="${input}"]`
        : `[data-training-turn="${input}"]`;
      trainingPad.querySelector(selector)?.classList.add('completed');
    });
    trainingMessage.textContent = completed >= sequence.length
      ? `${controlLabels[mode]} certified // Ready for the arcade.`
      : drillPrompts[mode][sequence[completed]];
  }

  function render() {
    panel.dataset.step = String(state.step);
    steps.forEach((step, index) => {
      const active = index === state.step;
      step.hidden = !active;
      step.classList.toggle('active', active);
    });
    progressPips.forEach((pip, index) => {
      pip.classList.toggle('complete', index < state.step);
      pip.classList.toggle('active', index === state.step);
    });
    stageLabel.textContent = stageLabels[state.step];
    progressEl.textContent = `${state.step + 1} / ${steps.length}`;
    backButton.hidden = state.step === 0;
    nextButton.hidden = false;
    nextButton.disabled = state.step === 1 && !trainingComplete();
    if (state.step === 0) {
      nextButton.textContent = 'START TOUR';
    } else if (state.step === 1 && !trainingComplete()) {
      nextButton.textContent = 'COMPLETE DRILL';
    } else if (state.step === steps.length - 1) {
      nextButton.textContent = 'LAUNCH GAME';
    } else {
      nextButton.textContent = 'NEXT';
    }
  }

  function selectControl(button) {
    const mode = button.dataset.onboardingControl;
    state.control = mode;
    panel.querySelectorAll('[data-onboarding-control]').forEach(card => {
      const active = card === button;
      card.classList.toggle('selected', active);
      card.setAttribute('aria-pressed', String(active));
    });
    trainingPad.dataset.mode = mode;
    trainingPad.hidden = false;
    trainingControlLabel.textContent = controlLabels[mode];
    renderTrainingProgress(mode);
    onControlSelect(mode);
    render();
  }

  function train(input, target) {
    if (!state.control || trainingComplete()) return;
    const sequence = drillSequences[state.control];
    const expected = sequence[state.turns];
    if (input !== expected) {
      trainingMessage.textContent = `TRY ${expected.toUpperCase()} FIRST`;
      return;
    }
    state.turns++;
    trainingProgress[state.control] = state.turns;
    trainingPad.dataset.turns = String(state.turns);
    target?.classList.add('completed');
    trainingMessage.textContent = trainingComplete()
      ? `${controlLabels[state.control]} certified // Ready for the arcade.`
      : drillPrompts[state.control][sequence[state.turns]];
    render();
  }

  function selectMode(button) {
    const mode = button.dataset.onboardingMode;
    state.mode = mode;
    panel.querySelectorAll('[data-onboarding-mode]').forEach(card => {
      const active = card === button;
      card.classList.toggle('selected', active);
      card.setAttribute('aria-pressed', String(active));
    });
    modeStatus.textContent = modeLabels[mode];
    onGameModeSelect(mode);
  }

  function resetTour() {
    state.step = 0;
    state.control = null;
    state.mode = null;
    state.turns = 0;
    Object.keys(trainingProgress).forEach(control => { trainingProgress[control] = 0; });
    trainingPad.hidden = true;
    trainingPad.dataset.mode = '';
    trainingPad.dataset.turns = '0';
    trainingControlLabel.textContent = 'Select Input';
    trainingMessage.textContent = 'Select your control system.';
    modeStatus.textContent = 'Choose a mission or continue with Classic.';
    panel.querySelectorAll('[data-onboarding-control], [data-onboarding-mode]').forEach(button => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
  }

  function open({ restart = false, userInitiated = false } = {}) {
    if (restart) resetTour();
    onBeforeOpen();
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    menuAudio?.open({ startNow: userInitiated });
    screen.scrollTop = 0;
    render();
    setTimeout(() => nextButton.focus({ preventScroll: true }), 0);
    return true;
  }

  function close({ completed = false, restoreFocus = true } = {}) {
    state.completed ||= completed;
    save();
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    onAfterClose();
    if (restoreFocus) helpButton?.focus();
  }

  function advance() {
    if (state.step === 1 && !trainingComplete()) return;
    if (state.step >= steps.length - 1) {
      close({ completed: true, restoreFocus: false });
      onPlay();
      return;
    }
    state.step++;
    save();
    screen.scrollTop = 0;
    render();
  }

  function bind() {
    helpButton?.addEventListener('click', () => open({ restart: true, userInitiated: true }));
    nextButton?.addEventListener('click', advance);
    backButton?.addEventListener('click', () => {
      if (state.step === 0) return;
      state.step--;
      save();
      screen.scrollTop = 0;
      render();
    });
    skipButton?.addEventListener('click', () => close({ completed: true }));
    playButton?.addEventListener('click', () => {
      close({ completed: true, restoreFocus: false });
      onPlay();
    });
    panel.querySelectorAll('[data-onboarding-control]').forEach(button => {
      button.addEventListener('click', () => selectControl(button));
    });
    panel.querySelectorAll('[data-onboarding-mode]').forEach(button => {
      button.addEventListener('click', () => selectMode(button));
    });
    panel.querySelector('[data-onboarding-save-player]')?.addEventListener('click', () => {
      close({ completed: true, restoreFocus: false });
      onOpenPlayer();
    });
    trainingPad?.addEventListener('click', event => {
      const target = event.target.closest('[data-training-turn], [data-training-dir]');
      const input = target?.dataset.trainingTurn || target?.dataset.trainingDir;
      if (input) train(input, target);
    });
    panel.addEventListener('click', event => {
      if (event.target === panel) close({ completed: true });
    });
    panel.addEventListener('pointerdown', event => {
      if (event.target.closest('#onboarding-skip, #onboarding-play-now')) return;
      menuAudio?.unlock();
    }, true);
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape') menuAudio?.unlock();
      if (event.key === 'Escape') close({ completed: true });
    });
  }

  function scheduleInitialOpen(delay = 120) {
    setTimeout(() => { if (!state.completed) open(); }, delay);
  }

  return {
    bind,
    close,
    hasCompleted: () => state.completed,
    isOpen: () => panel.classList.contains('visible'),
    open,
    scheduleInitialOpen
  };
}
