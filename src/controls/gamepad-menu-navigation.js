import { gamepadDirection } from './gamepad-input.js';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
  '.theme-btn'
].join(',');

const INITIAL_REPEAT_DELAY_MS = 360;
const REPEAT_INTERVAL_MS = 120;

function buttonPressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.5));
}

function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function createGamepadMenuNavigation({
  documentLike = globalThis.document,
  windowLike = globalThis.window
} = {}) {
  let lastDirection = null;
  let nextRepeatAt = 0;
  let confirmWasPressed = false;
  let backWasPressed = false;

  function isUsable(element) {
    if (!element || element.hidden || element.disabled || element.getAttribute('aria-hidden') === 'true') return false;
    const style = windowLike.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const x = Math.max(0, Math.min(windowLike.innerWidth - 1, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(windowLike.innerHeight - 1, rect.top + rect.height / 2));
    const topElement = documentLike.elementFromPoint?.(x, y);
    return !topElement || element === topElement || element.contains(topElement);
  }

  function candidates() {
    return Array.from(documentLike.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isUsable);
  }

  function focusElement(element) {
    if (!element) return false;
    documentLike.body?.classList.add('controller-navigation');
    element.focus({ preventScroll: true });
    element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  function ensureFocus() {
    const items = candidates();
    if (!items.length) return null;
    if (items.includes(documentLike.activeElement)) return documentLike.activeElement;
    const preferred = items.find(element => element.matches('#startBtn, .primary, [autofocus]')) || items[0];
    focusElement(preferred);
    return preferred;
  }

  function move(direction) {
    const items = candidates();
    if (!items.length) return;
    const current = items.includes(documentLike.activeElement) ? documentLike.activeElement : ensureFocus();
    if (!current) return;
    const origin = centerOf(current);
    const vector = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }[direction];
    if (!vector) return;

    const ranked = items
      .filter(element => element !== current)
      .map(element => {
        const point = centerOf(element);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const forward = dx * vector.x + dy * vector.y;
        if (forward <= 2) return null;
        const cross = Math.abs(dx * vector.y - dy * vector.x);
        return { element, score: forward + cross * 2.25 };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
    if (ranked[0]) focusElement(ranked[0].element);
  }

  function activateFocused() {
    const focused = ensureFocus();
    if (!focused) return;
    if (focused.matches('input[type="checkbox"], input[type="radio"]')) focused.click();
    else if (typeof focused.click === 'function') focused.click();
  }

  function activateBack() {
    const items = candidates();
    const target = items.findLast(element => {
      const label = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''}`.trim();
      return /(^|\s)(back|close|done|got it|results)(\s|$)/i.test(label);
    });
    target?.click();
  }

  function update(gamepad, now = performance.now()) {
    if (!gamepad) {
      reset();
      return;
    }
    ensureFocus();
    const direction = gamepadDirection(gamepad);
    if (direction && direction !== lastDirection) {
      move(direction);
      nextRepeatAt = now + INITIAL_REPEAT_DELAY_MS;
    } else if (direction && now >= nextRepeatAt) {
      move(direction);
      nextRepeatAt = now + REPEAT_INTERVAL_MS;
    } else if (!direction) {
      nextRepeatAt = 0;
    }
    lastDirection = direction;

    const confirmPressed = buttonPressed(gamepad, 0);
    if (confirmPressed && !confirmWasPressed) activateFocused();
    confirmWasPressed = confirmPressed;

    const backPressed = buttonPressed(gamepad, 1);
    if (backPressed && !backWasPressed) activateBack();
    backWasPressed = backPressed;
  }

  function reset() {
    lastDirection = null;
    nextRepeatAt = 0;
    confirmWasPressed = false;
    backWasPressed = false;
  }

  documentLike.addEventListener?.('pointerdown', () => {
    documentLike.body?.classList.remove('controller-navigation');
  }, { passive: true, capture: true });

  return { update, reset, ensureFocus };
}
