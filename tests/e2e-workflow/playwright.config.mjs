const config = {
  testDir: './browser',
  timeout: 180000,
  expect: {
    timeout: 15000,
  },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e-workflow/playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: 'tests/e2e-workflow/test-results',
}

export default config
