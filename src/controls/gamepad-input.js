export const GAMEPAD_DEADZONE = 0.55;

function pressed(button) {
  return Boolean(button && (button.pressed || button.value > 0.5));
}

function axisPairDirection(axes, xIndex, yIndex, deadzone) {
  const x = Number(axes?.[xIndex]) || 0;
  const y = Number(axes?.[yIndex]) || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < deadzone) return null;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

// Several Bluetooth controllers expose their D-pad as a single POV/hat axis.
// Chromium commonly reports the eight directions from -1 through +1 in
// roughly 2/7 steps, with a value outside that range while released.
function hatAxisDirection(value, tolerance = 0.08) {
  if (!Number.isFinite(value) || value < -1.08 || value > 1.08) return null;
  const positions = [
    [-1, 'up'],
    [-5 / 7, 'up'],
    [-3 / 7, 'right'],
    [-1 / 7, 'right'],
    [1 / 7, 'down'],
    [3 / 7, 'down'],
    [5 / 7, 'left'],
    [1, 'left'],
  ];
  const match = positions.find(([position]) => Math.abs(value - position) <= tolerance);
  return match?.[1] || null;
}

export function gamepadDirection(gamepad, deadzone = GAMEPAD_DEADZONE) {
  if (!gamepad) return null;
  const buttons = gamepad.buttons || [];

  // Standard Gamepad mapping: D-pad up/down/left/right are buttons 12–15.
  if (pressed(buttons[12])) return 'up';
  if (pressed(buttons[13])) return 'down';
  if (pressed(buttons[14])) return 'left';
  if (pressed(buttons[15])) return 'right';

  const axes = gamepad.axes || [];

  // Non-standard mappings commonly use axes 6/7 as a digital D-pad pair.
  const secondaryDpad = axisPairDirection(axes, 6, 7, deadzone);
  if (secondaryDpad) return secondaryDpad;

  // Other drivers expose a discrete POV/hat value, frequently at axis 9.
  // Start after the two stick pairs so ordinary analog axes cannot be
  // mistaken for this digital encoding.
  for (let index = 4; index < axes.length; index += 1) {
    if (index === 6 || index === 7) continue;
    const hatDirection = hatAxisDirection(Number(axes[index]));
    if (hatDirection) return hatDirection;
  }

  return axisPairDirection(axes, 0, 1, deadzone);
}

export function gamepadPausePressed(gamepad) {
  // Standard mapping button 9 is Start/Menu.
  return pressed(gamepad?.buttons?.[9]);
}

export function connectedGamepads(navigatorLike = globalThis.navigator) {
  if (typeof navigatorLike?.getGamepads !== 'function') return [];
  return Array.from(navigatorLike.getGamepads() || []).filter(Boolean);
}

export function shortGamepadName(id = '') {
  const cleaned = String(id)
    .replace(/\s*\([^)]*(vendor|product)[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 34 ? `${cleaned.slice(0, 31)}…` : (cleaned || 'GAME CONTROLLER');
}
