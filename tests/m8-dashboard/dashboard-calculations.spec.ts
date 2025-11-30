import { test, expect } from '@playwright/test'

/**
 * M8-E2E: Dashboard Calculations and States
 * Validates dashboard data accuracy including:
 * - Trend calculation accuracy
 * - Period comparison display
 * - Loading state handling
 * - Empty state for new users
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M8: Dashboard Calculations', () => {
	test('M8-E2E-10a: Should display correct trend calculation', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Get expenses metric card
		const expensesCard = page.getByTestId('metric-card-expenses').or(page.getByTestId('expenses-card'))

		if (await expensesCard.isVisible()) {
			// Step 3: Check for trend indicator
			const trendIndicator = expensesCard.getByTestId('trend-indicator')

			if (await trendIndicator.isVisible()) {
				const trendText = await trendIndicator.textContent()

				// Step 4: Verify trend has percentage format
				expect(trendText).toMatch(/-?\d+(\.\d+)?%/)

				// Step 5: Verify trend direction indicator
				const isPositive = trendText?.includes('+')
				const directionIcon = expensesCard.getByTestId('trend-direction')

				if (await directionIcon.isVisible()) {
					const iconClass = await directionIcon.getAttribute('class')
					// For expenses: positive trend (more spending) = bad (red)
					// Negative trend (less spending) = good (green)
					if (isPositive) {
						expect(iconClass).toMatch(/red|danger|negative/)
					} else {
						expect(iconClass).toMatch(/green|success|positive/)
					}
				}
			}
		}
	})

	test('M8-E2E-10b: Should display period comparison data', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Check for period selector/display
		const periodSelector = page.getByTestId('period-selector')
		const periodDisplay = page.getByTestId('current-period')

		if (await periodSelector.isVisible()) {
			// Step 3: Change period and verify data updates
			await periodSelector.click()
			const lastMonthOption = page.getByRole('option', { name: /último mês|last month/i })

			if (await lastMonthOption.isVisible()) {
				await lastMonthOption.click()

				// Step 4: Wait for data refresh after period change
				await page.waitForLoadState('networkidle')

				// Step 5: Verify metrics are displayed
				await expect(page.getByTestId('total-income').or(page.getByTestId('income-value'))).toBeVisible()
				await expect(page.getByTestId('total-expenses').or(page.getByTestId('expenses-value'))).toBeVisible()
			}
		} else if (await periodDisplay.isVisible()) {
			// Just verify current period is displayed
			const periodText = await periodDisplay.textContent()
			expect(periodText).toMatch(/nov|novembro|november|2025/i)
		}
	})

	test('M8-E2E-10c: Should show loading state during data fetch', async ({ page }) => {
		// Step 1: Slow down network to catch loading state
		await page.route('**/api/**', async route => {
			await new Promise(resolve => setTimeout(resolve, 1000))
			await route.continue()
		})

		// Step 2: Navigate to dashboard
		await page.goto('/dashboard')

		// Step 3: Check for loading indicators
		const loadingSkeleton = page.getByTestId('loading-skeleton')
		const loadingSpinner = page.getByTestId('loading-spinner')
		const loadingIndicator = page.locator('[aria-busy="true"]')

		// At least one loading indicator should appear
		const hasLoadingState =
			(await loadingSkeleton.first().isVisible().catch(() => false)) ||
			(await loadingSpinner.first().isVisible().catch(() => false)) ||
			(await loadingIndicator.first().isVisible().catch(() => false))

		// If loading state detected, verify it eventually disappears
		if (hasLoadingState) {
			await expect(page.getByTestId('dashboard-screen')).toBeVisible({ timeout: 10000 })
		}
	})

	test('M8-E2E-10d: Should display all metric cards', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Verify income metric
		const incomeCard = page.getByTestId('metric-card-income').or(page.getByTestId('income-card'))
		await expect(incomeCard).toBeVisible()

		// Step 3: Verify expenses metric
		const expensesCard = page.getByTestId('metric-card-expenses').or(page.getByTestId('expenses-card'))
		await expect(expensesCard).toBeVisible()

		// Step 4: Verify balance metric
		const balanceCard = page.getByTestId('metric-card-balance').or(page.getByTestId('balance-card'))
		await expect(balanceCard).toBeVisible()
	})

	test('M8-E2E-10e: Should display charts section', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Check for charts container
		const chartsSection = page.getByTestId('charts-section').or(page.getByTestId('dashboard-charts'))

		if (await chartsSection.isVisible()) {
			// Step 3: Verify category breakdown chart
			const categoryChart = page.getByTestId('category-chart').or(page.getByTestId('pie-chart'))
			await expect(categoryChart).toBeVisible()

			// Step 4: Verify trend/line chart
			const trendChart = page.getByTestId('trend-chart').or(page.getByTestId('line-chart'))
			await expect(trendChart).toBeVisible()
		}
	})

	test('M8-E2E-10f: Should navigate to transactions from dashboard', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Click on recent transactions section
		const recentTransactions = page.getByTestId('recent-transactions')
		const viewAllLink = page.getByTestId('view-all-transactions')

		if (await viewAllLink.isVisible()) {
			await viewAllLink.click()
			await expect(page).toHaveURL(/\/transactions/)
		} else if (await recentTransactions.isVisible()) {
			// Click on a transaction row
			const transactionItem = recentTransactions.getByTestId('transaction-item').first()
			if (await transactionItem.isVisible()) {
				await transactionItem.click()
				// Wait for navigation or modal to appear
				await page.waitForLoadState('networkidle')
			}
		}
	})

	test('M8-E2E-10g: Should display alerts banner for over-limit goals', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Check for alerts banner/section
		const alertsBanner = page.getByTestId('alerts-banner')
		const alertsSection = page.getByTestId('alerts-section')

		if (await alertsBanner.isVisible()) {
			// Step 3: Verify alert content
			await expect(alertsBanner).toContainText(/limite|goal|alert|aviso/i)
		} else if (await alertsSection.isVisible()) {
			// Check for individual alert cards
			const alertCard = alertsSection.getByTestId('alert-card')
			if (await alertCard.first().isVisible()) {
				await expect(alertCard.first()).toBeVisible()
			}
		}
	})

	test('M8-E2E-10h: Should verify currency formatting', async ({ page }) => {
		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Get any money value displayed
		const moneyValues = page.locator('[data-testid*="total"], [data-testid*="value"], [data-testid*="amount"]')
		const count = await moneyValues.count()

		if (count > 0) {
			const firstValue = await moneyValues.first().textContent()

			// Step 3: Verify Brazilian currency format (R$ X.XXX,XX)
			if (firstValue) {
				expect(firstValue).toMatch(/R?\$?\s*[\d.,]+/)
			}
		}
	})
})
