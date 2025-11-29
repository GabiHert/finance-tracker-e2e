import { test, expect } from '@playwright/test'
import { TEST_USER, createTestUser, loginViaUI, API_URL } from '../fixtures/test-utils'

/**
 * M2-E2E-08: Token Refresh Functionality
 * Validates token refresh behavior:
 * - Tokens are stored after login
 * - Invalid refresh token returns error
 * - Tokens are cleared on logout
 * - Protected routes require valid tokens
 *
 * Note: These tests verify the token storage and basic refresh behavior.
 * Uses UI login with retry logic to avoid rate limiting issues.
 */
test.describe('M2: Token Refresh Functionality', () => {
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

	test('M2-E2E-08a: Should store access and refresh tokens after login', async ({ page }) => {
		// Step 1: Login via UI
		await loginViaUI(page)

		// Step 2: Verify tokens are stored in localStorage
		const tokens = await page.evaluate(() => ({
			accessToken: localStorage.getItem('access_token'),
			refreshToken: localStorage.getItem('refresh_token'),
		}))

		expect(tokens.accessToken).not.toBeNull()
		expect(tokens.refreshToken).not.toBeNull()

		// Step 3: Tokens should be non-empty strings
		expect(tokens.accessToken!.length).toBeGreaterThan(10)
		expect(tokens.refreshToken!.length).toBeGreaterThan(10)
	})

	test('M2-E2E-08b: Should fail refresh with invalid refresh token', async ({ page }) => {
		// Step 1: Try to refresh with invalid token
		const refreshResponse = await page.request.post(`${API_URL}/auth/refresh`, {
			data: {
				refresh_token: 'invalid-refresh-token-that-does-not-exist',
			},
		})

		// Step 2: Should return error (401 or 400)
		expect(refreshResponse.ok()).toBeFalsy()
	})

	test('M2-E2E-08c: Should redirect to login when no tokens present', async ({ page }) => {
		// Step 1: Navigate to app and clear any existing tokens
		await page.goto('/login')
		await page.evaluate(() => {
			localStorage.removeItem('access_token')
			localStorage.removeItem('refresh_token')
		})

		// Step 2: Try to navigate to a protected route
		await page.goto('/dashboard')

		// Step 3: Should be redirected to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('M2-E2E-08d: Should clear tokens and redirect to login on logout', async ({ page }) => {
		// Step 1: Login via UI
		await loginViaUI(page)

		// Step 2: Verify tokens are stored
		const tokensBeforeLogout = await page.evaluate(() => ({
			accessToken: localStorage.getItem('access_token'),
			refreshToken: localStorage.getItem('refresh_token'),
		}))
		expect(tokensBeforeLogout.accessToken).not.toBeNull()

		// Step 3: Navigate to settings and logout
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()
		await page.getByTestId('logout-btn').click()

		// Step 4: Should be redirected to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Step 5: Tokens should be cleared
		const tokensAfterLogout = await page.evaluate(() => ({
			accessToken: localStorage.getItem('access_token'),
			refreshToken: localStorage.getItem('refresh_token'),
		}))
		expect(tokensAfterLogout.accessToken).toBeNull()
		expect(tokensAfterLogout.refreshToken).toBeNull()
	})

	test('M2-E2E-08e: Should use refresh token to get new access token', async ({ page }) => {
		// Step 1: Login via UI to get tokens
		await loginViaUI(page)

		// Step 2: Get initial tokens
		const initialTokens = await page.evaluate(() => ({
			accessToken: localStorage.getItem('access_token'),
			refreshToken: localStorage.getItem('refresh_token'),
		}))
		expect(initialTokens.refreshToken).not.toBeNull()

		// Step 3: Call refresh endpoint with the refresh token
		const refreshResponse = await page.request.post(`${API_URL}/auth/refresh`, {
			data: {
				refresh_token: initialTokens.refreshToken,
			},
		})

		// Step 4: Verify refresh was successful
		expect(refreshResponse.ok()).toBeTruthy()
		const refreshData = await refreshResponse.json()
		expect(refreshData.access_token).toBeDefined()
		expect(refreshData.refresh_token).toBeDefined()

		// Step 5: New tokens should be different from original
		expect(refreshData.access_token).not.toBe(initialTokens.accessToken)
	})

	test('M2-E2E-08f: Protected routes should work with valid tokens', async ({ page }) => {
		// Step 1: Login via UI
		await loginViaUI(page)

		// Step 2: Navigate to various protected routes
		await page.goto('/dashboard')
		await expect(page).toHaveURL(/.*dashboard/)

		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 3: Navigate to categories (protected)
		await page.goto('/categories')
		await expect(page).not.toHaveURL(/.*login/)
	})
})
