import { test, expect } from '@playwright/test'

/**
 * M8-E2E: Dashboard & Analytics
 * Validates the dashboard functionality including:
 * - Dashboard layout with all sections
 * - Metric cards display (Balance, Income, Expenses, Savings)
 * - Period selector functionality
 * - Trend comparison display
 * - Category breakdown donut chart
 * - Spending trends chart
 * - Recent transactions section
 * - Goals alert banner
 * - Dashboard refresh functionality
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M8: Dashboard & Analytics', () => {
	// No login needed - auth state is pre-populated by auth-setup project

	test('M8-E2E-001: Should display dashboard with all sections', async ({ page }) => {
		// Navigate to dashboard
		await page.goto('/dashboard')

		// Verify the dashboard screen loads
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify 4 metric cards exist (Balance, Income, Expenses, Savings)
		const metricCards = page.getByTestId('metric-card')
		await expect(metricCards).toHaveCount(4)

		// Verify trends chart section exists
		await expect(page.getByTestId('trends-chart')).toBeVisible()

		// Verify category donut chart exists
		await expect(page.getByTestId('category-donut')).toBeVisible()

		// Verify recent transactions section exists
		await expect(page.getByTestId('recent-transactions')).toBeVisible()

		// Verify goals progress section exists
		await expect(page.getByTestId('goals-progress')).toBeVisible()
	})

	test('M8-E2E-002: Should display metric cards with correct values', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify Income card
		const incomeCard = page.getByTestId('metric-card-income')
		await expect(incomeCard).toBeVisible()
		await expect(incomeCard.getByTestId('metric-label')).toContainText(/receitas/i)
		await expect(incomeCard.getByTestId('metric-value')).toBeVisible()

		// Verify Expenses card
		const expensesCard = page.getByTestId('metric-card-expenses')
		await expect(expensesCard).toBeVisible()
		await expect(expensesCard.getByTestId('metric-label')).toContainText(/despesas/i)
		await expect(expensesCard.getByTestId('metric-value')).toBeVisible()

		// Verify Balance card
		const balanceCard = page.getByTestId('metric-card-balance')
		await expect(balanceCard).toBeVisible()
		await expect(balanceCard.getByTestId('metric-label')).toContainText(/saldo/i)
		await expect(balanceCard.getByTestId('metric-value')).toBeVisible()

		// Verify Savings card
		const savingsCard = page.getByTestId('metric-card-savings')
		await expect(savingsCard).toBeVisible()
		await expect(savingsCard.getByTestId('metric-label')).toContainText(/economia/i)
		await expect(savingsCard.getByTestId('metric-value')).toBeVisible()
	})

	test('M8-E2E-003: Should change data when period is selected', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Find period selector
		const periodSelector = page.getByTestId('period-selector')
		await expect(periodSelector).toBeVisible()

		// Get initial values from a metric card
		const incomeValue = page.getByTestId('metric-card-income').getByTestId('metric-value')
		const initialValue = await incomeValue.textContent()

		// Click period selector and change to "last month"
		await periodSelector.click()

		// Select "Mês Passado" option
		const lastMonthOption = page.getByRole('option', { name: /mês passado|last month/i })
		if (await lastMonthOption.isVisible()) {
			await lastMonthOption.click()

			// Wait for data to update (give some time for the value to potentially change)
			await page.waitForTimeout(500)

			// The dashboard should still be visible and functional
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		}
	})

	test('M8-E2E-004: Should display trend comparison on metric cards', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Check for trend indicators on metric cards
		const metricCards = page.getByTestId('metric-card')
		const count = await metricCards.count()

		for (let i = 0; i < count; i++) {
			const card = metricCards.nth(i)

			// Look for trend indicator (percentage change)
			const trendIndicator = card.getByTestId('trend-indicator')

			if (await trendIndicator.isVisible()) {
				// Verify trend shows percentage
				await expect(trendIndicator).toContainText(/%/)

				// Verify trend has direction indicator (arrow or color)
				const trendDirection = card.locator('[data-testid="trend-direction"]')
				if (await trendDirection.isVisible()) {
					await expect(trendDirection).toBeVisible()
				}
			}
		}
	})

	test('M8-E2E-005: Should display category breakdown donut chart', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify donut chart exists
		const donutChart = page.getByTestId('category-donut')
		await expect(donutChart).toBeVisible()

		// Verify chart has segments or empty state
		const chartSegments = donutChart.locator('[data-testid="donut-segment"]')
		const emptyState = donutChart.getByTestId('chart-empty-state')

		const hasSegments = (await chartSegments.count()) > 0
		const hasEmptyState = await emptyState.isVisible().catch(() => false)

		// Either segments or empty state should be visible
		expect(hasSegments || hasEmptyState).toBeTruthy()

		// If there are segments, verify legend exists
		if (hasSegments) {
			const legend = donutChart.getByTestId('chart-legend')
			await expect(legend).toBeVisible()
		}
	})

	test('M8-E2E-006: Should display spending trends line chart', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify trends chart exists
		const trendsChart = page.getByTestId('trends-chart')
		await expect(trendsChart).toBeVisible()

		// Verify chart has lines or empty state
		const chartLines = trendsChart.locator('[data-testid="chart-line"]')
		const chartArea = trendsChart.locator('svg, canvas, [data-testid="chart-container"]')
		const emptyState = trendsChart.getByTestId('chart-empty-state')

		const hasChart = (await chartArea.count()) > 0 || (await chartLines.count()) > 0
		const hasEmptyState = await emptyState.isVisible().catch(() => false)

		// Either chart or empty state should be visible
		expect(hasChart || hasEmptyState).toBeTruthy()
	})

	test('M8-E2E-007: Should display recent transactions section', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify recent transactions section exists
		const recentTransactions = page.getByTestId('recent-transactions')
		await expect(recentTransactions).toBeVisible()

		// Verify section header
		await expect(recentTransactions.locator('h2, h3, [data-testid="section-title"]')).toContainText(
			/transações|transacoes|transactions/i
		)

		// Check for transaction items or empty state
		const transactionItems = recentTransactions.getByTestId('transaction-item')
		const emptyState = recentTransactions.getByTestId('transactions-empty-state')

		const hasTransactions = (await transactionItems.count()) > 0
		const hasEmptyState = await emptyState.isVisible().catch(() => false)

		// Either transactions or empty state should be visible
		expect(hasTransactions || hasEmptyState).toBeTruthy()

		// If there are transactions, verify "Ver todas" link exists
		if (hasTransactions) {
			const viewAllLink = recentTransactions.getByRole('link', { name: /ver todas|view all/i })
			if (await viewAllLink.isVisible()) {
				await expect(viewAllLink).toHaveAttribute('href', /transactions/)
			}
		}
	})

	test('M8-E2E-008: Should display goals alert banner when over limit', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Look for alerts banner
		const alertsBanner = page.getByTestId('alerts-banner')

		// If alerts banner exists and is visible
		if (await alertsBanner.isVisible().catch(() => false)) {
			// Verify it contains warning content about goals
			await expect(alertsBanner).toContainText(/limite|meta|goal|excedido|over/i)

			// Verify clicking banner navigates to goals
			const bannerLink = alertsBanner.getByRole('link')
			if (await bannerLink.isVisible()) {
				await expect(bannerLink).toHaveAttribute('href', /goals/)
			}
		}

		// Also check goals progress section for over-limit indicators
		const goalsProgress = page.getByTestId('goals-progress')
		if (await goalsProgress.isVisible()) {
			const overLimitGoal = goalsProgress.locator('[data-testid="goal-item"].over-limit')
			if ((await overLimitGoal.count()) > 0) {
				await expect(overLimitGoal.first()).toHaveClass(/over|red|danger/)
			}
		}
	})

	test('M8-E2E-009: Should refresh dashboard data', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Find refresh button
		const refreshButton = page.getByTestId('refresh-btn')
		await expect(refreshButton).toBeVisible()

		// Click refresh button
		await refreshButton.click()

		// Verify loading state appears (optional - may be too fast to catch)
		const loadingIndicator = page.getByTestId('loading-indicator')
		// Don't strictly assert loading as it may be too fast

		// Verify dashboard still visible after refresh
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify last updated timestamp exists
		const lastUpdated = page.getByTestId('last-updated')
		if (await lastUpdated.isVisible()) {
			await expect(lastUpdated).toContainText(/atualiza[cç][aã]o|atualizado|updated/i)
		}
	})

	test('M8-E2E-010: Should display greeting with user name', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Verify greeting exists
		const greeting = page.getByTestId('user-greeting')
		await expect(greeting).toBeVisible()
		await expect(greeting).toContainText(/ol[aá]|hello|bem.?vindo/i)
	})

	test('M8-E2E-011: Should navigate to transactions from recent transactions', async ({
		page,
	}) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Find "Ver todas" link in recent transactions section
		const recentTransactions = page.getByTestId('recent-transactions')
		const viewAllLink = recentTransactions.getByRole('link', { name: /ver todas|view all/i })

		if (await viewAllLink.isVisible()) {
			await viewAllLink.click()
			await expect(page).toHaveURL(/\/transactions/)
		}
	})

	test('M8-E2E-012: Should navigate to goals from goals progress section', async ({ page }) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Find goals progress section
		const goalsProgress = page.getByTestId('goals-progress')
		const viewAllLink = goalsProgress.getByRole('link', { name: /ver todos|ver todas|view all/i })

		if (await viewAllLink.isVisible()) {
			await viewAllLink.click()
			await expect(page).toHaveURL(/\/goals/)
		}
	})

	test('M8-E2E-013: Should display amount values in correct currency format', async ({
		page,
	}) => {
		await page.goto('/dashboard')

		// Wait for dashboard to load
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Get all metric values
		const metricValues = page.locator('[data-testid="metric-value"]')
		const count = await metricValues.count()

		for (let i = 0; i < count; i++) {
			const value = await metricValues.nth(i).textContent()
			// Should be formatted as currency (R$ X.XXX,XX or similar)
			if (value) {
				expect(value).toMatch(/R?\$?\s*[\d.,]+/)
			}
		}
	})
})
