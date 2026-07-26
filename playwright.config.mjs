import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    // Use the locally installed Edge browser. This avoids Windows blocking
    // Playwright's separately downloaded Chromium executable on this machine.
    browserName: 'chromium',
    channel: 'msedge',
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
