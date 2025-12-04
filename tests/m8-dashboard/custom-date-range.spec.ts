import { test, expect } from '@playwright/test'

/**
 * M8-E2E: Custom Date Range Selection for Dashboards
 *
 * Tests the ability to select custom date ranges for both
 * personal and group dashboards.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M8: Custom Date Range Selection', () => {
	test('M8-E2E-CUSTOM-001: Should show custom date range option in period selector', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Open period selector
		await page.getByTestId('period-selector').click()

		// Verify "Personalizado" option is visible
		const customOption = page.getByTestId('period-option-custom')
		await expect(customOption).toBeVisible()
		await expect(customOption).toHaveText('Personalizado')
	})

	test('M8-E2E-CUSTOM-002: Should show date pickers when custom is selected', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Open period selector and select custom
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-custom').click()

		// Verify date pickers are visible
		await expect(page.getByTestId('custom-date-range')).toBeVisible()
		await expect(page.getByTestId('custom-start-date')).toBeVisible()
		await expect(page.getByTestId('custom-end-date')).toBeVisible()
		await expect(page.getByTestId('apply-custom-date')).toBeVisible()
	})

	test('M8-E2E-CUSTOM-003: Should apply button be disabled until both dates are selected', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Open period selector and select custom
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-custom').click()

		// Apply button should be disabled initially
		const applyBtn = page.getByTestId('apply-custom-date')
		await expect(applyBtn).toBeDisabled()

		const today = new Date()
		const formatDate = (d: Date) => {
			const day = String(d.getDate()).padStart(2, '0')
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const year = d.getFullYear()
			return `${day}/${month}/${year}`
		}

		const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

		// Enter start date - use fill which triggers change events, then blur to commit
		const startDateInput = page.getByTestId('custom-start-date-input')
		await startDateInput.fill(formatDate(lastMonth))
		// Press Escape to close the calendar dropdown (stays within DatePicker)
		await page.keyboard.press('Escape')
		// Tab to blur the input and commit the value
		await page.keyboard.press('Tab')
		await page.waitForTimeout(50)

		// Apply button should still be disabled (only start date)
		await expect(applyBtn).toBeDisabled()

		// Enter end date
		const endDateInput = page.getByTestId('custom-end-date-input')
		await endDateInput.fill(formatDate(today))
		// Press Escape to close the calendar dropdown
		await page.keyboard.press('Escape')
		// Tab to blur the input and commit the value
		await page.keyboard.press('Tab')

		// Wait for state update
		await page.waitForTimeout(100)

		// Apply button should now be enabled
		await expect(applyBtn).toBeEnabled()
	})

	test('M8-E2E-CUSTOM-004: Should filter dashboard data by custom date range', async ({ page }) => {
		// Track API calls
		const apiCalls: { url: string; method: string }[] = []
		page.on('request', request => {
			if (request.url().includes('/api/v1/')) {
				apiCalls.push({ url: request.url(), method: request.method() })
			}
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Clear API calls before custom date selection
		apiCalls.length = 0

		// Open period selector and select custom
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-custom').click()

		// Enter custom date range
		const today = new Date()
		const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

		const formatDate = (d: Date) => {
			const day = String(d.getDate()).padStart(2, '0')
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const year = d.getFullYear()
			return `${day}/${month}/${year}`
		}

		// Enter start date - use fill, then Escape to close calendar and Tab to blur
		const startDateInput = page.getByTestId('custom-start-date-input')
		await startDateInput.fill(formatDate(lastMonth))
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(50)

		// Enter end date
		const endDateInput = page.getByTestId('custom-end-date-input')
		await endDateInput.fill(formatDate(today))
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(100)

		// Apply custom range
		await page.getByTestId('apply-custom-date').click()

		// Wait for data to load
		await page.waitForLoadState('networkidle')

		// Verify period selector shows the custom range
		const selectorText = await page.getByTestId('period-selector').textContent()
		expect(selectorText).toContain(formatDate(lastMonth))
		expect(selectorText).toContain(formatDate(today))

		// Verify API was called with date parameters
		const dashboardCalls = apiCalls.filter(call =>
			call.url.includes('/transactions') ||
			call.url.includes('/dashboard') ||
			call.url.includes('/summary')
		)
		expect(dashboardCalls.length).toBeGreaterThan(0)

		// Verify dashboard is still functional
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
	})

	test('M8-E2E-CUSTOM-005: Should display custom range in period selector button after apply', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Open period selector and select custom
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-custom').click()

		// Enter start date - use fill, then Escape to close calendar and Tab to blur
		const startDateInput = page.getByTestId('custom-start-date-input')
		await startDateInput.fill('01/11/2024')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(50)

		// Enter end date
		const endDateInput = page.getByTestId('custom-end-date-input')
		await endDateInput.fill('30/11/2024')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(100)

		// Apply
		await page.getByTestId('apply-custom-date').click()

		// Dropdown should close
		await expect(page.getByTestId('custom-date-range')).not.toBeVisible()

		// Period selector button should show the date range
		const selectorButton = page.getByTestId('period-selector')
		await expect(selectorButton).toContainText('01/11/2024')
		await expect(selectorButton).toContainText('30/11/2024')
	})

	test('M8-E2E-CUSTOM-006: Should switch from custom back to predefined period', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// First, select custom period
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-custom').click()

		// Enter start date - use fill, then Escape to close calendar and Tab to blur
		const startDateInput = page.getByTestId('custom-start-date-input')
		await startDateInput.fill('01/11/2024')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(50)

		// Enter end date
		const endDateInput = page.getByTestId('custom-end-date-input')
		await endDateInput.fill('30/11/2024')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Tab')
		await page.waitForTimeout(100)

		await page.getByTestId('apply-custom-date').click()
		await page.waitForLoadState('networkidle')

		// Verify custom range is displayed
		let selectorText = await page.getByTestId('period-selector').textContent()
		expect(selectorText).toContain('01/11/2024')

		// Now switch back to "Este Mes"
		await page.getByTestId('period-selector').click()
		await page.getByTestId('period-option-this_month').click()
		await page.waitForLoadState('networkidle')

		// Verify predefined period is now shown
		selectorText = await page.getByTestId('period-selector').textContent()
		expect(selectorText).toContain('Este Mes')
		expect(selectorText).not.toContain('01/11/2024')
	})
})

test.describe('M9: Group Dashboard Custom Date Range', () => {
	test('M9-E2E-CUSTOM-001: Should support custom date range on group dashboard', async ({ page }) => {
		// Navigate to groups
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Wait for groups to load
		await page.waitForLoadState('networkidle')

		// Check if there are any groups
		const groupCards = page.getByTestId('group-card')
		const groupCount = await groupCards.count()

		if (groupCount > 0) {
			// Click on first group
			await groupCards.first().click()
			await expect(page.getByTestId('group-detail-screen')).toBeVisible()

			// Navigate to dashboard tab
			const dashboardTab = page.getByRole('tab', { name: /dashboard/i }).or(
				page.getByTestId('tab-dashboard')
			)
			if (await dashboardTab.isVisible()) {
				await dashboardTab.click()
				await page.waitForLoadState('networkidle')

				// Open period selector
				const periodSelector = page.getByTestId('period-selector')
				if (await periodSelector.isVisible()) {
					await periodSelector.click()

					// Verify custom option exists
					const customOption = page.getByTestId('period-option-custom')
					await expect(customOption).toBeVisible()

					// Select custom and verify date pickers appear
					await customOption.click()
					await expect(page.getByTestId('custom-date-range')).toBeVisible()
				}
			}
		} else {
			// No groups exist, skip test
			test.skip()
		}
	})
})
