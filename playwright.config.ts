import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve test vault path for E2E tests
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_VAULT_PATH = path.resolve(__dirname, 'tests/data/testing-files');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Set localStorage before each test for vault auto-restore
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            { name: 'vaultPath', value: TEST_VAULT_PATH },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'VITE_E2E_TEST=true npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_E2E_TEST: 'true',
      VAULT_PATH: TEST_VAULT_PATH,
    },
  },
});
