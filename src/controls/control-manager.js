import {
  connectedGamepads,
  gamepadDirection,
  gamepadPausePressed,
  shortGamepadName,
} from './gamepad-input.js';
import { createGamepadMenuNavigation } from './gamepad-menu-navigation.js';

export function createControlManager({
  canvas,
  dpad,
  turnControls,
  overlay,
  controlsBtn,
  controlsOverlay,
  controlsCustomizeBtn,
  controlsBackBtn,
  controlsDoneBtn,
  controlsResetBtn,
  initialMode,
  onModeChange,
  registerControlMethod,
  setDir,
  turnClockwise,
  turnCounterClockwise,
  togglePause,
  isRunActive,
  isPaused,
  isOverlayHidden,
  isKeyboardAllowed = () => true,
  onLayoutChange = () => {},
}) {
  let controlMode = initialMode;

// --- Bluetooth / USB game controllers ---

const gamepadStatus = document.getElementById('gamepad-status');
const gamepadDirections = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
let lastGamepadDirection = null;
let lastGamepadPause = false;
let displayedGamepadId;
const gamepadMenuNavigation = createGamepadMenuNavigation();

function updateGamepadStatus(gamepads = connectedGamepads()) {
  if (!gamepadStatus) return;
  const gamepad = gamepads[0];
  const nextId = gamepad?.id || '';
  if (displayedGamepadId === nextId) return;
  displayedGamepadId = nextId;
  gamepadStatus.classList.toggle('connected', Boolean(gamepad));
  gamepadStatus.textContent = gamepad
    ? `CONTROLLER READY • ${shortGamepadName(gamepad.id)}`
    : 'CONTROLLER • CONNECT VIA BLUETOOTH OR USB';
}

function pollGamepads() {
  const gamepads = connectedGamepads();
  const gamepad = gamepads[0];
  updateGamepadStatus(gamepads);

  const menuActive = !isRunActive() || !isOverlayHidden();
  if (!gamepad) {
    lastGamepadDirection = null;
    lastGamepadPause = false;
    gamepadMenuNavigation.reset();
    requestAnimationFrame(pollGamepads);
    return;
  }

  if (menuActive) {
    lastGamepadDirection = null;
    lastGamepadPause = false;
    gamepadMenuNavigation.update(gamepad);
    requestAnimationFrame(pollGamepads);
    return;
  }

  gamepadMenuNavigation.reset();

  const pausePressed = gamepadPausePressed(gamepad);
  if (pausePressed && !lastGamepadPause) togglePause();
  lastGamepadPause = pausePressed;
  if (isPaused()) {
    lastGamepadDirection = null;
    requestAnimationFrame(pollGamepads);
    return;
  }

  const direction = gamepadDirection(gamepad);
  if (direction && direction !== lastGamepadDirection) {
    registerControlMethod('controller');
    setDir(...gamepadDirections[direction]);
  }
  lastGamepadDirection = direction;
  requestAnimationFrame(pollGamepads);
}

window.addEventListener('gamepadconnected', () => updateGamepadStatus());
window.addEventListener('gamepaddisconnected', () => updateGamepadStatus());
updateGamepadStatus();
requestAnimationFrame(pollGamepads);

// --- Keyboard ---
document.addEventListener('keydown', e => {
  // Don't hijack keys when user is typing in an input
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const movementKey = [
    'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
    'd', 'D', 'a', 'A', 'w', 'W', 's', 'S'
  ].includes(e.key);
  if (movementKey && !isKeyboardAllowed()) {
    e.preventDefault();
    return;
  }

  switch (e.key) {

    case 'ArrowRight': case 'd': case 'D':
      e.preventDefault();
      registerControlMethod('keyboard');
      if (controlMode === 'turn' || controlMode === 'tap') { turnClockwise(); } else { setDir(1, 0); }
      break;
    case 'ArrowLeft': case 'a': case 'A':
      e.preventDefault();
      registerControlMethod('keyboard');
      if (controlMode === 'turn' || controlMode === 'tap') { turnCounterClockwise(); } else { setDir(-1, 0); }
      break;
    case 'ArrowUp': case 'w': case 'W':
      e.preventDefault();
      if (controlMode !== 'turn' && controlMode !== 'tap') { registerControlMethod('keyboard'); setDir(0, -1); }
      break;
    case 'ArrowDown': case 's': case 'S':
      e.preventDefault();
      if (controlMode !== 'turn' && controlMode !== 'tap') { registerControlMethod('keyboard'); setDir(0, 1); }
      break;
    case 'p': case 'P':
      togglePause();
      break;
  }
});


// --- Touch swipe (full canvas) ---
let touchStart = null;
let lastTapTouchAt = 0;

function tapTurnAt(clientX) {
  const bounds = canvas.getBoundingClientRect();
  registerControlMethod('tap');
  if (clientX < bounds.left + bounds.width / 2) turnCounterClockwise();
  else turnClockwise();
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (controlMode === 'tap') {
    lastTapTouchAt = performance.now();
    touchStart = null;
    tapTurnAt(e.touches[0].clientX);
    return;
  }
  touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
}, {passive: false});
canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false});
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const minSwipe = 15;
  touchStart = null;
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
  if (controlMode === 'turn') {
    registerControlMethod('turn');
    const clockwise = Math.abs(dx) > Math.abs(dy) ? dx > 0 : dy > 0;
    clockwise ? turnClockwise() : turnCounterClockwise();
  } else {
    registerControlMethod('dpad');
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }
});

