import { expect, test } from '@playwright/test';

async function openGame(page, { blockSupabase = false } = {}) {
  if (blockSupabase) {
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.abort());
  }
  await page.goto('./');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();

  // A first visit deliberately shows player-facing release notes. A smoke test
  // acknowledges that modal before exercising the underlying main-menu flow.
  const whatsNewPanel = page.locator('#whats-new-panel');
  await page.waitForTimeout(1_000);
  if (await whatsNewPanel.isVisible()) {
    await page.locator('#whats-new-close').click();
    await expect(whatsNewPanel).not.toHaveClass(/visible/);
  }
}

test('the game remains playable when Supabase cannot initialize', async ({ page }) => {
  await openGame(page, { blockSupabase: true });

  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#game')).toBeVisible();

  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-label', 'Resume game');
  await page.locator('#pause-btn').click();
  await expect(page.locator('#pause-btn')).toHaveAttribute('aria-label', 'Pause game');
});

test('menu choices expose themes, random, controls, and leaderboard', async ({ page }) => {
  await openGame(page);

  await page.locator('#options-btn').click();
  await expect(page.locator('#options-panel')).toHaveClass(/visible/);
  await page.locator('#random-theme-btn').click();
  await expect(page.locator('#random-theme-btn')).toHaveClass(/selected/);
  await page.locator('#options-back').click();

  await page.locator('#controls-btn').click();
  await expect(page.locator('#controls-edit-overlay')).toHaveClass(/visible/);
  for (const mode of ['dpad', 'turn', 'tap']) {
    const button = page.locator(`.control-mode-btn[data-mode="${mode}"]`);
    await button.click();
    await expect(button).toHaveClass(/active/);
  }
  await page.locator('#controls-back-btn').click();

  await page.locator('#lbBtn').click();
  await expect(page.locator('#leaderboardOverlay')).toHaveClass(/visible/);
  await page.locator('#lbBack').click();
  await expect(page.locator('#leaderboardOverlay')).not.toHaveClass(/visible/);
});
