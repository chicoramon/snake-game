import { expect, test } from '@playwright/test';

async function openMenu(page, { blockSupabase = false, query = '' } = {}) {
  if (blockSupabase) {
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.abort());
  }
  await page.goto(`./${query}`);
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
  await page.waitForTimeout(450);
  if (await page.locator('#onboarding-panel').isVisible()) {
    await page.locator('#onboarding-skip').click();
  }
  if (await page.locator('#whats-new-panel').isVisible()) {
    await page.locator('#whats-new-close').click();
  }
}

test('Vs invite links gate unidentified guests while suppressing unrelated panels', async ({ page }) => {
  await page.goto('./?vs=ABC123');
  await expect(page.locator('#whats-new-panel')).not.toHaveClass(/visible/);
  await expect(page.locator('#onboarding-panel')).not.toHaveClass(/visible/);
  await expect(page.locator('#player-panel')).toHaveClass(/visible/, { timeout: 12_000 });
  await expect(page.locator('#player-vs-invite-gate')).toBeVisible();
  await expect(page.locator('#player-vs-invite-code')).toHaveText('ABC123');
  await expect(page.locator('#player-vs-invite-gate')).toContainText(/initials|restore/i);
});

test('new players can replay the arcade tour and select a control', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#onboarding-panel')).toHaveClass(/visible/);
  await expect(page.locator('#onboarding-progress')).toHaveText('1 / 5');

  await page.locator('#onboarding-play-now').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);

  await page.goto('./');
  await expect(page.locator('#overlay')).toBeVisible();
  await page.locator('#how-to-play-btn').click();
  await expect(page.locator('#onboarding-panel')).toHaveClass(/visible/);
  await page.locator('#onboarding-next').click();
  await expect(page.locator('[data-onboarding-control="tap"]')).toHaveAttribute('data-recommended', 'true');
  await expect(page.locator('.onboarding-control-recommended')).toHaveText(/recommended/i);
  await page.locator('[data-onboarding-control="turn"]').click();
  await page.locator('[data-training-turn="left"]').click();
  await page.locator('[data-training-turn="right"]').click();
  await expect(page.locator('#onboarding-next')).toHaveText('NEXT');
  await expect(page.locator('#control-training-message')).toContainText(/READY/i);

  await page.locator('[data-onboarding-control="dpad"]').click();
  await expect(page.locator('#onboarding-next')).toBeDisabled();
  for (const direction of ['up', 'left', 'down']) {
    await page.locator(`[data-training-dir="${direction}"]`).click();
    await expect(page.locator('#onboarding-next')).toBeDisabled();
  }
  await page.locator('[data-training-dir="right"]').click();
  await expect(page.locator('#onboarding-next')).toBeEnabled();
  await expect(page.locator('#control-training-message')).toContainText(/READY/i);

  await page.locator('[data-onboarding-control="turn"]').click();
  await expect(page.locator('#onboarding-next')).toBeEnabled();
  await expect(page.locator('#control-training-message')).toContainText(/READY/i);
});

async function startRun(page) {
  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#game')).toBeVisible();
}

test('game over uses a dedicated result screen and can return to the menu', async ({ page }) => {
  await openMenu(page, { blockSupabase: true });
  await startRun(page);
  await expect(page.locator('#overlay')).toHaveClass(/run-result/, { timeout: 8_000 });
  await expect(page.locator('#run-result-panel')).toBeVisible();
  await expect(page.locator('#run-result-title')).toHaveText('Game Over');
  await expect(page.locator('#run-result-score')).toHaveText('0');
  await expect(page.locator('#overlayTitle')).toBeHidden();
  await expect(page.locator('#overlay .menu-section').first()).toBeHidden();
  await expect(page.locator('#run-result-replay')).toBeVisible();
  await expect(page.locator('#run-result-menu')).toBeVisible();

  await page.locator('#run-result-menu').click();
  await expect(page.locator('#overlay')).not.toHaveClass(/run-result/);
  await expect(page.locator('#run-result-panel')).toBeHidden();
  await expect(page.locator('#startBtn')).toBeVisible();
  await expect(page.locator('#overlay .menu-section').first()).toBeVisible();
});

