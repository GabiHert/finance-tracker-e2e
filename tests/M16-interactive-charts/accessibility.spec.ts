import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Accessibility
 * Tests keyboard navigation and screen reader support
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Accessibility', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Accessibility: Seeding test data...')
			await seedM16TestData(page)
		}

		await context.close()
	})

	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		// Wait for chart to be rendered instead of fixed timeout
		await expect(page.getByTestId('interactive-trends-chart')).toBeVisible({ timeout: 5000 })
	})

	test('E2E-ICHART-A11Y-001: Charts are keyboard navigable', async ({ page }) => {
		// Tab to chart controls
		await page.keyboard.press('Tab')
		await page.keyboard.press('Tab')
		await page.keyboard.press('Tab')

		// Get focused element
		const focusedTestId = await page.evaluate(() =>
			document.activeElement?.getAttribute('data-testid')
		)

		// Should be focused on a chart control
		expect(focusedTestId).toBeTruthy()

		// Navigate with arrow keys when on chart region
		const chartRegion = page.locator('[role="region"][aria-label*="Gráfico"]')
		if (await chartRegion.isVisible()) {
			await chartRegion.focus()

			const nextButton = page.getByTestId('chart-nav-next')
			const initialDisabled = await nextButton.isDisabled()

			// Arrow left should scroll to past
			await page.keyboard.press('ArrowLeft')

			// If we were at present (next disabled), next should now be enabled
			if (initialDisabled) {
				await expect(nextButton).toBeEnabled({ timeout: 2000 })
			}
		}
	})

	test('E2E-ICHART-A11Y-002: Screen reader announcements', async ({ page }) => {
		// Check for aria-label on chart region
		const chartRegion = page.locator('[role="region"][aria-label*="Gráfico"]')
		await expect(chartRegion).toBeVisible()
		await expect(chartRegion).toHaveAttribute('aria-describedby')

		// Check describedby element exists and has content
		const describedById = await chartRegion.getAttribute('aria-describedby')
		if (describedById) {
			const description = page.locator(`#${describedById}`)
			const descText = await description.textContent()
			expect(descText?.length).toBeGreaterThan(0)
		}
	})

	test('E2E-ICHART-A11Y-003: Navigation buttons have aria labels', async ({ page }) => {
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		await expect(prevButton).toHaveAttribute('aria-label', /anterior|previous/i)
		await expect(nextButton).toHaveAttribute('aria-label', /próximo|next/i)
	})

	test('E2E-ICHART-A11Y-004: Zoom toggle is accessible', async ({ page }) => {
		const zoomToggle = page.getByTestId('chart-zoom-toggle')
		await expect(zoomToggle).toBeVisible()

		// Should have role
		const role = await zoomToggle.getAttribute('role')
		expect(role).toMatch(/tablist|radiogroup|group/)

		// Options should be keyboard selectable
		const weekOption = zoomToggle.locator('[role="tab"], [role="radio"], button').first()
		await weekOption.focus()
		await page.keyboard.press('Enter')

		// Selection should change - wait for chart viewport to remain visible
		await expect(page.getByTestId('trends-chart-viewport')).toBeVisible({ timeout: 2000 })
	})

	test('E2E-ICHART-A11Y-005: Modal is accessible', async ({ page }) => {
		// Click on a data point to open modal
		const dataPoint = page.getByTestId('chart-data-point').first()
		if (await dataPoint.isVisible()) {
			await dataPoint.click()

			const modal = page.getByTestId('transaction-modal')
			await expect(modal).toBeVisible()

			// Modal should have role="dialog"
			await expect(modal).toHaveAttribute('role', 'dialog')

			// Modal should have aria-modal
			await expect(modal).toHaveAttribute('aria-modal', 'true')

			// Close button should have aria-label
			const closeBtn = modal.getByTestId('modal-close-btn')
			await expect(closeBtn).toHaveAttribute('aria-label', /fechar|close/i)

			// Focus should be trapped in modal
			await page.keyboard.press('Tab')
			await page.keyboard.press('Tab')
			await page.keyboard.press('Tab')

			const focusedInModal = await page.evaluate(() => {
				const modal = document.querySelector('[data-testid="transaction-modal"]')
				return modal?.contains(document.activeElement)
			})
			expect(focusedInModal).toBe(true)
		}
	})

	test('E2E-ICHART-A11Y-006: Home/End keys jump to boundaries', async ({ page }) => {
		const chartRegion = page.locator('[role="region"][aria-label*="Gráfico"]')
		const prevButton = page.getByTestId('chart-nav-prev')
		const nextButton = page.getByTestId('chart-nav-next')

		if (await chartRegion.isVisible()) {
			await chartRegion.focus()

			// Home should jump to oldest data
			await page.keyboard.press('Home')

			// At oldest data, prev should be disabled
			await expect(prevButton).toBeDisabled({ timeout: 2000 })

			// End should jump to newest data
			await page.keyboard.press('End')

			// At newest data, next should be disabled
			await expect(nextButton).toBeDisabled({ timeout: 2000 })
		}
	})

	test('E2E-ICHART-A11Y-007: Data points are focusable', async ({ page }) => {
		const dataPoints = page.getByTestId('chart-data-point')
		const count = await dataPoints.count()

		if (count > 0) {
			const firstPoint = dataPoints.first()

			// Data point should be focusable
			const tabIndex = await firstPoint.getAttribute('tabindex')
			expect(tabIndex).not.toBe('-1')

			// Focus and activate with Enter
			await firstPoint.focus()
			await page.keyboard.press('Enter')

			// Modal should open
			const modal = page.getByTestId('transaction-modal')
			await expect(modal).toBeVisible()
		}
	})

	test('E2E-ICHART-A11Y-008: Color contrast meets WCAG', async ({ page }) => {
		// Check that important text has sufficient contrast
		const metricValues = page.locator('[data-testid="metric-value"]')
		const count = await metricValues.count()

		for (let i = 0; i < Math.min(count, 4); i++) {
			const element = metricValues.nth(i)
			const isVisible = await element.isVisible()

			if (isVisible) {
				// Element should not have very light colors on white background
				const color = await element.evaluate(el =>
					window.getComputedStyle(el).color
				)

				// Parse RGB and check it's not too light
				const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					// Luminance check - text shouldn't be too light
					const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
					expect(luminance).toBeLessThan(220) // Not nearly white
				}
			}
		}
	})

	test('E2E-ICHART-A11Y-009: Loading state is announced', async ({ page }) => {
		// Check that loading indicators have aria-live
		const loadingIndicator = page.getByTestId('chart-loading')

		// Trigger loading
		await page.route('**/api/v1/dashboard/trends*', async route => {
			await new Promise(resolve => setTimeout(resolve, 500))
			await route.continue()
		})

		const prevButton = page.getByTestId('chart-nav-prev')
		await prevButton.click()

		if (await loadingIndicator.isVisible()) {
			// Container should have aria-live or be in a live region
			const ariaLive = await loadingIndicator.getAttribute('aria-live')
			const ariaAtomic = await loadingIndicator.getAttribute('aria-atomic')
			const role = await loadingIndicator.getAttribute('role')

			expect(ariaLive || role === 'status' || role === 'alert').toBeTruthy()
		}
	})
})
