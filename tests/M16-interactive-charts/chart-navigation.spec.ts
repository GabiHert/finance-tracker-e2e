import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Chart Navigation
 * Tests drag/swipe navigation and prev/next button navigation
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Chart Navigation', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		// Check if data already exists
		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Chart Navigation: Seeding test data...')
			await seedM16TestData(page)
		} else {
			console.log('M16 Chart Navigation: Test data already exists')
		}

		await context.close()
	})

	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Scroll to the InteractiveTrendsChart (M16 chart with zoom controls and minimap)
		const interactiveChart = page.getByTestId('interactive-trends-chart')
		await interactiveChart.scrollIntoViewIfNeeded()
		await expect(interactiveChart).toBeVisible()
	})

	test('E2E-ICHART-001: Drag chart to scroll through time', async ({ page }) => {
		const chart = page.getByTestId('trends-chart-viewport')
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')

		// Verify chart viewport exists
		await expect(chart).toBeVisible()
		await expect(miniMapThumb).toBeVisible()

		// Get initial thumb position
		const initialThumbBox = await miniMapThumb.boundingBox()
		expect(initialThumbBox).not.toBeNull()

		// Perform drag gesture (drag from right to left to see past data)
		const chartBox = await chart.boundingBox()
		expect(chartBox).not.toBeNull()

		await page.mouse.move(chartBox!.x + chartBox!.width - 50, chartBox!.y + chartBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(chartBox!.x + 50, chartBox!.y + chartBox!.height / 2, { steps: 10 })
		await page.mouse.up()

		// Verify mini-map thumb moved to the left
		const newThumbBox = await miniMapThumb.boundingBox()
		expect(newThumbBox).not.toBeNull()
		expect(newThumbBox!.x).toBeLessThan(initialThumbBox!.x)
	})

	test('E2E-ICHART-002: Navigate using previous/next buttons', async ({ page }) => {
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		// Verify navigation buttons exist
		await expect(prevButton).toBeVisible()
		await expect(nextButton).toBeVisible()

		// Next should be disabled at current/newest data
		await expect(nextButton).toBeDisabled()

		// Click prev to go to past
		await prevButton.click()

		// Now next should be enabled (wait for state change)
		await expect(nextButton).toBeEnabled()

		// Click next to return to present
		await nextButton.click()

		// Next should be disabled again at newest data
		await expect(nextButton).toBeDisabled()
	})

	test('E2E-ICHART-003: Scroll to data boundary', async ({ page }) => {
		const prevButton = page.getByTestId('chart-nav-prev')
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(prevButton).toBeVisible()
		await expect(miniMapThumb).toBeVisible()

		// Click prev multiple times to reach boundary (more iterations for large data ranges)
		for (let i = 0; i < 100; i++) {
			if (await prevButton.isDisabled()) break
			await prevButton.click()
			// Brief wait for chart update
			await page.waitForTimeout(100)
		}

		// Verify at boundary - prev button should be disabled
		await expect(prevButton).toBeDisabled({ timeout: 5000 })

		// Verify next button is enabled (we can still go forward from boundary)
		await expect(nextButton).toBeEnabled()
	})

	test('E2E-ICHART-017: Double-click resets to current period', async ({ page }) => {
		const chart = page.getByTestId('trends-chart-viewport')
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(chart).toBeVisible()
		await expect(prevButton).toBeVisible()

		// First, scroll to past
		await prevButton.click()

		// Next should be enabled (we're not at present)
		await expect(nextButton).toBeEnabled()

		// Double-click to reset
		await chart.dblclick()

		// Should be back at present - next disabled
		await expect(nextButton).toBeDisabled()
	})

	test('E2E-ICHART-018: Keyboard navigation with arrow keys', async ({ page }) => {
		const chartRegion = page.locator('[role="region"][aria-label*="Gráfico"]')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(chartRegion).toBeVisible()

		// Focus on chart region
		await chartRegion.focus()

		// Navigate with arrow left (to past)
		await page.keyboard.press('ArrowLeft')

		// Next should be enabled after navigating to past
		await expect(nextButton).toBeEnabled()

		// Navigate with arrow right (to future)
		await page.keyboard.press('ArrowRight')

		// Should be back at present
		await expect(nextButton).toBeDisabled()
	})
})
