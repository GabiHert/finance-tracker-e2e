import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Zoom Controls
 * Tests zoom level changes (weekly/monthly/quarterly)
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Zoom Controls', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Zoom Controls: Seeding test data...')
			await seedM16TestData(page)
		}

		await context.close()
	})

	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to InteractiveTrendsChart section
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()
		await page.waitForTimeout(500)
	})

	test('E2E-ICHART-004: Change zoom level from monthly to weekly', async ({ page }) => {
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		const weekOption = zoomToggle.locator('text=Semana')
		const monthOption = zoomToggle.locator('text=Mês')

		await expect(zoomToggle).toBeVisible()

		// Verify initial state is monthly
		await expect(monthOption).toHaveAttribute('data-selected', 'true')

		// Setup slow network to see loading state - must be done AFTER initial load
		// and BEFORE the click that will trigger the new granularity fetch
		await page.route('**/api/v1/dashboard/trends*', async route => {
			await new Promise(resolve => setTimeout(resolve, 1000))
			await route.continue()
		})
		await page.route('**/api/v1/dashboard/category-breakdown*', async route => {
			await new Promise(resolve => setTimeout(resolve, 1000))
			await route.continue()
		})

		// Change to weekly
		await weekOption.click()

		// Verify loading state appears
		await expect(page.getByTestId('chart-loading')).toBeVisible({ timeout: 2000 })

		// Wait for data to load
		await expect(page.getByTestId('chart-loading')).not.toBeVisible({ timeout: 10000 })

		// Verify weekly is now selected
		await expect(weekOption).toHaveAttribute('data-selected', 'true')
		await expect(monthOption).toHaveAttribute('data-selected', 'false')

		// Verify data points (weekly should have more points than monthly)
		const dataPoints = page.getByTestId('chart-data-point')
		const count = await dataPoints.count()
		expect(count).toBeGreaterThan(5)
	})

	test('E2E-ICHART-005: Zoom level persists across charts', async ({ page }) => {
		const zoomToggle = page.getByTestId('chart-zoom-toggle').first()
		const quarterOption = zoomToggle.locator('text=Tri')

		await expect(zoomToggle).toBeVisible()

		// Change to quarterly
		await quarterOption.click()
		await page.waitForSelector('[data-testid="chart-loading"]', { state: 'hidden', timeout: 5000 })

		// Check InteractiveTrendsChart shows quarterly labels
		const trendsLabels = page.locator('[data-testid="interactive-trends-chart"] [data-testid="chart-x-axis-label"]')
		const labelTexts = await trendsLabels.allTextContents()
		expect(labelTexts.some(l => /T\d 20\d{2}/.test(l))).toBeTruthy()

		// Check DonutChart shows quarterly period
		const donutPeriod = page.getByTestId('donut-chart-period')
		await expect(donutPeriod).toContainText(/T\d 20\d{2}/)

		// Check CategoryTrendsChart also reflects quarterly
		const categoryTrendsLabels = page.locator('[data-testid="category-trends-chart"] [data-testid="chart-x-axis-label"]')
		if (await categoryTrendsLabels.count() > 0) {
			const categoryLabelTexts = await categoryTrendsLabels.allTextContents()
			expect(categoryLabelTexts.some(l => /T\d 20\d{2}/.test(l))).toBeTruthy()
		}
	})

	test('E2E-ICHART-019: Zoom change resets viewport to most recent', async ({ page }) => {
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')
		const weekOption = zoomToggle.locator('text=Semana')
		const monthOption = zoomToggle.locator('text=Mês')

		await expect(zoomToggle).toBeVisible()
		await expect(prevButton).toBeVisible()

		// Navigate to past
		await prevButton.click()
		await page.waitForTimeout(400)

		// Next should be enabled (not at present)
		await expect(nextButton).toBeEnabled()

		// Change zoom level
		await weekOption.click()
		await page.waitForSelector('[data-testid="chart-loading"]', { state: 'hidden', timeout: 5000 })

		// After zoom change, should reset to most recent data
		// Next should be disabled again
		await expect(nextButton).toBeDisabled()
	})

	test('E2E-ICHART-020: Zoom toggle is disabled during loading', async ({ page }) => {
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		const weekOption = zoomToggle.locator('text=Semana')
		const quarterOption = zoomToggle.locator('text=Tri')

		await expect(zoomToggle).toBeVisible()

		// Click to change zoom and immediately check toggle state
		await weekOption.click()

		// During loading, other options should be disabled or toggle should indicate loading
		const loadingIndicator = page.getByTestId('chart-loading')
		if (await loadingIndicator.isVisible()) {
			// Toggle should show loading state or be disabled
			const isDisabled = await quarterOption.isDisabled().catch(() => false)
			const hasLoadingClass = await zoomToggle.getAttribute('class')
			expect(isDisabled || hasLoadingClass?.includes('loading') || hasLoadingClass?.includes('disabled')).toBeTruthy()
		}

		// Wait for loading to complete
		await page.waitForSelector('[data-testid="chart-loading"]', { state: 'hidden', timeout: 5000 })
	})
})