test('Daily Run shows its rules before the first timed run', async ({ page }) => {
  await openMenu(page, { blockSupabase: true, query: '?dailyIntro=1' });
  await page.locator('.game-mode-btn[data-game-mode="daily"]').click();
  await expect(page.locator('#dailyChallengeInfo')).toContainText(/Challenge #/);
  await page.locator('#startBtn').click();
  await expect(page.locator('#dailyRulesDialog')).toHaveClass(/visible/);
  await expect(page.locator('#dailyRulesFootnote')).toContainText(/preview|ranked/i);
  await page.locator('#dailyRulesLater').click();
  await expect(page.locator('#dailyRulesDialog')).not.toHaveClass(/visible/);
});

test('Daily Run leaderboard opens without client errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));
  await openMenu(page, { blockSupabase: true });
  await page.locator('.game-mode-btn[data-game-mode="daily"]').click();
  await page.locator('#lbBtn').click();
  await expect(page.locator('#leaderboardOverlay')).toHaveClass(/visible/);
  await expect(page.locator('#dailyArchivePanel')).toBeVisible();
  await expect(page.locator('#lbThemeFilters')).toHaveCount(0);
  await expect(page.locator('.lb-table .lb-theme-col')).toHaveText('Final Food');
  await expect(page.locator('#lbEmpty')).toContainText(/unavailable/i);
  expect(pageErrors.map(error => error.message).join('\n')).not.toMatch(/refreshDailyChallenge|ensureDailyChallenge|formatDailyFoodTime/);
});

test('Random mode remains selected until play and starts a playable run', async ({ page }) => {
  await openMenu(page, { blockSupabase: true });
  await page.locator('#options-btn').click();
  await page.locator('#random-theme-btn').click();
  await expect(page.locator('#random-theme-btn')).toHaveClass(/selected/);
  await page.locator('#options-back').click();
  await startRun(page);
  await expect(page.locator('#game')).toBeVisible();
});

test('every control mode can be selected and the game remains playable', async ({ page }) => {
  await openMenu(page, { blockSupabase: true });
  for (const mode of ['dpad', 'turn', 'tap']) {
    await page.locator('#controls-btn').click();
    const option = page.locator(`.control-mode-btn[data-mode="${mode}"]`);
    await option.click();
    await expect(option).toHaveClass(/active/);
    await page.locator('#controls-back-btn').click();
  }
  await startRun(page);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#game')).toBeVisible();
});

test('player, update, leaderboard, and public dialogs can be opened and dismissed', async ({ page }) => {
  await openMenu(page, { blockSupabase: true });
  await page.locator('#player-btn').click();
  await expect(page.locator('#player-panel')).toHaveClass(/visible/);
  await page.locator('#player-initials-input').fill('ram');
  await expect(page.locator('#player-initials-input')).toHaveValue('RAM');
  await page.locator('#player-back').click();

  await page.locator('#whats-new-btn').click();
  await expect(page.locator('#whats-new-panel')).toHaveClass(/visible/);
  await page.locator('#whats-new-close').click();

  await page.locator('#lbBtn').click();
  await expect(page.locator('#leaderboardOverlay')).toHaveClass(/visible/);
  await expect(page.locator('#lbThemeFilters')).toHaveCount(0);
  await expect(page.locator('.lb-table .lb-theme-col')).toHaveText('Theme');
  await page.locator('#lbBack').click();
  await expect(page.locator('#leaderboardOverlay')).not.toHaveClass(/visible/);
});

test('a blocked Supabase SDK still permits menus and gameplay', async ({ page }) => {
  await openMenu(page, { blockSupabase: true });
  await page.locator('#lbBtn').click();
  await expect(page.locator('#lbEmpty')).toContainText(/unavailable/i);
  await page.locator('#lbBack').click();
  await startRun(page);
});