canvas.addEventListener('mousedown', e => {
  if (controlMode !== 'tap' || e.button !== 0) return;
  if (performance.now() - lastTapTouchAt < 700) return;
  e.preventDefault();
  tapTurnAt(e.clientX);
});


// --- D-pad controls ---
const CONTROL_FADE_DELAY_MS = 500;
let controlFadeTimeout;

function showTouchControls() {
  clearTimeout(controlFadeTimeout);
  dpad.classList.toggle('active', controlMode === 'dpad');
  turnControls.classList.toggle('active', controlMode === 'turn');
}

function scheduleTouchControlsFade(delay = CONTROL_FADE_DELAY_MS) {
  clearTimeout(controlFadeTimeout);
  controlFadeTimeout = setTimeout(() => {
    if (dpad.classList.contains('edit-mode') || turnControls.classList.contains('edit-mode')) return;
    dpad.classList.remove('active');
    turnControls.classList.remove('active');
  }, delay);
}

function wakeTouchControls(delay = CONTROL_FADE_DELAY_MS) {
  showTouchControls();
  scheduleTouchControlsFade(delay);
}

function applyControlMode(mode) {
  if (!['dpad', 'turn', 'tap'].includes(mode)) mode = 'dpad';
  controlMode = mode;
  onModeChange(mode);
  localStorage.setItem('snake_control_mode', mode);
  onLayoutChange();
  if (mode === 'turn') {
    dpad.style.display = 'none';
    turnControls.style.display = 'flex';
  } else if (mode === 'tap') {
    dpad.style.display = 'none';
    turnControls.style.display = 'none';
  } else {
    dpad.style.display = '';
    turnControls.style.display = 'none';
  }
  document.querySelectorAll('.control-mode-btn').forEach(b => {
    const selected = b.dataset.mode === mode;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  const controlsCopy = document.querySelector('#controls-settings-panel .controls-copy');
  const controlsNote = document.querySelector('#controls-settings-panel .controls-note');
  const customizeButton = document.getElementById('controls-customize-btn');
  if (controlsCopy) {
    controlsCopy.textContent = mode === 'tap'
      ? 'Tap the left or right half of the game board to turn.'
      : 'Choose the touch control used during play.';
  }
  if (controlsNote) {
    controlsNote.textContent = mode === 'tap'
      ? 'Left turns counter-clockwise. Right turns clockwise. No buttons appear during play.'
      : "Move the selected control's buttons to comfortable positions.";
  }
  if (customizeButton) customizeButton.hidden = mode === 'tap';
  wakeTouchControls(2200);
}
applyControlMode(controlMode);

document.querySelectorAll('.control-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => applyControlMode(btn.dataset.mode));
});

// Turn controls touch/pointer handling
const turnDirs = { cw: turnClockwise, ccw: turnCounterClockwise };
document.querySelectorAll('#turn-controls .turn-btn').forEach(btn => {
  const action = turnDirs[btn.dataset.turn];
  const doTurn = e => {
    if (turnControls.classList.contains('edit-mode')) return;
    e.preventDefault(); e.stopPropagation();
    if (isPaused() && isRunActive()) togglePause();
    registerControlMethod('turn');
    action(); btn.classList.add('pressed');
    showTouchControls();
  };
  const unTurn = () => {
    btn.classList.remove('pressed');
    scheduleTouchControlsFade();
  };
  btn.addEventListener('touchstart', doTurn, {passive: false});
  btn.addEventListener('touchend', unTurn, {passive: false});
  btn.addEventListener('touchcancel', unTurn, {passive: false});
  btn.addEventListener('mousedown', doTurn);
  btn.addEventListener('mouseup', unTurn);
  btn.addEventListener('mouseleave', unTurn);
});

// --- D-pad position (localStorage) ---
const DPAD_BTNS = ['up', 'down', 'left', 'right'];
const DPAD_DEFAULTS = {
  up:    { bottom: 112, right: 56 },
  down:  { bottom: 0,   right: 56 },
  left:  { bottom: 56,  right: 112 },
  right: { bottom: 56,  right: 0 }
};

function loadBtnPos(dir) {
  try {
    const saved = JSON.parse(localStorage.getItem('snake_dpad_' + dir));
    if (saved) {
      // New format: {x, y}
      if (typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
      // Legacy format: {bottom, right} → ignore (incompatible)
    }
  } catch(e) {}
  return null;
}
function saveBtnPos(dir, pos) {
  localStorage.setItem('snake_dpad_' + dir, JSON.stringify(pos));
}
function applyBtnPos(dir, pos) {
  const btn = dpad.querySelector('.btn.' + dir);
  if (!btn) return;
  btn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  btn._offsetX = pos.x;
  btn._offsetY = pos.y;
}
function resetBtnPos(dir) {
  const btn = dpad.querySelector('.btn.' + dir);
  if (!btn) return;
  btn.style.transform = '';
  btn._offsetX = 0;
  btn._offsetY = 0;
  localStorage.removeItem('snake_dpad_' + dir);
}

// Load saved positions
DPAD_BTNS.forEach(dir => {
  const saved = loadBtnPos(dir);
  if (saved) applyBtnPos(dir, saved);
});

const dpadDirs = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
document.querySelectorAll('#dpad .btn').forEach(btn => {
  const d = btn.dataset.dir;
  const [x, y] = dpadDirs[d];
  const doDir = e => {
    if (dpad.classList.contains('edit-mode')) return;
    e.preventDefault(); e.stopPropagation();
    if (isPaused() && isRunActive()) togglePause();
    registerControlMethod('dpad');
    setDir(x, y); btn.classList.add('pressed');
    showTouchControls();
  };
  const unDir = () => {
    btn.classList.remove('pressed');
    scheduleTouchControlsFade();
  };
  btn.addEventListener('touchstart', doDir, {passive: false});
  btn.addEventListener('touchend', unDir, {passive: false});
  btn.addEventListener('touchcancel', unDir, {passive: false});
  btn.addEventListener('mousedown', doDir);
  btn.addEventListener('mouseup', unDir);
  btn.addEventListener('mouseleave', unDir);
});



let draggingBtn = null;
let dragStartX, dragStartY, dragStartBtnOffsetX, dragStartBtnOffsetY;

function getViewportBounds() {
  const vp = window.visualViewport;
  return {
    w: vp ? vp.width : window.innerWidth,
    h: vp ? vp.height : window.innerHeight
  };
}

// --- Turn Controls position (localStorage) ---
const TURN_BTNS = ['ccw', 'cw'];

function loadTurnBtnPos(id) {
  try {
    const saved = JSON.parse(localStorage.getItem('snake_turn_' + id));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
  } catch(e) {}
  return null;
}
function saveTurnBtnPos(id, pos) {
  localStorage.setItem('snake_turn_' + id, JSON.stringify(pos));
}
function applyTurnBtnPos(id, pos) {
  const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
  if (!btn) return;
  btn.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  btn._offsetX = pos.x;
  btn._offsetY = pos.y;
}
function resetTurnBtnPos(id) {
  const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
  if (!btn) return;
  btn.style.transform = '';
  btn._offsetX = 0;
  btn._offsetY = 0;
  localStorage.removeItem('snake_turn_' + id);
}

// Load saved turn positions
TURN_BTNS.forEach(id => {
  const saved = loadTurnBtnPos(id);
  if (saved) applyTurnBtnPos(id, saved);
});

function openControlsSettings() {
  // Ignore stale/ghost clicks from the menu while gameplay has it hidden.
  if (isRunActive() || isOverlayHidden()) return;
  controlsOverlay.classList.add('visible');
  controlsOverlay.classList.remove('customizing');
  overlay.style.display = 'none';
  applyControlMode(controlMode);
}

function closeControlsSettings() {
  dpad.classList.remove('edit-mode');
  turnControls.classList.remove('edit-mode');
  controlsOverlay.classList.remove('visible', 'customizing');
  overlay.style.display = '';
  scheduleTouchControlsFade(300);
}

function startControlsEdit() {
  if (controlMode === 'tap') return;
  controlsOverlay.classList.add('visible', 'customizing');
  overlay.style.display = 'none';
  clearTimeout(controlFadeTimeout);
  if (controlMode === 'turn') {
    turnControls.classList.add('edit-mode');
    document.querySelector('#controls-edit-bar .edit-hint').innerHTML = 'Drag each <span class="accent">button</span>';
  } else {
    dpad.classList.add('edit-mode');
    document.querySelector('#controls-edit-bar .edit-hint').innerHTML = 'Drag each <span class="accent">button</span>';
  }
}

function stopControlsEdit() {
  dpad.classList.remove('edit-mode');
  turnControls.classList.remove('edit-mode');
  controlsOverlay.classList.remove('customizing');
  // Save dpad offsets
  DPAD_BTNS.forEach(dir => {
    const btn = dpad.querySelector('.btn.' + dir);
    if (!btn) return;
    const ox = btn._offsetX || 0;
    const oy = btn._offsetY || 0;
    if (ox !== 0 || oy !== 0) saveBtnPos(dir, { x: ox, y: oy });
  });
  // Save turn offsets
  TURN_BTNS.forEach(id => {
    const btn = turnControls.querySelector('.turn-btn[data-turn="' + id + '"]');
    if (!btn) return;
    const ox = btn._offsetX || 0;
    const oy = btn._offsetY || 0;
    if (ox !== 0 || oy !== 0) saveTurnBtnPos(id, { x: ox, y: oy });
  });
  applyControlMode(controlMode);
  onLayoutChange();
}

controlsBtn.addEventListener('click', openControlsSettings);
controlsCustomizeBtn.addEventListener('click', startControlsEdit);
controlsBackBtn.addEventListener('click', closeControlsSettings);
controlsDoneBtn.addEventListener('click', stopControlsEdit);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !controlsOverlay.classList.contains('visible')) return;
  if (controlsOverlay.classList.contains('customizing')) stopControlsEdit();
  else closeControlsSettings();
});

