import test from 'node:test';
import assert from 'node:assert/strict';

import { THEMES, FOOD_SPRITES } from '../src/themes/catalog.js';
import { validateThemeCatalog } from '../src/themes/validate-theme.js';
import {
  GOLDEN_SECRET_THEME,
  GOLDEN_SECRET_FOOD_SPRITE
} from '../src/themes/golden-secret-theme.js';

test('Golden remains outside the public theme catalog', () => {
  assert.equal(THEMES.golden, undefined);
  assert.equal(FOOD_SPRITES.golden, undefined);
});

test('Golden is a valid premium 128-step theme when explicitly unlocked', () => {
  assert.doesNotThrow(() => validateThemeCatalog(
    { golden: GOLDEN_SECRET_THEME },
    { golden: GOLDEN_SECRET_FOOD_SPRITE }
  ));

  for (const sequence of ['bass', 'melody', 'arpeggio', 'drums']) {
    for (const intensity of GOLDEN_SECRET_THEME.music[sequence]) {
      assert.equal(intensity.length, 128);
    }
  }
});
