import { test, expect } from '@playwright/test'
import { API_URL } from '../fixtures/test-utils'

/**
 * M2-E2E-006 to M2-E2E-010: User Registration Flow
 * Validates the complete registration flow including UI validation,
 * backend user creation, and database persistence.
 */
test.describe('M2: Authentication - Registration', () => {
  // Generate unique email for each test run
  const uniqueEmail = `e2e-register-${Date.now()}@example.com`

  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('M2-E2E-006: Should display registration form elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /criar conta|cadastro|register/i })).toBeVisible()
    await expect(page.getByLabel(/nome/i)).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByTestId('input-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /criar|cadastrar|register/i })).toBeVisible()
  })

  test('M2-E2E-007: Should validate email format', async ({ page }) => {
    await page.getByTestId('input-name').fill('Test User')
    await page.getByTestId('input-email').fill('invalid-email')
    await page.getByTestId('input-password').fill('ValidPassword1234')
    await page.getByTestId('input-confirm-password').fill('ValidPassword1234')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /criar|cadastrar|register/i }).click()

    await expect(page.getByText(/e-mail inválido|invalid email/i)).toBeVisible()
  })

  test('M2-E2E-008: Should validate password strength', async ({ page }) => {
    await page.getByTestId('input-name').fill('Test User')
    await page.getByTestId('input-email').fill(uniqueEmail)
    await page.getByTestId('input-password').fill('weak')
    await page.getByRole('button', { name: /criar|cadastrar|register/i }).click()

    // Expect password validation error
    await expect(page.getByText(/senha.*fraca|caracteres|password.*weak|characters/i)).toBeVisible()
  })

  test('M2-E2E-009: Should successfully register new user', async ({ page }) => {
    const testEmail = `e2e-success-${Date.now()}@example.com`
    const password = 'SecurePassword1234'

    await page.getByTestId('input-name').fill('E2E New User')
    await page.getByTestId('input-email').fill(testEmail)
    await page.getByTestId('input-password').fill(password)
    await page.getByTestId('input-confirm-password').fill(password)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /criar|cadastrar|register/i }).click()

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/.*login|.*dashboard|.*\/$/i, { timeout: 15000 })
  })

  test('M2-E2E-010: Should prevent duplicate email registration', async ({ page, request }) => {
    // First, create a user via API
    const existingEmail = `e2e-duplicate-${Date.now()}@example.com`
    const password = 'TestPassword1234'
    await request.post(`${API_URL}/auth/register`, {
      data: {
        email: existingEmail,
        password: password,
        name: 'Existing User',
        terms_accepted: true,
      },
    })

    // Try to register with same email via UI
    await page.getByTestId('input-name').fill('Duplicate User')
    await page.getByTestId('input-email').fill(existingEmail)
    await page.getByTestId('input-password').fill(password)
    await page.getByTestId('input-confirm-password').fill(password)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /criar|cadastrar|register/i }).click()

    // Should show error about existing email (frontend shows "Este e-mail já está cadastrado")
    await expect(page.getByText(/já existe|already exists|já cadastrado|e-mail já/i)).toBeVisible({
      timeout: 10000,
    })
  })
})
