import { test, expect } from '@playwright/test'
import { TEST_USER, createTestUser, loginViaUI } from '../fixtures/test-utils'

/**
 * M2-E2E-07: User Logout Flow
 * Validates the complete logout flow including:
 * - Logout button functionality
 * - Session clearing
 * - Redirect to login
 * - Protected route access after logout
 *
 * Authentication: These tests do NOT use saved auth state
 * (they test the login/logout flow directly)
 */
test.describe('M2: Authentication - Logout', () => {
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

	// Add delay between tests to avoid rate limiting (backend limits ~5 req/10s)
	test.beforeEach(async ({ page }) => {
		await page.waitForTimeout(4000)
	})

	test('M2-E2E-007: Should logout and redirect to login screen', async ({ page, context }) => {
		// Login first
		await loginViaUI(page)

		// Verify we're on dashboard
		await expect(page).toHaveURL(/.*dashboard/)

		// Navigate to settings where logout button is
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Click logout button
		const logoutBtn = page.getByTestId('logout-btn')
		await expect(logoutBtn).toBeVisible()
		await logoutBtn.click()

		// Verify redirect to login screen
		await expect(page).toHaveURL(/.*login/)
		await expect(page.getByLabel('E-mail')).toBeVisible()

		// Verify session is cleared - try to access protected route
		await page.goto('/dashboard')
		// Should be redirected to login
		await expect(page).toHaveURL(/.*login/)

		// Verify tokens are cleared
		const localStorage = await page.evaluate(() => {
			return Object.keys(window.localStorage).filter(
				(k) => k.includes('token') || k.includes('auth')
			)
		})
		expect(localStorage.length).toBe(0)
	})

	test('M2-E2E-007b: Should be able to login again after logout', async ({ page }) => {
		// Login
		await loginViaUI(page)
		await expect(page).toHaveURL(/.*dashboard/)

		// Navigate to settings and logout
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()
		await page.getByTestId('logout-btn').click()

		// Verify redirected to login
		await expect(page).toHaveURL(/.*login/)

		// Wait for rate limiting before attempting login again (longer wait for cooldown)
		await page.waitForTimeout(8000)

		// Login again using the helper with retry logic
		await loginViaUI(page)

		// Verify we're back on dashboard
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })
	})
})