controlsResetBtn.addEventListener('click', () => {
  if (controlMode === 'turn') {
    TURN_BTNS.forEach(id => resetTurnBtnPos(id));
  } else {
    DPAD_BTNS.forEach(dir => resetBtnPos(dir));
  }
  onLayoutChange();
});

function onBtnDragStart(e) {
  const parent = e.currentTarget.closest('#dpad, #turn-controls');
  if (!parent || !parent.classList.contains('edit-mode')) return;
  e.preventDefault();
  e.stopPropagation();
  draggingBtn = e.currentTarget;
  draggingBtn.classList.add('dragging');
  const touch = e.touches ? e.touches[0] : e;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  const parentRect = parent.getBoundingClientRect();
  const btnRect = draggingBtn.getBoundingClientRect();
  dragStartBtnOffsetX = (btnRect.left + btnRect.width / 2) - (parentRect.left + parentRect.width / 2);
  dragStartBtnOffsetY = (btnRect.top + btnRect.height / 2) - (parentRect.top + parentRect.height / 2);
}

function onBtnDragMove(e) {
  if (!draggingBtn) return;
  e.preventDefault();
  const touch = e.touches ? e.touches[0] : e;
  const dx = touch.clientX - dragStartX;
  const dy = touch.clientY - dragStartY;
  let newOffsetX = dragStartBtnOffsetX + dx;
  let newOffsetY = dragStartBtnOffsetY + dy;
  const parent = draggingBtn.closest('#dpad, #turn-controls');
  const parentRect = parent.getBoundingClientRect();
  const bounds = getViewportBounds();
  const btnCenterX = parentRect.left + parentRect.width / 2 + newOffsetX;
  const btnCenterY = parentRect.top + parentRect.height / 2 + newOffsetY;
  if (btnCenterX < 28) newOffsetX -= btnCenterX - 28;
  if (btnCenterX > bounds.w - 28) newOffsetX -= btnCenterX - (bounds.w - 28);
  if (btnCenterY < 28) newOffsetY -= btnCenterY - 28;
  if (btnCenterY > bounds.h - 28) newOffsetY -= btnCenterY - (bounds.h - 28);
  draggingBtn.style.transform = `translate(${newOffsetX}px, ${newOffsetY}px)`;
  draggingBtn._offsetX = newOffsetX;
  draggingBtn._offsetY = newOffsetY;
}

