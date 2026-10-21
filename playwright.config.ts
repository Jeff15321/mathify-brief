import { defineConfig } from '@playwright/test';

// Dedicated port so E2E never reuses a developer's dev server (which may run with live AI).
const E2E_PORT = 3100;
const E2E_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: `npx next build && npx next start -p ${E2E_PORT}`,
    timeout: 180_000,
    url: E2E_URL,
    reuseExistingServer: false,
    env: {
      AI_MOCK_MODE: 'true',
      LOCAL_DATA_DIR: './.playwright-data',
    },
  },
  use: {
    baseURL: E2E_URL,
  },
});
