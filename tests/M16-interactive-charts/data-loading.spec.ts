import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Data Loading
 * Tests loading states and error handling
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Data Loading', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Data Loading: Seeding test data...')
			await seedM16TestData(page)
		}

		await context.close()
	})

	test('E2E-ICHART-011: Loading state during scroll', async ({ page }) => {
		// Setup slow network to see loading state
		await page.route('**/api/v1/dashboard/trends*', async route => {
			await new Promise(resolve => setTimeout(resolve, 500))
			await route.continue()
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Scroll to trigger new data fetch
		const prevButton = page.getByTestId('chart-nav-prev')
		await expect(prevButton).toBeVisible()
		await prevButton.click()

		// Verify loading state appears
		const loadingIndicator = page.getByTestId('chart-loading')
		await expect(loadingIndicator).toBeVisible()

		// Wait for it to disappear
		await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 })
	})

	test('E2E-ICHART-012: Error handling on data fetch failure', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to InteractiveTrendsChart
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()

		// Make API requests fail (both trends and category-breakdown)
		await page.route('**/api/v1/dashboard/trends*', route => {
			route.fulfill({ status: 500, body: 'Internal Server Error' })
		})
		await page.route('**/api/v1/dashboard/category-breakdown*', route => {
			route.fulfill({ status: 500, body: 'Internal Server Error' })
		})

		// Click prev to trigger navigation and failed fetch
		const prevButton = page.getByTestId('chart-nav-prev')
		await expect(prevButton).toBeEnabled()
		await prevButton.click()

		// Verify error toast appears (implicitly waits for it)
		const toast = page.getByTestId('toast-error')
		await expect(toast).toBeVisible({ timeout: 5000 })
		await expect(toast).toContainText(/erro/i)
	})

	test('E2E-ICHART-015: Empty period handling', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Navigate to past to potentially find empty periods
		const prevButton = page.getByTestId('chart-nav-prev')

		// Click prev multiple times, waiting for chart update after each
		for (let i = 0; i < 10; i++) {
			if (await prevButton.isDisabled()) break
			await prevButton.click()
			// Wait for chart to finish updating
			await expect(page.getByTestId('trends-chart-viewport')).toBeVisible({ timeout: 2000 })
		}

		// Chart should still be visible even with empty data
		const chartArea = page.getByTestId('trends-chart-viewport')
		await expect(chartArea).toBeVisible()

		// Empty state indicator may appear
		const emptyIndicator = page.getByTestId('chart-empty-period')
		if (await emptyIndicator.isVisible()) {
			await expect(emptyIndicator).toContainText(/sem dados/i)
		}
	})

	test('E2E-ICHART-016: New user with no data', async ({ page }) => {
		// Mock empty data range
		await page.route('**/api/v1/dashboard/data-range', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					data: {
						oldest_date: null,
						newest_date: null,
						total_transactions: 0,
						has_data: false,
					},
				}),
			})
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify empty state
		const emptyState = page.getByTestId('chart-empty-state')
		await expect(emptyState).toBeVisible()
		await expect(emptyState).toContainText(/nenhum dado/i)

		// Verify import CTA
		const importCta = page.getByTestId('import-cta')
		await expect(importCta).toBeVisible()
	})

	test('E2E-ICHART-027: Cached data used on repeat scroll', async ({ page }) => {
		let apiCallCount = 0

		// Track API calls
		await page.route('**/api/v1/dashboard/trends*', async route => {
			apiCallCount++
			await route.continue()
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		// Reset counter after initial load
		apiCallCount = 0

		// Navigate to past
		await prevButton.click()
		await expect(page.getByTestId('trends-chart-viewport')).toBeVisible({ timeout: 2000 })
		const callsAfterPrev = apiCallCount

		// Navigate back to present
		await nextButton.click()
		await expect(page.getByTestId('trends-chart-viewport')).toBeVisible({ timeout: 2000 })

		// Navigate to past again - should use cache
		await prevButton.click()
		await expect(page.getByTestId('trends-chart-viewport')).toBeVisible({ timeout: 2000 })

		// Second visit to same position should not trigger new API call (cached)
		// Allow for one additional call max
		expect(apiCallCount).toBeLessThanOrEqual(callsAfterPrev + 1)
	})

	test('E2E-ICHART-028: Loading overlay positioned correctly', async ({ page }) => {
		// Setup slow network
		await page.route('**/api/v1/dashboard/trends*', async route => {
			await new Promise(resolve => setTimeout(resolve, 1000))
			await route.continue()
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Trigger loading
		const prevButton = page.getByTestId('chart-nav-prev')
		await prevButton.click()

		// Verify loading overlay is positioned on chart
		const loadingOverlay = page.getByTestId('chart-loading')
		const chartViewport = page.getByTestId('trends-chart-viewport')

		await expect(loadingOverlay).toBeVisible()

		const overlayBox = await loadingOverlay.boundingBox()
		const chartBox = await chartViewport.boundingBox()

		expect(overlayBox).not.toBeNull()
		expect(chartBox).not.toBeNull()

		// Overlay should be within or covering the chart area
		expect(overlayBox!.x).toBeGreaterThanOrEqual(chartBox!.x - 10)
		expect(overlayBox!.y).toBeGreaterThanOrEqual(chartBox!.y - 10)
	})
})
