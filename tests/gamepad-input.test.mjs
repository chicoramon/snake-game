import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectedGamepads,
  gamepadDirection,
  gamepadPausePressed,
  shortGamepadName,
} from '../src/controls/gamepad-input.js';

function pad({ axes = [0, 0], pressed = [] } = {}) {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.includes(index),
      value: pressed.includes(index) ? 1 : 0,
    })),
  };
}

test('D-pad directions use the standard Gamepad mapping', () => {
  assert.equal(gamepadDirection(pad({ pressed: [12] })), 'up');
  assert.equal(gamepadDirection(pad({ pressed: [13] })), 'down');
  assert.equal(gamepadDirection(pad({ pressed: [14] })), 'left');
  assert.equal(gamepadDirection(pad({ pressed: [15] })), 'right');
});

test('left stick uses its dominant axis and ignores deadzone drift', () => {
  assert.equal(gamepadDirection(pad({ axes: [0.2, -0.3] })), null);
  assert.equal(gamepadDirection(pad({ axes: [-0.9, 0.4] })), 'left');
  assert.equal(gamepadDirection(pad({ axes: [0.4, 0.85] })), 'down');
});

test('non-standard Bluetooth D-pads can use secondary axes', () => {
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 0, 0, -1, 0] })), 'left');
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 0, 0, 0, 1] })), 'down');
});

test('POV hat-axis D-pads support cardinal and diagonal values', () => {
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 3.285, 0, 0, 0, 0, -1] })), 'up');
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 3.285, 0, 0, 0, 0, -3 / 7] })), 'right');
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 3.285, 0, 0, 0, 0, 1 / 7] })), 'down');
  assert.equal(gamepadDirection(pad({ axes: [0, 0, 0, 0, 3.285, 0, 0, 0, 0, 5 / 7] })), 'left');
});

test('Start/Menu is exposed as the controller pause action', () => {
  assert.equal(gamepadPausePressed(pad({ pressed: [9] })), true);
  assert.equal(gamepadPausePressed(pad()), false);
});

test('connected controller discovery filters empty browser slots', () => {
  const first = { id: 'Xbox Wireless Controller' };
  assert.deepEqual(connectedGamepads({ getGamepads: () => [first, null] }), [first]);
  assert.deepEqual(connectedGamepads({}), []);
  assert.equal(shortGamepadName('Xbox Wireless Controller'), 'Xbox Wireless Controller');
});
