import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, FOOD_SPRITES, THEME_ICON_URLS } from '../src/themes/catalog.js';
import { validateThemeCatalog } from '../src/themes/validate-theme.js';

test('theme catalog is complete and validates before gameplay can use it', () => {
  assert.doesNotThrow(() => validateThemeCatalog(THEMES, FOOD_SPRITES));
  assert.ok(Object.keys(THEMES).length >= 10, 'expected the full theme catalog');

  for (const themeId of Object.keys(THEMES)) {
    assert.ok(FOOD_SPRITES[themeId], `${themeId} needs a matching food sprite`);
  }

  assert.ok(THEME_ICON_URLS.streetfighter, 'Street Fighter picker artwork is present');
  assert.ok(THEME_ICON_URLS.got, 'Game of Thrones picker artwork is present');
});
