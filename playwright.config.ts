import { defineConfig, devices } from '@playwright/test';

// PW_PORT lets parallel checkouts run their e2e suites at the same time.
const PORT = Number(process.env.PW_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    // VITE_DEV_PAGES adds the #/dev/components demo page, which production builds leave out.
    command: `VITE_DEV_PAGES=true npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    // Always rebuild so tests never run against a stale dist/.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
