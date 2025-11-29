import { test, expect } from '@playwright/test'
import { TEST_USER, createTestUser } from '../fixtures/test-utils'

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
		// Step 1: Fill in credentials
		await page.getByLabel('E-mail').fill(TEST_USER.email)
		await page.getByTestId('input-password').fill(TEST_USER.password)

		// Step 2: Check Remember Me checkbox
		const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')
		await rememberMeCheckbox.click()
		await expect(rememberMeCheckbox).toBeChecked()

		// Step 3: Submit login
		await page.getByRole('button', { name: /entrar/i }).click()

		// Step 4: Verify successful login (redirected to dashboard)
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Step 5: Verify tokens are stored in localStorage
		const tokens = await page.evaluate(() => {
			return {
				accessToken: localStorage.getItem('access_token'),
				refreshToken: localStorage.getItem('refresh_token'),
			}
		})
		expect(tokens.accessToken).not.toBeNull()
		expect(tokens.refreshToken).not.toBeNull()
	})

	test('M2-E2E-05e: Should login successfully without Remember Me checked', async ({ page }) => {
		// Step 1: Fill in credentials
		await page.getByLabel('E-mail').fill(TEST_USER.email)
		await page.getByTestId('input-password').fill(TEST_USER.password)

		// Step 2: Ensure Remember Me is NOT checked
		const rememberMeCheckbox = page.getByTestId('remember-me-checkbox')
		await expect(rememberMeCheckbox).not.toBeChecked()

		// Step 3: Submit login
		await page.getByRole('button', { name: /entrar/i }).click()

		// Step 4: Verify successful login (redirected to dashboard)
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Step 5: Verify tokens are stored
		const tokens = await page.evaluate(() => {
			return {
				accessToken: localStorage.getItem('access_token'),
				refreshToken: localStorage.getItem('refresh_token'),
			}
		})
		expect(tokens.accessToken).not.toBeNull()
	})

	test('M2-E2E-05f: Should send remember_me flag in login request', async ({ page }) => {
		// Step 1: Set up request interception
		let loginRequestBody: Record<string, unknown> | null = null

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

		// Step 2: Fill in credentials and check Remember Me
		await page.getByLabel('E-mail').fill(TEST_USER.email)
		await page.getByTestId('input-password').fill(TEST_USER.password)
		await page.getByTestId('remember-me-checkbox').click()

		// Step 3: Submit login
		await page.getByRole('button', { name: /entrar/i }).click()

		// Step 4: Wait for navigation and verify request was made with remember_me
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Step 5: Verify the request body contains remember_me: true
		expect(loginRequestBody).not.toBeNull()
		expect(loginRequestBody?.remember_me).toBe(true)
	})

	test('M2-E2E-05g: Should send remember_me as false when unchecked', async ({ page }) => {
		// Step 1: Set up request interception
		let loginRequestBody: Record<string, unknown> | null = null

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

		// Step 2: Fill in credentials (Remember Me NOT checked)
		await page.getByLabel('E-mail').fill(TEST_USER.email)
		await page.getByTestId('input-password').fill(TEST_USER.password)

		// Ensure checkbox is unchecked
		await expect(page.getByTestId('remember-me-checkbox')).not.toBeChecked()

		// Step 3: Submit login
		await page.getByRole('button', { name: /entrar/i }).click()

		// Step 4: Wait for navigation and verify request was made
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Step 5: Verify the request body contains remember_me: false
		expect(loginRequestBody).not.toBeNull()
		expect(loginRequestBody?.remember_me).toBe(false)
	})
})
