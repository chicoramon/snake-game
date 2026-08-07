export const GAMEPAD_DEADZONE = 0.55;

function pressed(button) {
  return Boolean(button && (button.pressed || button.value > 0.5));
}

export function gamepadDirection(gamepad, deadzone = GAMEPAD_DEADZONE) {
  if (!gamepad) return null;
  const buttons = gamepad.buttons || [];

  // Standard Gamepad mapping: D-pad up/down/left/right are buttons 12–15.
  if (pressed(buttons[12])) return 'up';
  if (pressed(buttons[13])) return 'down';
  if (pressed(buttons[14])) return 'left';
  if (pressed(buttons[15])) return 'right';

  const x = Number(gamepad.axes?.[0]) || 0;
  const y = Number(gamepad.axes?.[1]) || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < deadzone) return null;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
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