function onBtnDragEnd() {
  if (!draggingBtn) return;
  draggingBtn.classList.remove('dragging');
  draggingBtn = null;
}

// Attach drag to dpad buttons
document.querySelectorAll('#dpad .btn').forEach(btn => {
  btn.addEventListener('touchstart', onBtnDragStart, { passive: false });
  btn.addEventListener('mousedown', onBtnDragStart);
});
// Attach drag to turn buttons
document.querySelectorAll('#turn-controls .turn-btn').forEach(btn => {
  btn.addEventListener('touchstart', onBtnDragStart, { passive: false });
  btn.addEventListener('mousedown', onBtnDragStart);
});
document.addEventListener('touchmove', onBtnDragMove, { passive: false });
document.addEventListener('touchend', onBtnDragEnd);
document.addEventListener('mousemove', onBtnDragMove);
document.addEventListener('mouseup', onBtnDragEnd);


  function getLayout() {
    const dpadLayout = {};
    const turnLayout = {};
    DPAD_BTNS.forEach(id => {
      const btn = dpad.querySelector('.btn.' + id);
      const x = btn?._offsetX || 0;
      const y = btn?._offsetY || 0;
      if (x !== 0 || y !== 0) dpadLayout[id] = { x, y };
    });
    TURN_BTNS.forEach(id => {
      const btn = turnControls.querySelector(`.turn-btn[data-turn="${id}"]`);
      const x = btn?._offsetX || 0;
      const y = btn?._offsetY || 0;
      if (x !== 0 || y !== 0) turnLayout[id] = { x, y };
    });
    return { dpad: dpadLayout, turn: turnLayout };
  }

  function applyLayout(layout = {}) {
    DPAD_BTNS.forEach(id => resetBtnPos(id));
    TURN_BTNS.forEach(id => resetTurnBtnPos(id));
    DPAD_BTNS.forEach(id => {
      const position = layout.dpad?.[id];
      if (!position) return;
      applyBtnPos(id, position);
      saveBtnPos(id, position);
    });
    TURN_BTNS.forEach(id => {
      const position = layout.turn?.[id];
      if (!position) return;
      applyTurnBtnPos(id, position);
      saveTurnBtnPos(id, position);
    });
  }

  return { getMode: () => controlMode, applyMode: applyControlMode, getLayout, applyLayout };
}
