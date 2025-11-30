import { Page, expect } from '@playwright/test'

// API URL for direct backend calls
export const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8081/api/v1'

/**
 * Test user credentials for E2E tests
 * Note: Password avoids special characters (like !) that can cause shell escaping issues
 */
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'E2eTestPassword1234',
  name: 'E2E Test User',
}

/**
 * Helper to create a test user via API
 */
export async function createTestUser(page: Page): Promise<void> {
  const response = await page.request.post(`${API_URL}/auth/register`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
      terms_accepted: true,
    },
  })

  // User might already exist from previous test run
  if (response.status() !== 201 && response.status() !== 409) {
    throw new Error(`Failed to create test user: ${response.status()}`)
  }
}

/**
 * Helper to login a test user
 */
export async function loginTestUser(page: Page): Promise<string> {
  const response = await page.request.post(`${API_URL}/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to login: ${response.status()}`)
  }

  const data = await response.json()
  return data.token
}

/**
 * Helper to login via UI with retry logic for flaky connections and rate limiting
 * Note: Backend has rate limiting (~5 requests/10s). For E2E tests, configure
 * Playwright retries: 1 in playwright.config.ts to handle rate limit flakiness.
 */
export async function loginViaUI(page: Page, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Longer wait between attempts for rate limiting (8s to ensure cooldown)
    if (attempt > 1) {
      await page.waitForTimeout(8000)
    }

    await page.goto('/login')

    // Wait for form to be ready
    await expect(page.getByLabel('E-mail')).toBeVisible()

    await page.getByLabel('E-mail').fill(TEST_USER.email)
    await page.getByTestId('input-password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Wait for either navigation to dashboard or error message
    try {
      await expect(page).toHaveURL(/.*dashboard|.*\/$/i, { timeout: 15000 })
      return // Success!
    } catch (error) {
      // Check if there's an error message on the page (rate limit or auth error)
      const hasError = await page.getByText(/erro|error|aguarde|wait|limite|limit/i).isVisible().catch(() => false)

      if (attempt === maxRetries) {
        throw new Error(
          `Login failed after ${maxRetries} attempts. ` +
            (hasError ? 'Backend returned error (may be rate limited).' : 'Navigation timeout.')
        )
      }
    }
  }
}

/**
 * Helper to login via UI with request body capture for remember_me tests
 * Has retry logic to handle rate limiting
 */
export async function loginViaUIWithRequestCapture(
  page: Page,
  options: { rememberMe?: boolean; maxRetries?: number } = {}
): Promise<{ requestBody: Record<string, unknown> | null }> {
  const { rememberMe = false, maxRetries = 3 } = options
  let loginRequestBody: Record<string, unknown> | null = null

  // Set up request interception
  await page.route('**/auth/login', async (route, request) => {
    if (request.method() === 'POST') {
      try {
        loginRequestBody = JSON.parse(request.postData() || '{}')
      } catch {
        loginRequestBody = null
      }
    }
    await route.continue()
  })

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Wait between retries (longer wait for rate limiting cooldown)
    if (attempt > 1) {
      await page.waitForTimeout(10000)
      // Reset to login page for retry
      await page.goto('/login')
      await expect(page.getByLabel('E-mail')).toBeVisible()
    }

    // Fill in credentials
    await page.getByLabel('E-mail').fill(TEST_USER.email)
    await page.getByTestId('input-password').fill(TEST_USER.password)

    // Toggle remember me checkbox if needed
    const checkbox = page.getByTestId('remember-me-checkbox')
    const isChecked = await checkbox.isChecked()
    if (rememberMe && !isChecked) {
      await checkbox.click()
    } else if (!rememberMe && isChecked) {
      await checkbox.click()
    }

    // Submit login
    await page.getByRole('button', { name: /entrar/i }).click()

    // Wait for navigation or error
    try {
      await expect(page).toHaveURL(/.*dashboard|.*\/$/i, { timeout: 15000 })
      // Success - remove route handler and return
      await page.unroute('**/auth/login')
      return { requestBody: loginRequestBody }
    } catch {
      // Check for error message (rate limit or auth error)
      const hasError = await page
        .getByText(/erro|error|aguarde|wait|limite|limit/i)
        .isVisible()
        .catch(() => false)

      if (attempt === maxRetries) {
        await page.unroute('**/auth/login')
        throw new Error(
          `Login failed after ${maxRetries} attempts. ` +
            (hasError ? 'Backend returned error (may be rate limited).' : 'Navigation timeout.')
        )
      }
    }
  }

  await page.unroute('**/auth/login')
  return { requestBody: loginRequestBody }
}

/**
 * Helper to reset test data via API
 */
export async function resetTestData(page: Page, token: string): Promise<void> {
  // Delete all transactions
  await page.request.delete(`${API_URL}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  // Delete all categories (except defaults)
  await page.request.delete(`${API_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Helper to verify database state
 */
export async function verifyDatabaseRecord(
  page: Page,
  endpoint: string,
  expectedData: Record<string, unknown>,
  token: string
): Promise<void> {
  const response = await page.request.get(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()

  for (const [key, value] of Object.entries(expectedData)) {
    expect(data[key]).toBe(value)
  }
}
