import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' })

const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8081/api/v1'

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel - each test uses isolated data with unique testIds
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests for occasional flakiness
  // Increase retries for M12/M15 which can be flaky in full suite runs
  retries: process.env.CI ? 3 : 2,

  // Use multiple workers for parallel execution
  // Local: Use most CPU cores (leaving headroom for frontend/backend services)
  // CI environments may have fewer resources, so use fewer workers
  workers: process.env.CI ? 4 : 12,

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
    // Run serially to avoid rate limiting issues with multiple concurrent login attempts
    {
      name: 'm2-auth',
      testDir: './tests/m2-auth',
      fullyParallel: false,
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
    // Run sequentially with single worker to avoid race conditions with rule creation/ordering
    // Multiple test files share the same rules table, so they must run one at a time
    {
      name: 'm6-rules',
      testDir: './tests/m6-rules',
      fullyParallel: false,
      workers: 1,
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
    // Run sequentially with single worker to avoid race conditions with group creation/counts
    // Multiple test files share the same groups table, so they must run one at a time
    {
      name: 'm9-groups',
      testDir: './tests/m9-groups',
      fullyParallel: false,
      workers: 1,
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
    // M11 Polish & MVP Completion tests - requires authentication (depends on auth-setup)
    {
      name: 'm11-polish',
      testDir: './tests/m11-polish',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // Error Scenarios tests - tests error handling and edge cases
    {
      name: 'error-scenarios',
      testDir: './tests/error-scenarios',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M12 Credit Card Import tests - requires authentication (depends on auth-setup)
    // Run sequentially with single worker to avoid race conditions with bill payment matching
    // Multiple tests create bill payments with same amounts, causing match conflicts
    // Depends on most other test projects to avoid concurrent database modifications
    // This ensures M12 runs after other tests that might create conflicting transaction data
    {
      name: 'm12-cc-import',
      testDir: './tests/m12-cc-import',
      fullyParallel: false,
      workers: 1,
      dependencies: ['auth-setup', 'm4-transactions', 'm5-import', 'm6-rules', 'm8-dashboard', 'error-scenarios'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M13 Category Trends Chart tests - requires authentication (depends on auth-setup)
    {
      name: 'm13-category-trends',
      testDir: './tests/M13-category-trends',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/fixtures/.auth/user.json',
      },
    },
    // M15 Smart Reconciliation tests - requires authentication (depends on auth-setup)
    // Run sequentially with single worker to avoid race conditions with CC reconciliation
    // Depends on m12-cc-import to avoid concurrent CC-related operations
    {
      name: 'm15-smart-reconciliation',
      testDir: './tests/M15-smart-reconciliation',
      fullyParallel: false,
      workers: 1,
      dependencies: ['auth-setup', 'm12-cc-import'],
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
