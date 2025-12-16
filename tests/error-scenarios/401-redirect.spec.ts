import { test, expect } from '@playwright/test'
import { mockApiError, clearMocks } from '../fixtures/error-mocks'

/**
 * 401 Unauthorized Redirect Tests
 *
 * These tests validate that the application correctly redirects users
 * to the login page when receiving 401 Unauthorized from the API.
 *
 * Requirements Reference: Frontend UI v3.0 Section 8.2 API Error Handling
 * | Unauthorized | 401 | --- | Redirect to login |
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('Error Scenarios: 401 Unauthorized Redirect', () => {
	test.afterEach(async ({ page }) => {
		await clearMocks(page)
	})

	test('ERR-E2E-010: Should redirect to login when API returns 401 on protected route', async ({
		page,
	}) => {
		// Step 1: Navigate to authenticated page
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify we're authenticated (tokens exist)
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock ALL API endpoints to return 401
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Trigger an API call (e.g., refresh or navigate)
		await page.reload()

		// Step 5: Verify redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Step 6: Verify tokens were cleared
		const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenAfter).toBeNull()
	})

	test('ERR-E2E-011: Should redirect to login when transactions API returns 401', async ({
		page,
	}) => {
		// Step 1: Navigate to transactions first (to load page structure)
		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 error for transactions requests
		await mockApiError(page, '**/api/v1/transactions**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Refresh to trigger error
		await page.reload()

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-012: Should redirect to login when categories API returns 401', async ({
		page,
	}) => {
		// Step 1: Navigate to categories
		await page.goto('/categories')
		await page.waitForLoadState('domcontentloaded')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 error for categories requests
		await mockApiError(page, '**/api/v1/categories**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Refresh to trigger error
		await page.reload()

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-013: Should redirect to login when dashboard loads with 401', async ({
		page,
	}) => {
		// Note: Dashboard uses transactions API internally, so we mock that
		// Step 1: Navigate to dashboard first (let it load)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 error for ALL endpoints (dashboard uses transactions internally)
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Refresh to trigger the API call
		await page.reload()

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-014: Should clear tokens from localStorage on 401 redirect', async ({ page }) => {
		// Step 1: Navigate to dashboard and verify tokens exist
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		const accessToken = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(accessToken).toBeTruthy()

		// Step 2: Mock 401 for any API call
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 3: Trigger API call
		await page.reload()

		// Step 4: Wait for redirect
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Step 5: Verify tokens are cleared
		const accessTokenAfter = await page.evaluate(() => localStorage.getItem('access_token'))
		const refreshTokenAfter = await page.evaluate(() => localStorage.getItem('refresh_token'))

		expect(accessTokenAfter).toBeNull()
		expect(refreshTokenAfter).toBeNull()
	})

	test('ERR-E2E-015: Should handle 401 when navigating between authenticated pages', async ({
		page,
	}) => {
		// Step 1: Navigate to transactions
		await page.goto('/transactions')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 for ALL API requests
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Navigate to categories (triggers categories API call)
		await page.goto('/categories')

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-016: Should handle 401 mid-session without crashing', async ({ page }) => {
		// Step 1: Navigate to dashboard - fully loaded
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify app is working (some content visible)
		const dashboardScreen = page.getByTestId('dashboard-screen')
		await expect(dashboardScreen).toBeVisible({ timeout: 10000 })

		// Step 3: Simulate token expiration - mock 401 on next API call
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Navigate to another page (triggers API call)
		await page.goto('/transactions')

		// Step 5: Should redirect to login seamlessly
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Step 6: App should not have crashed - login page should be functional
		await expect(page.getByLabel('E-mail')).toBeVisible()
		await expect(page.getByTestId('input-password')).toBeVisible()
	})

	test('ERR-E2E-017: Should handle 401 when goals page triggers API call', async ({ page }) => {
		// Note: Goals page uses fetchTransactions internally to calculate progress
		// Step 1: Navigate to goals page
		await page.goto('/goals')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 error for ALL API requests (goals uses transactions internally)
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Refresh to trigger error (goals recalculates progress on load)
		await page.reload()

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-018: Should handle 401 when loading categories page fresh', async ({ page }) => {
		// Step 1: Mock 401 for categories API BEFORE navigation
		await mockApiError(page, '**/api/v1/categories**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 2: Navigate to categories (will trigger 401 on initial load)
		await page.goto('/categories')

		// Step 3: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})

	test('ERR-E2E-019: Should redirect when authenticated page receives 401 on any action', async ({ page }) => {
		// This test verifies the general 401 handling works from different pages
		// Step 1: Navigate to categories page (which loads categories on mount)
		await page.goto('/categories')
		await page.waitForLoadState('networkidle')

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 for ALL API requests
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Navigate to a different page to trigger a fresh API call
		await page.goto('/transactions')

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Step 6: Verify tokens were cleared
		const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenAfter).toBeNull()
	})

	test('ERR-E2E-020: Should handle 401 on settings page operations', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Verify we're authenticated
		const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
		expect(tokenBefore).toBeTruthy()

		// Step 3: Mock 401 for any API requests
		await mockApiError(page, '**/api/v1/**', 401, 'Token expired', 'UNAUTHORIZED')

		// Step 4: Navigate away to trigger an API call
		await page.goto('/dashboard')

		// Step 5: Should redirect to login
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
	})
})
