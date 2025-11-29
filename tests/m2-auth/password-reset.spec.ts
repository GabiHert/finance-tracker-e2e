import { test, expect } from '@playwright/test'

/**
 * M2-E2E-06: Password Reset Flow
 * Validates the complete password reset flow including:
 * - Requesting password reset via email
 * - Displaying success message after email submission
 * - Password reset form with valid token
 * - Error handling for invalid/expired tokens
 *
 * Note: Since the backend may not have the reset token validation,
 * we focus on frontend UI validation and flow testing.
 */
test.describe('M2: Password Reset Flow', () => {
	test('M2-E2E-06a: Should navigate to forgot password from login screen', async ({ page }) => {
		// Step 1: Navigate to login screen
		await page.goto('/login')
		await expect(page.getByLabel('E-mail')).toBeVisible()

		// Step 2: Click forgot password link
		await page.click('text=Esqueceu a senha?')

		// Step 3: Verify navigation to forgot password page
		await expect(page).toHaveURL(/.*forgot-password/)
		await expect(page.getByText('Esqueceu a senha?')).toBeVisible()
		await expect(page.getByText('Digite seu e-mail para receber um link de recuperacao')).toBeVisible()
	})

	test('M2-E2E-06b: Should request password reset and show success message', async ({ page }) => {
		// Step 1: Navigate to forgot password screen
		await page.goto('/forgot-password')

		// Step 2: Verify the form is visible
		await expect(page.getByTestId('forgot-email-input')).toBeVisible()
		await expect(page.getByTestId('send-reset-link-btn')).toBeVisible()

		// Step 3: Fill in email
		await page.getByTestId('forgot-email-input').fill('test@example.com')

		// Step 4: Click send link button
		await page.getByTestId('send-reset-link-btn').click()

		// Step 5: Verify success message appears (always shown to prevent email enumeration)
		await expect(page.getByTestId('success-message')).toBeVisible({ timeout: 10000 })
		await expect(page.getByTestId('success-message')).toContainText(/Se o e-mail existir/i)

		// Step 6: Verify link to go back to login
		await expect(page.getByText('Voltar para o login')).toBeVisible()
	})

	test('M2-E2E-06c: Should show error for invalid email format', async ({ page }) => {
		// Navigate to forgot password screen
		await page.goto('/forgot-password')

		// Fill in invalid email
		await page.getByTestId('forgot-email-input').fill('invalid-email')

		// Click send link button
		await page.getByTestId('send-reset-link-btn').click()

		// Should show validation error (form should not submit)
		// The form will validate on submit and show error
		await expect(page.getByText(/invalido/i)).toBeVisible({ timeout: 5000 })
	})

	test('M2-E2E-06d: Should show error when accessing reset without token', async ({ page }) => {
		// Navigate to reset password page without token
		await page.goto('/reset-password')

		// Should show error message for missing/invalid token
		await expect(page.getByTestId('error-message')).toBeVisible()
		await expect(page.getByTestId('error-message')).toContainText(/expirado|invalido/i)

		// Should show link to request new reset
		await expect(page.getByTestId('request-new-link')).toBeVisible()
		await expect(page.getByTestId('request-new-link')).toContainText(/Solicitar novo link/i)
	})

	test('M2-E2E-06e: Reset password form should validate inputs', async ({ page }) => {
		// Navigate to reset password page with a token (even if fake, to test UI)
		await page.goto('/reset-password?token=test-token-123')

		// Step 1: Verify form is visible
		await expect(page.getByRole('heading', { name: 'Redefinir senha' })).toBeVisible()
		await expect(page.getByTestId('new-password-input')).toBeVisible()
		await expect(page.getByTestId('confirm-password-input')).toBeVisible()
		await expect(page.getByTestId('reset-password-btn')).toBeVisible()

		// Step 2: Submit without filling any fields
		await page.getByTestId('reset-password-btn').click()

		// Should show error for missing password
		await expect(page.getByTestId('reset-error')).toBeVisible({ timeout: 5000 })

		// Step 3: Fill only password, no confirmation
		await page.getByTestId('new-password-input').fill('NewPass123')
		await page.getByTestId('reset-password-btn').click()

		// Should show error for password mismatch
		await expect(page.getByTestId('reset-error')).toBeVisible()
		await expect(page.getByTestId('reset-error')).toContainText(/conferem|nao conferem/i)

		// Step 4: Fill mismatched passwords
		await page.getByTestId('confirm-password-input').fill('DifferentPass456')
		await page.getByTestId('reset-password-btn').click()

		// Should show error for password mismatch
		await expect(page.getByTestId('reset-error')).toContainText(/conferem|nao conferem/i)
	})

	test('M2-E2E-06f: Request new link should navigate to forgot password', async ({ page }) => {
		// Navigate to reset password page without token
		await page.goto('/reset-password')

		// Click request new link
		await page.getByTestId('request-new-link').click()

		// Should navigate to forgot password page
		await expect(page).toHaveURL(/.*forgot-password/)
	})

	test('M2-E2E-06g: Back to login link works from forgot password', async ({ page }) => {
		// Navigate to forgot password
		await page.goto('/forgot-password')

		// Click back to login
		await page.click('text=Voltar para o login')

		// Should navigate to login page
		await expect(page).toHaveURL(/.*login/)
	})
})
