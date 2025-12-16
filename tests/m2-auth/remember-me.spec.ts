import { test, expect } from '@playwright/test'
import { TEST_USER, createTestUser, loginViaUI, loginViaUIWithRequestCapture } from '../fixtures/test-utils'

/**
 * M2-E2E-05: Remember Me Functionality
 * Validates the "Remember Me" checkbox in the login form:
 * - Checkbox visibility and interaction
 * - Token storage when "Remember Me" is checked
 * - Login request includes remember_me parameter
 *
 * Note: These tests do NOT use saved auth state as they test
 * the login flow itself.
 */
test.describe('M2: Remember Me Functionality', () => {
	test.beforeAll(async ({ browser }) => {
		// Create test user before running tests
		const page = await browser.newPage()
		try {
			await createTestUser(page)
		} catch {
			console.log('Test user may already exist')
		}
		await page.close()
	})

	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
		await expect(page.getByLabel('E-mail')).toBeVisible()
	})

	test('M2-E2E-05a: Should display "Remember Me" checkbox in login form', async ({ page }) => {
		// Step 1: Verify the Remember Me checkbox is visible
		const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')
		await expect(rememberMeCheckbox).toBeVisible()

		// Step 2: Verify the label is visible
		const rememberMeLabel = page.getByTestId('remember-me-label')
		await expect(rememberMeLabel).toBeVisible()
		await expect(rememberMeLabel).toContainText(/Lembrar de mim/i)
	})

	test('M2-E2E-05b: Checkbox should be unchecked by default', async ({ page }) => {
		// Verify checkbox is unchecked by default
		const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')
		await expect(rememberMeCheckbox).not.toBeChecked()
	})

	test('M2-E2E-05c: Should be able to toggle the checkbox', async ({ page }) => {
		const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')

		// Step 1: Initially unchecked
		await expect(rememberMeCheckbox).not.toBeChecked()

		// Step 2: Click to check
		await rememberMeCheckbox.click()
		await expect(rememberMeCheckbox).toBeChecked()

		// Step 3: Click to uncheck
		await rememberMeCheckbox.click()
		await expect(rememberMeCheckbox).not.toBeChecked()
	})

	test('M2-E2E-05d: Should login successfully with Remember Me checked', async ({ page }) => {
		const maxRetries = 3

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			// Add small delay between retry attempts to let backend state settle
			if (attempt > 1) {
				await page.waitForTimeout(1000)
				await page.goto('/login')
				await expect(page.getByLabel('E-mail')).toBeVisible()
			}

			// Step 1: Fill in credentials
			const emailField = page.getByLabel('E-mail')
			const passwordField = page.getByTestId('input-password')

			await emailField.clear()
			await emailField.fill(TEST_USER.email)
			await passwordField.clear()
			await passwordField.fill(TEST_USER.password)

			// Step 2: Check Remember Me checkbox
			const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')
			const isChecked = await rememberMeCheckbox.isChecked()
			if (!isChecked) {
				await rememberMeCheckbox.click()
			}
			await expect(rememberMeCheckbox).toBeChecked()

			// Step 3: Submit login
			await page.getByRole('button', { name: /entrar/i }).click()

			// Step 4: Wait for navigation or error
			try {
				await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

				// Step 5: Verify tokens are stored in localStorage
				const tokens = await page.evaluate(() => {
					return {
						accessToken: localStorage.getItem('access_token'),
						refreshToken: localStorage.getItem('refresh_token'),
					}
				})
				expect(tokens.accessToken).not.toBeNull()
				expect(tokens.refreshToken).not.toBeNull()

				// Success - exit loop
				return
			} catch (error) {
				// Check if there's an error message on the page (rate limit or auth error)
				const hasError = await page
					.getByText(/erro|error|aguarde|wait|limite|limit/i)
					.isVisible()
					.then(() => true, () => false)

				if (attempt === maxRetries) {
					throw new Error(
						`Login failed after ${maxRetries} attempts. ` +
							(hasError ? 'Backend returned error (may be rate limited).' : 'Navigation timeout.')
					)
				}
			}
		}
	})

	test('M2-E2E-05e: Should login successfully without Remember Me checked', async ({ page }) => {
		// Use loginViaUI helper which has retry logic for flaky connections
		// This tests login without Remember Me (default state - unchecked)
		await loginViaUI(page)

		// Verify successful login (redirected to dashboard)
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

		// Verify tokens are stored
		const tokens = await page.evaluate(() => {
			return {
				accessToken: localStorage.getItem('access_token'),
				refreshToken: localStorage.getItem('refresh_token'),
			}
		})
		expect(tokens.accessToken).not.toBeNull()
	})

	test('M2-E2E-05f: Should send remember_me flag in login request', async ({ page }) => {
		// Use helper with retry logic and request capture
		const { requestBody } = await loginViaUIWithRequestCapture(page, { rememberMe: true })

		// Verify successful navigation
		await expect(page).toHaveURL(/.*dashboard/)

		// Verify the request body contains remember_me: true
		expect(requestBody).not.toBeNull()
		expect(requestBody?.remember_me).toBe(true)
	})

	test('M2-E2E-05g: Should send remember_me as false when unchecked', async ({ page }) => {
		// Use helper with retry logic and request capture (remember me unchecked)
		const { requestBody } = await loginViaUIWithRequestCapture(page, { rememberMe: false })

		// Verify successful navigation
		await expect(page).toHaveURL(/.*dashboard/)

		// Verify the request body contains remember_me: false
		expect(requestBody).not.toBeNull()
		expect(requestBody?.remember_me).toBe(false)
	})
})
