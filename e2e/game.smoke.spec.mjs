import { expect, test } from '@playwright/test';

async function openGame(page, { blockSupabase = false } = {}) {
  if (blockSupabase) {
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.abort());
  }
  await page.goto('./');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();

  // A first visit can show the orientation and player-facing release notes.
  // A smoke test acknowledges both before exercising the main menu.
  const onboardingPanel = page.locator('#onboarding-panel');
  const whatsNewPanel = page.locator('#whats-new-panel');
  await page.waitForTimeout(1_000);
  if (await onboardingPanel.isVisible()) {
    await page.locator('#onboarding-skip').click();
    await expect(onboardingPanel).not.toHaveClass(/visible/);
  }
  if (await whatsNewPanel.isVisible()) {
    await page.locator('#whats-new-close').click();
    await expect(whatsNewPanel).not.toHaveClass(/visible/);
  }
}

test('the game remains playable when Supabase cannot initialize', async ({ page }) => {
  await openGame(page, { blockSupabase: true });

  await page.locator('#startBtn').click();
  // The default snake will eventually meet the wall without input; pause it
  // immediately so this control assertion is independent of test-run speed.
  const pauseButton = page.locator('#pause-btn');
  const initiallyPaused = await pauseButton.getAttribute('aria-label') === 'Resume game';
  await pauseButton.click();
  await expect(pauseButton).toHaveAttribute('aria-label', initiallyPaused ? 'Pause game' : 'Resume game');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#game')).toBeVisible();

  await pauseButton.click();
  await expect(pauseButton).toHaveAttribute('aria-label', initiallyPaused ? 'Resume game' : 'Pause game');
});

test('player identity bootstraps without page errors when Supabase is available', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await openGame(page);
  await expect(page.locator('#player-identity-status')).not.toContainText('unavailable');
  await expect(page.locator('#player-menu-label')).toHaveText(/Player:/);
  expect(pageErrors).toEqual([]);
});

test('menu choices expose themes, random, controls, and leaderboard', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('#golden-theme-btn')).toBeHidden();

  const backgroundMusicButton = page.locator('#bg-music-btn');
  const gameMusicButton = page.locator('#mute-btn');
  await expect(backgroundMusicButton).toContainText('BG');
  await expect(gameMusicButton).toContainText('GAME');
  const backgroundMusicBox = await backgroundMusicButton.boundingBox();
  const gameMusicBox = await gameMusicButton.boundingBox();
  const musicControlsBox = await page.locator('#music-controls').boundingBox();
  expect(backgroundMusicBox).not.toBeNull();
  expect(gameMusicBox).not.toBeNull();
  expect(musicControlsBox).not.toBeNull();
  expect(Math.abs(backgroundMusicBox.y - gameMusicBox.y)).toBeLessThan(1);
  expect(musicControlsBox.height).toBeLessThanOrEqual(42);
  await backgroundMusicButton.click();
  await expect(backgroundMusicButton).toContainText('OFF');
  await expect(gameMusicButton).toContainText('ON');

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

  await expect(page.locator('#vs-live-btn')).toBeVisible();

  await page.locator('#lbBtn').click();
  await expect(page.locator('#leaderboardOverlay')).toHaveClass(/visible/);
  await page.locator('#lbBack').click();
  await expect(page.locator('#leaderboardOverlay')).not.toHaveClass(/visible/);
});

test('the URL-gated Golden surprise is local, slower, and wraps through walls', async ({ page }) => {
  const supabaseApiRequests = [];
  page.on('request', request => {
    if (request.url().includes('suuwudlnsapyvthjscwp.supabase.co')) supabaseApiRequests.push(request.url());
  });

  await page.goto('./?golden=1');
  await expect(page.locator('body')).toHaveClass(/golden-secret/);
  await page.locator('#options-btn').click();
  await expect(page.locator('#options-panel')).toHaveClass(/visible/);
  await expect(page.locator('#golden-theme-btn')).toBeVisible();
  await expect(page.locator('#golden-theme-btn')).toHaveClass(/selected/);
  await page.locator('#options-back').click();
  await expect(page.locator('#themeLabel')).toContainText('Golden');
  await expect(page.locator('#hud-mode')).toHaveText('GOLDEN');
  await expect(page.locator('#lbBtn')).toBeHidden();
  await expect(page.locator('#player-btn')).toBeHidden();
  await expect(page.locator('#vs-live-btn')).toBeHidden();
  await expect(page.locator('.game-mode-toggle')).toBeHidden();

  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  // With no input, the starting snake reaches the right wall in about 1.5s.
  // Remaining in play beyond that proves the secret wrap rule is active.
  await page.waitForTimeout(2_100);
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  expect(supabaseApiRequests).toEqual([]);
});
