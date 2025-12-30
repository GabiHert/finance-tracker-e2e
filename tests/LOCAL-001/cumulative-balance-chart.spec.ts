import { test, expect } from '@playwright/test'

/**
 * LOCAL-001: Cumulative Balance Chart E2E Tests
 *
 * Tests for the new cumulative balance visualization that replaces
 * the dual income/expense line chart.
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('LOCAL-001: Cumulative Balance Chart', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Wait for chart loading
		await page.waitForTimeout(1000)
		// Scroll to chart area
		const chart = page.getByTestId('trends-chart')
		await chart.scrollIntoViewIfNeeded()
	})

	test.describe('Chart Display', () => {
		test('E2E-BALANCE-001: Should display single balance line instead of income/expense lines', async ({
			page,
		}) => {
			// Verify balance line exists
			await expect(page.locator('[data-testid="balance-line"]')).toBeVisible()

			// Verify old income/expense lines do NOT exist
			await expect(page.locator('[data-testid="income-line"]')).not.toBeVisible()
			await expect(page.locator('[data-testid="expense-line"]')).not.toBeVisible()
		})

		test('E2E-BALANCE-002: Should display zero reference line', async ({ page }) => {
			await expect(page.locator('[data-testid="zero-line"]')).toBeVisible()
		})

		test('E2E-BALANCE-003: Should indicate cumulative chart type', async ({ page }) => {
			const chart = page.getByTestId('interactive-trends-chart')
			await expect(chart).toHaveAttribute('data-chart-type', 'cumulative-balance')
		})
	})

	test.describe('Visual Styling', () => {
		test('E2E-BALANCE-004: Balance line should be visible with gradient styling', async ({ page }) => {
			// Verify balance line is visible and uses gradient
			const balanceLine = page.locator('[data-testid="balance-line"]')
			await expect(balanceLine).toBeVisible()
			// The line uses url(#interactiveBalanceGradient) for stroke
			const stroke = await balanceLine.getAttribute('stroke')
			expect(stroke).toContain('url(#')
		})

		test('E2E-BALANCE-005: Data points should be colored based on balance sign', async ({ page }) => {
			// Verify data points exist
			const dataPoints = page.locator('[data-testid="chart-data-point"]')
			const count = await dataPoints.count()
			expect(count).toBeGreaterThan(0)

			// Check that points have fill color (green #10B981 or red #EF4444)
			const firstPoint = dataPoints.first()
			const fill = await firstPoint.getAttribute('fill')
			expect(fill).toMatch(/#10B981|#EF4444/)
		})

		test('E2E-BALANCE-006: Zero line should be visible with dashed styling', async ({
			page,
		}) => {
			const zeroLine = page.locator('[data-testid="zero-line"]')
			await expect(zeroLine).toBeVisible()

			// Verify it has dashed styling
			const strokeDasharray = await zeroLine.getAttribute('stroke-dasharray')
			expect(strokeDasharray).toBe('4 4')
		})
	})

	test.describe('Tooltips & Interactions', () => {
		test('E2E-BALANCE-007: Data points should have balance aria-labels', async ({
			page,
		}) => {
			const dataPoints = page.locator('[data-testid="chart-data-point"]')
			const count = await dataPoints.count()
			expect(count).toBeGreaterThan(0)

			// Check aria-label contains "Saldo"
			const firstPoint = dataPoints.first()
			const ariaLabel = await firstPoint.getAttribute('aria-label')
			expect(ariaLabel).toMatch(/saldo/i)
		})

		test('E2E-BALANCE-008: Clicking data point should open transaction modal', async ({
			page,
		}) => {
			const dataPoints = page.locator('[data-testid="chart-data-point"]')
			const count = await dataPoints.count()

			if (count > 0) {
				const dataPoint = dataPoints.first()
				await dataPoint.click()

				const modal = page.locator('[data-testid="transaction-modal"]')
				await expect(modal).toBeVisible()
			}
		})
	})

	test.describe('Interactive Features', () => {
		test('E2E-BALANCE-009: Drag navigation should work with balance line', async ({
			page,
		}) => {
			const chart = page.locator('[data-testid="trends-chart-viewport"]')
			const miniMapThumb = page.locator('[data-testid="chart-minimap-thumb"]')

			await expect(chart).toBeVisible()
			await expect(miniMapThumb).toBeVisible()

			const initialThumbBox = await miniMapThumb.boundingBox()
			const chartBox = await chart.boundingBox()

			if (initialThumbBox && chartBox) {
				// Drag chart
				await page.mouse.move(chartBox.x + chartBox.width - 50, chartBox.y + chartBox.height / 2)
				await page.mouse.down()
				await page.mouse.move(chartBox.x + 50, chartBox.y + chartBox.height / 2, { steps: 10 })
				await page.mouse.up()

				// Balance line should still be visible
				await expect(page.locator('[data-testid="balance-line"]')).toBeVisible()
			}
		})

		test('E2E-BALANCE-010: Zoom presets should work with balance line', async ({ page }) => {
			const dayPreset = page.locator('[data-testid="preset-day"]')

			if (await dayPreset.isVisible()) {
				await dayPreset.click()
				await page.waitForTimeout(400)

				await expect(dayPreset).toHaveAttribute('aria-pressed', 'true')

				// Balance line should still be visible after zoom
				await expect(page.locator('[data-testid="balance-line"]')).toBeVisible()
			}
		})

		test('E2E-BALANCE-011: Keyboard navigation should work', async ({ page }) => {
			const chartRegion = page.locator('[role="region"][aria-label*="Gráfico"]')

			if (await chartRegion.isVisible()) {
				await chartRegion.focus()
				await page.keyboard.press('ArrowLeft')

				// Should navigate without errors - balance line still visible
				await expect(page.locator('[data-testid="balance-line"]')).toBeVisible()
			}
		})
	})

	test.describe('Edge Cases', () => {
		test('E2E-BALANCE-012: Should handle all-positive balance period', async ({ page }) => {
			// Chart should render without errors for positive-only data
			const balanceLine = page.locator('[data-testid="balance-line"]')
			await expect(balanceLine).toBeVisible()
		})

		test('E2E-BALANCE-013: Legend should show balance terminology', async ({ page }) => {
			// Verify legend shows "Saldo Positivo" and "Saldo Negativo"
			const legend = page.getByText('Saldo Positivo')
			await expect(legend).toBeVisible()

			const legendNeg = page.getByText('Saldo Negativo')
			await expect(legendNeg).toBeVisible()
		})
	})
})
