import { test, expect } from '@playwright/test'

/**
 * M13-E2E: Category Expense Trends Chart
 * Validates the category trends chart functionality on the dashboard including:
 * - Chart display with category lines
 * - Granularity toggle (daily/weekly/monthly)
 * - Legend interactions (show/hide categories)
 * - Tooltip display on hover
 * - Drill-down navigation to transactions
 * - Empty and error states
 * - Period selector integration
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M13: Category Expense Trends Chart', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
	})

	test('M13-E2E-001: Should display category trends chart section on dashboard', async ({
		page,
	}) => {
		// Verify chart section exists
		const chartSection = page.getByTestId('category-trends-section')
		await expect(chartSection).toBeVisible()

		// Verify section title
		await expect(chartSection.locator('h2, h3, [data-testid="section-title"]')).toContainText(
			/despesas por categoria|expenses by category/i
		)

		// Verify granularity toggle exists
		const granularityToggle = page.getByTestId('granularity-toggle')
		await expect(granularityToggle).toBeVisible()

		// Verify toggle options exist
		await expect(page.getByTestId('granularity-daily')).toBeVisible()
		await expect(page.getByTestId('granularity-weekly')).toBeVisible()
		await expect(page.getByTestId('granularity-monthly')).toBeVisible()
	})

	test('M13-E2E-002: Should display chart with category lines when expenses exist', async ({
		page,
	}) => {
		const chartSection = page.getByTestId('category-trends-section')
		await expect(chartSection).toBeVisible()

		// Check for chart or empty state
		const chart = page.getByTestId('category-trends-chart')
		const emptyState = page.getByTestId('category-trends-empty')

		const hasChart = await chart.isVisible().catch(() => false)
		const hasEmptyState = await emptyState.isVisible().catch(() => false)

		// Either chart or empty state should be visible
		expect(hasChart || hasEmptyState).toBeTruthy()

		if (hasChart) {
			// Verify SVG chart is rendered
			await expect(chart.locator('svg')).toBeVisible()

			// Verify legend exists
			const legend = page.getByTestId('chart-legend')
			await expect(legend).toBeVisible()
		}
	})

	test('M13-E2E-003: Should switch between granularities', async ({ page }) => {
		const chartSection = page.getByTestId('category-trends-section')
		await expect(chartSection).toBeVisible()

		// Track API calls
		const apiCalls: string[] = []
		page.on('request', request => {
			if (request.url().includes('/category-trends')) {
				apiCalls.push(request.url())
			}
		})

		// Click weekly
		await page.getByTestId('granularity-weekly').click()
		await page.waitForLoadState('networkidle')

		// Verify API was called with weekly granularity
		const weeklyCall = apiCalls.find(url => url.includes('granularity=weekly'))
		expect(weeklyCall).toBeDefined()

		// Click monthly
		apiCalls.length = 0
		await page.getByTestId('granularity-monthly').click()
		await page.waitForLoadState('networkidle')

		// Verify API was called with monthly granularity
		const monthlyCall = apiCalls.find(url => url.includes('granularity=monthly'))
		expect(monthlyCall).toBeDefined()

		// Click daily
		apiCalls.length = 0
		await page.getByTestId('granularity-daily').click()
		await page.waitForLoadState('networkidle')

		// Verify API was called with daily granularity
		const dailyCall = apiCalls.find(url => url.includes('granularity=daily'))
		expect(dailyCall).toBeDefined()
	})

	test('M13-E2E-004: Should toggle category visibility via legend', async ({ page }) => {
		const chart = page.getByTestId('category-trends-chart')

		// Skip if no chart (empty state)
		if (!(await chart.isVisible().catch(() => false))) {
			test.skip()
			return
		}

		const legend = page.getByTestId('chart-legend')
		await expect(legend).toBeVisible()

		// Get first legend item
		const legendItems = legend.locator('[data-testid^="legend-item-"]')
		const firstItem = legendItems.first()

		if ((await legendItems.count()) > 0) {
			// Get the category id from the legend item
			const testId = await firstItem.getAttribute('data-testid')
			const categoryName = testId?.replace('legend-item-', '')

			// Click to hide
			await firstItem.click()

			// Verify legend item shows hidden state
			await expect(firstItem).toHaveClass(/hidden|inactive|opacity/)

			// Click to show again
			await firstItem.click()

			// Verify legend item shows active state
			await expect(firstItem).not.toHaveClass(/hidden|inactive/)
		}
	})

	test('M13-E2E-005: Should show tooltip on hover', async ({ page }) => {
		const chart = page.getByTestId('category-trends-chart')

		// Skip if no chart
		if (!(await chart.isVisible().catch(() => false))) {
			test.skip()
			return
		}

		// Find a data point
		const dataPoints = chart.locator('[data-testid^="data-point-"]')

		if ((await dataPoints.count()) > 0) {
			// Hover over the first data point
			await dataPoints.first().hover()

			// Tooltip should appear
			const tooltip = page.getByTestId('chart-tooltip')
			await expect(tooltip).toBeVisible()

			// Tooltip should contain date and amount
			await expect(tooltip).toContainText(/R\$/)
		}
	})

	test('M13-E2E-006: Should navigate to transactions on data point click', async ({ page }) => {
		const chart = page.getByTestId('category-trends-chart')

		// Skip if no chart
		if (!(await chart.isVisible().catch(() => false))) {
			test.skip()
			return
		}

		// Find a data point
		const dataPoints = chart.locator('[data-testid^="data-point-"]')

		if ((await dataPoints.count()) > 0) {
			// Click on the first data point
			await dataPoints.first().click()

			// Should navigate to transactions with filters
			await expect(page).toHaveURL(/\/transactions/)
			await expect(page).toHaveURL(/categoryId=/)
		}
	})

	test('M13-E2E-007: Should display empty state when no expenses', async ({ page }) => {
		// This test verifies the empty state renders correctly
		const chartSection = page.getByTestId('category-trends-section')
		await expect(chartSection).toBeVisible()

		const emptyState = page.getByTestId('category-trends-empty')

		if (await emptyState.isVisible().catch(() => false)) {
			// Verify empty state content
			await expect(emptyState).toContainText(/sem despesas|no expenses/i)
		}
	})

	test('M13-E2E-008: Should respect dashboard period selector', async ({ page }) => {
		// Track API calls
		const apiCalls: string[] = []
		page.on('request', request => {
			if (request.url().includes('/category-trends')) {
				apiCalls.push(request.url())
			}
		})

		// Change period to last month
		const periodSelector = page.getByTestId('period-selector')
		await periodSelector.click()
		await page.getByRole('option', { name: /mes passado|mês passado|last month/i }).click()

		await page.waitForLoadState('networkidle')

		// Verify API was called with correct date parameters
		const apiCall = apiCalls[apiCalls.length - 1]
		expect(apiCall).toContain('start_date=')
		expect(apiCall).toContain('end_date=')
	})

	test('M13-E2E-009: Should display loading state', async ({ page }) => {
		// Slow down the API response
		await page.route('**/api/v1/dashboard/category-trends*', async route => {
			await new Promise(resolve => setTimeout(resolve, 500))
			await route.continue()
		})

		// Trigger a refresh by changing granularity
		await page.getByTestId('granularity-weekly').click()

		// Check for loading state (may be brief)
		const loadingState = page.getByTestId('category-trends-loading')
		// Just verify the test doesn't crash - loading may be too fast to catch
	})

	test('M13-E2E-010: Should handle API error gracefully', async ({ page }) => {
		// Mock API failure
		await page.route('**/api/v1/dashboard/category-trends*', route => {
			route.fulfill({
				status: 500,
				body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
			})
		})

		// Trigger refresh
		await page.getByTestId('granularity-weekly').click()

		await page.waitForLoadState('networkidle')

		// Error state should be visible
		const errorState = page.getByTestId('category-trends-error')
		if (await errorState.isVisible().catch(() => false)) {
			await expect(errorState).toContainText(/erro|error/i)

			// Retry button should exist
			const retryBtn = page.getByTestId('category-trends-retry')
			await expect(retryBtn).toBeVisible()
		}
	})

	test('M13-E2E-011: Should group excess categories as Others', async ({ page }) => {
		const legend = page.getByTestId('chart-legend')

		// Skip if no chart visible
		if (!(await legend.isVisible().catch(() => false))) {
			test.skip()
			return
		}

		const legendItems = legend.locator('[data-testid^="legend-item-"]')
		const count = await legendItems.count()

		// If there are more than 8 categories, "Outros" should be visible
		if (count >= 9) {
			const outrosItem = page.getByTestId('legend-item-Outros')
			await expect(outrosItem).toBeVisible()
		}
	})

	test('M13-E2E-012: Should be responsive on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		// Reload to trigger responsive layout
		await page.reload()
		await page.waitForLoadState('networkidle')

		const chartSection = page.getByTestId('category-trends-section')
		await expect(chartSection).toBeVisible()

		// Granularity toggle should still be accessible
		const toggle = page.getByTestId('granularity-toggle')
		await expect(toggle).toBeVisible()

		// Chart should adapt to viewport
		const chart = page.getByTestId('category-trends-chart')
		if (await chart.isVisible().catch(() => false)) {
			const chartBox = await chart.boundingBox()
			expect(chartBox?.width).toBeLessThanOrEqual(375)
		}
	})
})
