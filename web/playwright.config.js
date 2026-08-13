import { defineConfig, devices } from '@playwright/test';

/**
 * A deliberately small e2e layer. What it does NOT do: log in with real
 * credentials — that would mean either committing a test account's
 * password or wiring Appwrite test credentials into CI, and this app has
 * no test/staging Appwrite project separate from the real one. So this
 * covers the one thing that's true regardless of backend state — the SPA
 * shell boots, routes to the login screen, and its client-side validation
 * works — and leaves the authenticated flows to the backend's API-level
 * integration tests (src/__tests__/api/*, run against a fake Appwrite) and
 * the manual live end-to-end checks already run against the real project.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
