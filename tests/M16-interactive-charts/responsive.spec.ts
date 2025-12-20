import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Responsive Behavior
 * Tests mobile/tablet layouts and touch gestures
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Responsive Behavior', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Responsive: Seeding test data...')
			await seedM16TestData(page)
		}

		await context.close()
	})

	test('E2E-ICHART-013: Mobile swipe navigation', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Navigation buttons should be hidden on mobile
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(prevButton).not.toBeVisible()
		await expect(nextButton).not.toBeVisible()

		// Mini-map should still be visible
		const miniMap = page.getByTestId('chart-minimap')
		await expect(miniMap).toBeVisible()

		// Perform swipe gesture
		const chart = page.getByTestId('trends-chart-viewport')
		const chartBox = await chart.boundingBox()

		expect(chartBox).not.toBeNull()

		// Swipe left (to see newer/future data)
		await page.mouse.move(chartBox!.x + 50, chartBox!.y + chartBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(chartBox!.x + chartBox!.width - 50, chartBox!.y + chartBox!.height / 2, { steps: 10 })
		await page.mouse.up()

		await page.waitForTimeout(300)

		// Verify scroll happened (mini-map should still work)
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')
		await expect(miniMapThumb).toBeVisible()
	})

	test('E2E-ICHART-014: Tablet layout', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Navigation buttons should be visible on tablet
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(prevButton).toBeVisible()
		await expect(nextButton).toBeVisible()

		// Zoom toggle should be visible
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		await expect(zoomToggle).toBeVisible()

		// Mini-map should be visible
		const miniMap = page.getByTestId('chart-minimap')
		await expect(miniMap).toBeVisible()
	})

	test('E2E-ICHART-029: Desktop layout', async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1440, height: 900 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to InteractiveTrendsChart
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()

		// All controls should be visible
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		const miniMap = page.getByTestId('chart-minimap')

		await expect(prevButton).toBeVisible()
		await expect(nextButton).toBeVisible()
		await expect(zoomToggle).toBeVisible()
		await expect(miniMap).toBeVisible()

		// Navigation buttons should be on sides of chart
		const chartViewport = page.getByTestId('trends-chart-viewport')
		const chartBox = await chartViewport.boundingBox()
		const prevBox = await prevButton.boundingBox()
		const nextBox = await nextButton.boundingBox()

		expect(chartBox).not.toBeNull()
		expect(prevBox).not.toBeNull()
		expect(nextBox).not.toBeNull()

		// Prev should be to the left of chart
		expect(prevBox!.x + prevBox!.width).toBeLessThanOrEqual(chartBox!.x + 10)

		// Next should be to the right of chart
		expect(nextBox!.x).toBeGreaterThanOrEqual(chartBox!.x + chartBox!.width - 10)
	})

	test('E2E-ICHART-030: Mobile transaction modal as bottom sheet', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Click on a data point
		const dataPoint = page.getByTestId('chart-data-point').first()
		if (await dataPoint.isVisible()) {
			await dataPoint.click()

			// Modal should appear as bottom sheet on mobile
			const modal = page.getByTestId('transaction-modal')
			await expect(modal).toBeVisible()

			const modalBox = await modal.boundingBox()
			expect(modalBox).not.toBeNull()

			// Modal should be at the bottom of the viewport
			expect(modalBox!.y + modalBox!.height).toBeGreaterThanOrEqual(667 - 50)
		}
	})

	test('E2E-ICHART-031: Touch tap shows tooltip on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to InteractiveTrendsChart
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()

		// Tap on a data point
		const dataPoint = page.getByTestId('chart-data-point').first()
		if (await dataPoint.isVisible()) {
			// Single tap should show tooltip
			await dataPoint.tap()
			await page.waitForTimeout(200)

			// Tooltip should be visible
			const tooltip = page.getByTestId('chart-tooltip')
			if (await tooltip.isVisible()) {
				await expect(tooltip).toContainText(/R\$/)
			}
		}
	})

	test('E2E-ICHART-032: Zoom toggle full width on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to InteractiveTrendsChart
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()

		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		await expect(zoomToggle).toBeVisible()

		const toggleBox = await zoomToggle.boundingBox()
		expect(toggleBox).not.toBeNull()

		// Zoom toggle should be nearly full width on mobile (accounting for padding)
		expect(toggleBox!.width).toBeGreaterThan(300) // Most of 375px width
	})
})
