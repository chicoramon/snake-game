import { expect, test } from '@playwright/test';

async function openMenu(page, { blockSupabase = false, query = '' } = {}) {
  if (blockSupabase) {
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.abort());
  }
  await page.goto(`./${query}`);
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
  await page.waitForTimeout(450);
  if (await page.locator('#whats-new-panel').isVisible()) {
    await page.locator('#whats-new-close').click();
  }
}

async function startRun(page) {
  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#game')).toBeVisible();
}

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
