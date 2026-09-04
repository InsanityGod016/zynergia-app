import { defineConfig, devices } from '@playwright/test';

const demoE2E = process.env.ZYNERGIA_DEMO_E2E === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: demoE2E ? 'demo-flow.spec.js' : 'public-flow.spec.js',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'], channel: 'chrome' } },
  ],
  webServer: {
    command: demoE2E
      ? 'npm run dev -- --mode demo --host 127.0.0.1 --port 4173'
      : 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_PUBLIC_SITE_URL: 'http://127.0.0.1:4173',
      VITE_API_BASE_URL: 'http://127.0.0.1:4173',
      ...(demoE2E ? { VITE_DEMO_MODE: 'true' } : {}),
    },
  },
});
