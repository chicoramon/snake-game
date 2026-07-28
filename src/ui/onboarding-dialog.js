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
  const trainingPad = document.getElementById('control-training-pad');
  const trainingMessage = document.getElementById('control-training-message');
  const steps = [...panel.querySelectorAll('[data-onboarding-step]')];
  const state = { ...loadProgress(storage), control: null, turns: 0 };
  if (force) {
    state.completed = false;
    state.step = 0;
  }

  function save() {
    try { storage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: state.completed, step: state.step })); } catch {}
  }

  function render() {
    steps.forEach((step, index) => step.hidden = index !== state.step);
    progressEl.textContent = `${state.step + 1} / ${steps.length}`;
    backButton.hidden = state.step === 0;
    nextButton.hidden = false;
    nextButton.disabled = state.step === 1 && state.turns < 2;
    if (state.step === 0) {
      nextButton.textContent = 'START TOUR';
    } else if (state.step === 1 && state.turns < 2) {
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
    state.turns = 0;
    panel.querySelectorAll('[data-onboarding-control]').forEach(card => {
      const active = card === button;
      card.classList.toggle('selected', active);
      card.setAttribute('aria-pressed', String(active));
    });
    trainingPad.dataset.mode = mode;
    trainingPad.hidden = false;
    trainingMessage.textContent = mode === 'tap'
      ? 'Tap LEFT, then RIGHT on the training board.'
      : mode === 'turn'
        ? 'Use LEFT TURN, then RIGHT TURN.'
        : 'Use the D-PAD turns: LEFT, then RIGHT.';
    onControlSelect(mode);
    render();
  }

  function train(side) {
    if (!state.control || state.turns >= 2) return;
    const expected = state.turns === 0 ? 'left' : 'right';
    if (side !== expected) {
      trainingMessage.textContent = `TRY ${expected.toUpperCase()} FIRST`;
      return;
    }
    state.turns++;
    trainingPad.dataset.turns = String(state.turns);
    trainingMessage.textContent = state.turns === 1
      ? 'NICE TURN! NOW GO RIGHT.'
      : 'CONTROL LOCKED IN. YOU ARE READY.';
    render();
  }

  function open({ restart = false } = {}) {
    if (restart) {
      state.step = 0;
      state.turns = 0;
    }
    onBeforeOpen();
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    render();
    setTimeout(() => panel.querySelector('[data-onboarding-control]')?.focus(), 0);
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
    if (state.step === 1 && state.turns < 2) return;
    if (state.step >= steps.length - 1) {
      close({ completed: true, restoreFocus: false });
      onPlay();
      return;
    }
    state.step++;
    save();
    render();
  }

  function bind() {
    helpButton?.addEventListener('click', () => open({ restart: true }));
    nextButton?.addEventListener('click', advance);
    backButton?.addEventListener('click', () => {
      if (state.step === 0) return;
      state.step--;
      save();
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
      button.addEventListener('click', () => {
        panel.querySelectorAll('[data-onboarding-mode]').forEach(card => card.classList.toggle('selected', card === button));
        onGameModeSelect(button.dataset.onboardingMode);
      });
    });
    panel.querySelector('[data-onboarding-save-player]')?.addEventListener('click', () => {
      close({ completed: true, restoreFocus: false });
      onOpenPlayer();
    });
    trainingPad?.addEventListener('click', event => {
      const side = event.target.closest('[data-training-turn]')?.dataset.trainingTurn;
      if (side) train(side);
    });
    panel.addEventListener('click', event => {
      if (event.target === panel) close({ completed: true });
    });
    panel.addEventListener('keydown', event => {
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
