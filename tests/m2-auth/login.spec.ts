import { test, expect } from '@playwright/test'
import { TEST_USER, createTestUser, loginViaUI } from '../fixtures/test-utils'

/**
 * M2-E2E-001: User Login Flow
 * Validates the complete login flow including UI, backend authentication,
 * and session management.
 */
test.describe('M2: Authentication - Login', () => {
  test.beforeAll(async ({ browser }) => {
    // Create test user before running tests
    const page = await browser.newPage()
    try {
      await createTestUser(page)
    } catch (error) {
      console.log('Test user may already exist')
    }
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('M2-E2E-001: Should display login form elements', async ({ page }) => {
    // Verify all login form elements are present
    await expect(page.getByRole('heading', { name: /bem-vindo|login|entrar/i })).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByTestId('input-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar|login/i })).toBeVisible()
  })

  test('M2-E2E-002: Should show validation errors for invalid input', async ({ page }) => {
    // Submit empty form
    await page.getByRole('button', { name: /entrar|login/i }).click()

    // Expect validation errors
    await expect(page.getByText(/e-mail.*obrigatório|required/i)).toBeVisible()
  })

  test('M2-E2E-003: Should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.getByLabel('E-mail').fill('wrong@example.com')
    await page.getByTestId('input-password').fill('wrongpassword')
    await page.getByRole('button', { name: /entrar|login/i }).click()

    // Expect error message (frontend shows "Erro ao fazer login")
    await expect(page.getByText(/erro.*login|credenciais inválidas|invalid|incorret/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test('M2-E2E-004: Should successfully login with valid credentials', async ({ page }) => {
    // Use loginViaUI helper which has retry logic for flaky connections
    await loginViaUI(page)

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard|.*\/$/i)
  })

  test('M2-E2E-005: Should persist session after login', async ({ page, context }) => {
    // Login using helper with retry logic
    await loginViaUI(page)

    // Get the specific auth token from localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(authToken).toBeTruthy()
    expect(authToken!.length).toBeGreaterThan(10) // Tokens are long strings

    // Verify token works by making an authenticated API call
    const response = await page.request.get('http://localhost:8081/api/v1/transactions', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    expect(response.status()).toBe(200)
  })
})
