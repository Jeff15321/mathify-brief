import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      AI_MOCK_MODE: 'true',
      LOCAL_DATA_DIR: './.playwright-data',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
