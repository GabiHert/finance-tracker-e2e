import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' })

const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8081/api/v1'

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests to handle rate limiting flakiness
  retries: process.env.CI ? 2 : 1,

  // Limit workers for E2E to avoid database conflicts
  workers: 1,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for the frontend
    baseURL: FRONTEND_URL,

    // Collect trace when retrying
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Extra HTTP headers for API requests
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for different test types
  projects: [
    // Authentication setup - runs FIRST and saves auth state
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // M2 Authentication tests - test login/register flows directly (no saved auth)
    {
      name: 'm2-auth',
      testDir: './tests/m2-auth',
      use: { ...devices['Desktop Chrome'] },
    },
    // M3 Category tests - requires authentication (depends on auth-setup)
    {
      name: 'm3-categories',
      testDir: './tests/m3-categories',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M4 Transaction tests - requires authentication (depends on auth-setup)
    {
      name: 'm4-transactions',
      testDir: './tests/m4-transactions',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M5 Import tests - requires authentication (depends on auth-setup)
    {
      name: 'm5-import',
      testDir: './tests/m5-import',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M6 Category Rules tests - requires authentication (depends on auth-setup)
    {
      name: 'm6-rules',
      testDir: './tests/m6-rules',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M7 Goals (Spending Limits) tests - requires authentication (depends on auth-setup)
    {
      name: 'm7-goals',
      testDir: './tests/m7-goals',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M8 Dashboard & Analytics tests - requires authentication (depends on auth-setup)
    {
      name: 'm8-dashboard',
      testDir: './tests/m8-dashboard',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M9 Groups & Collaboration tests - requires authentication (depends on auth-setup)
    {
      name: 'm9-groups',
      testDir: './tests/m9-groups',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M10 Settings & User Profile tests - requires authentication (depends on auth-setup)
    {
      name: 'm10-settings',
      testDir: './tests/m10-settings',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
  ],

  // Global setup and teardown
  globalSetup: './tests/fixtures/global-setup.ts',
  globalTeardown: './tests/fixtures/global-teardown.ts',

  // Output folder for test artifacts
  outputDir: 'test-results/',
})
