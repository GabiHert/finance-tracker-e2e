import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Mini-Map
 * Tests mini-map navigation and viewport indicator
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Mini-Map', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Mini-Map: Seeding test data...')
			await seedM16TestData(page)
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

	test('E2E-ICHART-009: Drag mini-map to navigate', async ({ page }) => {
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')
		const miniMap = page.getByTestId('chart-minimap')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(miniMapThumb).toBeVisible()
		await expect(miniMap).toBeVisible()

		const mapBox = await miniMap.boundingBox()
		const thumbBox = await miniMapThumb.boundingBox()

		expect(mapBox).not.toBeNull()
		expect(thumbBox).not.toBeNull()

		// Drag thumb to the left (toward past)
		await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(mapBox!.x + 50, thumbBox!.y + thumbBox!.height / 2, { steps: 10 })
		await page.mouse.up()

		// Verify thumb moved
		const newThumbBox = await miniMapThumb.boundingBox()
		expect(newThumbBox).not.toBeNull()
		expect(newThumbBox!.x).toBeLessThan(thumbBox!.x)

		// Next button should be enabled after moving to past
		await expect(nextButton).toBeEnabled()
	})

	test('E2E-ICHART-010: Mini-map shows correct viewport proportion', async ({ page }) => {
		const miniMap = page.getByTestId('chart-minimap')
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')

		await expect(miniMap).toBeVisible()
		await expect(miniMapThumb).toBeVisible()

		const mapBox = await miniMap.boundingBox()
		const thumbBox = await miniMapThumb.boundingBox()

		expect(mapBox).not.toBeNull()
		expect(thumbBox).not.toBeNull()

		// Thumb width should be proportional to viewport/total ratio
		// With typical data (6 months viewport): depends on total data range
		const thumbWidthRatio = thumbBox!.width / mapBox!.width
		expect(thumbWidthRatio).toBeGreaterThanOrEqual(0.05)  // At least 5% (for large data ranges)
		expect(thumbWidthRatio).toBeLessThan(0.8)    // At most 80%
	})

	test('E2E-ICHART-024: Mini-map syncs with chart scroll', async ({ page }) => {
		const chart = page.getByTestId('trends-chart-viewport')
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')

		await expect(chart).toBeVisible()
		await expect(miniMapThumb).toBeVisible()

		// Get initial thumb position
		const initialThumbBox = await miniMapThumb.boundingBox()
		expect(initialThumbBox).not.toBeNull()

		// Drag the chart to scroll
		const chartBox = await chart.boundingBox()
		await page.mouse.move(chartBox!.x + chartBox!.width - 50, chartBox!.y + chartBox!.height / 2)
		await page.mouse.down()
		await page.mouse.move(chartBox!.x + 50, chartBox!.y + chartBox!.height / 2, { steps: 10 })
		await page.mouse.up()

		// Verify mini-map thumb moved in sync
		const newThumbBox = await miniMapThumb.boundingBox()
		expect(newThumbBox).not.toBeNull()
		expect(newThumbBox!.x).not.toBe(initialThumbBox!.x)
	})

	test('E2E-ICHART-025: Mini-map shows date labels', async ({ page }) => {
		const miniMap = page.getByTestId('chart-minimap')
		const startLabel = miniMap.getByTestId('minimap-start-date')
		const endLabel = miniMap.getByTestId('minimap-end-date')

		await expect(miniMap).toBeVisible()
		await expect(startLabel).toBeVisible()
		await expect(endLabel).toBeVisible()

		// Labels should contain date text
		const startText = await startLabel.textContent()
		const endText = await endLabel.textContent()

		// Should match date format (e.g., "Jan 2024" or "Dez 2025")
		expect(startText).toMatch(/\w{3}\s*20\d{2}/)
		expect(endText).toMatch(/\w{3}\s*20\d{2}/)
	})

	test('E2E-ICHART-026: Mini-map click jumps to position', async ({ page }) => {
		const miniMapTrack = page.getByTestId('chart-minimap-track')
		const miniMapThumb = page.getByTestId('chart-minimap-thumb')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(miniMapTrack).toBeVisible()
		await expect(miniMapThumb).toBeVisible()

		const trackBox = await miniMapTrack.boundingBox()
		const initialThumbBox = await miniMapThumb.boundingBox()

		expect(trackBox).not.toBeNull()
		expect(initialThumbBox).not.toBeNull()

		// Click on the left side of the track (past) - away from the thumb
		await page.mouse.click(trackBox!.x + 30, trackBox!.y + trackBox!.height / 2)

		// Thumb should jump to clicked position
		const newThumbBox = await miniMapThumb.boundingBox()
		expect(newThumbBox).not.toBeNull()
		expect(newThumbBox!.x).toBeLessThan(initialThumbBox!.x)

		// Next button should be enabled
		await expect(nextButton).toBeEnabled()
	})
})
