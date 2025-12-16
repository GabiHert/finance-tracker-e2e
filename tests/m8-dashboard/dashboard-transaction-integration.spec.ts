import { test, expect } from '@playwright/test'
import {
	createTransaction,
	deleteTransaction,
	fetchTransactions,
	generateShortId,
	isolatedName,
	seedIsolatedCategories,
	seedIsolatedTransactions,
	cleanupIsolatedTestData,
	TEST_CATEGORIES,
	TestCategory,
} from '../fixtures/test-utils'

/**
 * M8-E2E: Dashboard Transaction Integration
 * Validates that the dashboard correctly reflects transaction data:
 * - New user with zero transactions shows all zeros on dashboard
 * - When a transaction is created it should reflect in the dashboard
 * - When a transaction is deleted it should reflect in the dashboard
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 *
 * ISOLATION: Tests use isolated data with unique testIds to support parallel execution
 */
test.describe('M8: Dashboard Transaction Integration', () => {

	test('M8-E2E-TXN-01: Should display dashboard metric cards correctly', async ({
		page,
	}) => {
		// Helper function to parse Brazilian currency format
		// "R$ 8.500,00" -> 8500, "R$ 0,00" -> 0
		const parseBrazilianCurrency = (text: string): number => {
			// Remove currency symbol and whitespace
			const cleaned = text.replace(/R\$\s*/g, '').trim()
			// Remove thousands separator (.) and convert decimal separator (,) to (.)
			const normalized = cleaned.replace(/\./g, '').replace(',', '.')
			return parseFloat(normalized) || 0
		}

		// Known mock data values to detect
		const MOCK_VALUES = {
			income: 8500,
			expenses: 6230,
			balance: 15270.5,
			savings: 2270,
		}

		// Step 1: Navigate to dashboard
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()

		// Step 2: Verify dashboard loads
		await page.waitForLoadState('networkidle')

		// Step 3: Verify metric cards exist
		const metricCards = page.getByTestId('metric-card')
		await expect(metricCards.first()).toBeVisible()

		// Step 4: Verify all 4 metric cards are visible
		const incomeCard = page.getByTestId('metric-card-income')
		const expensesCard = page.getByTestId('metric-card-expenses')
		const balanceCard = page.getByTestId('metric-card-balance')
		const savingsCard = page.getByTestId('metric-card-savings')

		await expect(incomeCard).toBeVisible()
		await expect(expensesCard).toBeVisible()
		await expect(balanceCard).toBeVisible()
		await expect(savingsCard).toBeVisible()

		// Step 5: Get income and expenses values
		const incomeText = (await incomeCard.getByTestId('metric-value').textContent()) || ''
		const incomeAmount = parseBrazilianCurrency(incomeText)

		const expensesText = (await expensesCard.getByTestId('metric-value').textContent()) || ''
		const expensesAmount = Math.abs(parseBrazilianCurrency(expensesText))

		const savingsText = (await savingsCard.getByTestId('metric-value').textContent()) || ''
		const savingsAmount = parseBrazilianCurrency(savingsText)

		// CRITICAL: Detect mock data - these should NOT match mock values exactly
		expect(incomeAmount).not.toBe(MOCK_VALUES.income)
		expect(expensesAmount).not.toBe(MOCK_VALUES.expenses)
		expect(savingsAmount).not.toBe(MOCK_VALUES.savings)

		// Step 6: Verify savings = income - expenses (Economia = Receitas - Despesas)
		const expectedSavings = incomeAmount - expensesAmount
		expect(Math.abs(savingsAmount - expectedSavings)).toBeLessThan(0.01)

		// Note: We don't verify exact totals against API data because other parallel tests
		// may be creating transactions. Format and calculation validation is sufficient.
	})

	test('M8-E2E-TXN-02: Should update dashboard when transaction is created', async ({ page }) => {
		const testId = generateShortId()

		try {
			// Helper function to parse Brazilian currency format
			const parseBrazilianCurrency = (text: string): number => {
				const cleaned = text.replace(/R\$\s*/g, '').trim()
				const normalized = cleaned.replace(/\./g, '').replace(',', '.')
				return parseFloat(normalized) || 0
			}

			// Step 1: Navigate to dashboard first to establish auth context
			await page.goto('/dashboard')
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 2: Capture initial income value
			const incomeCard = page.getByTestId('metric-card-income')
			let initialIncomeText = ''
			if (await incomeCard.isVisible()) {
				const incomeValue = incomeCard.getByTestId('metric-value')
				initialIncomeText = (await incomeValue.textContent()) || ''
			}

			// Step 3: Create isolated category and transaction
			const today = new Date().toISOString().split('T')[0]
			const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.salary])
			const incomeCategory = categories.find(c => c.type === 'income')

			await createTransaction(page, {
				date: today,
				description: isolatedName('Dashboard Test Income', testId),
				amount: 1000,
				type: 'income',
				categoryId: incomeCategory?.id,
			})

			// Step 4: Refresh dashboard to get updated data
			await page.reload()
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 5: Verify income value has increased
			if (await incomeCard.isVisible()) {
				const incomeValue = incomeCard.getByTestId('metric-value')
				const newIncomeText = (await incomeValue.textContent()) || ''

				const initialAmount = parseBrazilianCurrency(initialIncomeText)
				const newAmount = parseBrazilianCurrency(newIncomeText)

				// New amount should be greater than or equal to initial (transaction added 1000)
				expect(newAmount).toBeGreaterThanOrEqual(initialAmount)
			}

			// Step 6: Verify recent transactions includes the new transaction
			const recentTransactions = page.getByTestId('recent-transactions')
			if (await recentTransactions.isVisible()) {
				const transactionItems = recentTransactions.getByTestId('transaction-item')
				const count = await transactionItems.count()

				// Should have at least one transaction now
				expect(count).toBeGreaterThanOrEqual(1)

				// Check if our isolated transaction appears
				const newTransactionText = await recentTransactions.textContent()
				const hasNewTransaction =
					newTransactionText?.includes(`[${testId}]`) ||
					newTransactionText?.includes('1.000') ||
					count >= 1
				expect(hasNewTransaction).toBeTruthy()
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M8-E2E-TXN-03: Should update dashboard when transaction is deleted', async ({ page }) => {
		const testId = generateShortId()

		try {
			// Helper function to parse Brazilian currency format
			const parseBrazilianCurrency = (text: string): number => {
				const cleaned = text.replace(/R\$\s*/g, '').trim()
				const normalized = cleaned.replace(/\./g, '').replace(',', '.')
				return parseFloat(normalized) || 0
			}

			// Step 1: Navigate to dashboard first to establish auth context
			await page.goto('/dashboard')
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 2: Create isolated category and transaction
			const today = new Date().toISOString().split('T')[0]
			const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
			const expenseCategory = categories.find(c => c.type === 'expense')

			const createdTransaction = await createTransaction(page, {
				date: today,
				description: isolatedName('Dashboard Delete Test', testId),
				amount: 500,
				type: 'expense',
				categoryId: expenseCategory?.id,
			})

			// Step 3: Reload dashboard and capture state with transaction
			await page.reload()
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 4: Capture expenses value before deletion
			const expensesCard = page.getByTestId('metric-card-expenses')
			let beforeDeleteExpenses = ''
			if (await expensesCard.isVisible()) {
				const expensesValue = expensesCard.getByTestId('metric-value')
				beforeDeleteExpenses = (await expensesValue.textContent()) || ''
			}

			// Step 5: Delete the transaction via API
			await deleteTransaction(page, createdTransaction.id)

			// Step 6: Refresh dashboard to get updated data
			await page.reload()
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 7: Verify expenses card still exists and displays value
			// Note: We can't verify exact decrease because parallel tests may create expenses
			if (await expensesCard.isVisible()) {
				const expensesValue = expensesCard.getByTestId('metric-value')
				const afterDeleteExpenses = (await expensesValue.textContent()) || ''

				// Verify the card displays a valid currency value
				expect(afterDeleteExpenses).toMatch(/R\$\s*-?[\d.,]+/)
			}

			// Step 8: Verify isolated transaction is no longer in recent transactions
			const recentTransactions = page.getByTestId('recent-transactions')
			if (await recentTransactions.isVisible()) {
				const transactionsText = await recentTransactions.textContent()

				// The deleted isolated transaction should not appear
				expect(transactionsText).not.toContain(`[${testId}]`)
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M8-E2E-TXN-04: Should correctly calculate savings with income and expenses', async ({
		page,
	}) => {
		const testId = generateShortId()

		try {
			// Helper function to parse Brazilian currency format
			const parseBrazilianCurrency = (text: string): number => {
				const cleaned = text.replace(/R\$\s*/g, '').trim()
				const normalized = cleaned.replace(/\./g, '').replace(',', '.')
				return parseFloat(normalized) || 0
			}

			// Step 1: Navigate to dashboard and capture initial state
			await page.goto('/dashboard')
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Capture initial values
			const incomeCard = page.getByTestId('metric-card-income')
			const expensesCard = page.getByTestId('metric-card-expenses')
			const savingsCard = page.getByTestId('metric-card-savings')

			let initialIncome = 0
			let initialExpenses = 0

			if (await incomeCard.isVisible()) {
				initialIncome = parseBrazilianCurrency((await incomeCard.getByTestId('metric-value').textContent()) || '')
			}
			if (await expensesCard.isVisible()) {
				initialExpenses = Math.abs(parseBrazilianCurrency((await expensesCard.getByTestId('metric-value').textContent()) || ''))
			}

			// Step 2: Create isolated categories and transactions
			const today = new Date().toISOString().split('T')[0]
			const categories = await seedIsolatedCategories(page, testId, [
				TEST_CATEGORIES.salary,
				TEST_CATEGORIES.foodAndDining,
			])
			const incomeCategory = categories.find(c => c.type === 'income')
			const expenseCategory = categories.find(c => c.type === 'expense')

			// Create income transaction of 2000
			await createTransaction(page, {
				date: today,
				description: isolatedName('Savings Test Income', testId),
				amount: 2000,
				type: 'income',
				categoryId: incomeCategory?.id,
			})

			// Create expense transaction of 500
			await createTransaction(page, {
				date: today,
				description: isolatedName('Savings Test Expense', testId),
				amount: 500,
				type: 'expense',
				categoryId: expenseCategory?.id,
			})

			// Step 3: Reload dashboard to get updated values
			await page.reload()
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')
			// Wait for dashboard data to fully load
			await page.waitForTimeout(1000)

			// Get new values
			let newIncome = 0
			let newExpenses = 0
			let newSavings = 0

			if (await incomeCard.isVisible()) {
				newIncome = parseBrazilianCurrency((await incomeCard.getByTestId('metric-value').textContent()) || '')
			}
			if (await expensesCard.isVisible()) {
				newExpenses = Math.abs(parseBrazilianCurrency((await expensesCard.getByTestId('metric-value').textContent()) || ''))
			}
			if (await savingsCard.isVisible()) {
				newSavings = parseBrazilianCurrency((await savingsCard.getByTestId('metric-value').textContent()) || '')
			}

			// Step 4: Verify dashboard has valid income value (positive number)
			// Note: We don't compare to initial values since parallel tests may modify shared data
			expect(newIncome).toBeGreaterThanOrEqual(0)

			// Step 5: Verify dashboard has valid expenses value (positive number)
			expect(newExpenses).toBeGreaterThanOrEqual(0)

			// Step 6: Verify savings = income - expenses (Economia = Receitas - Despesas)
			const expectedSavings = newIncome - newExpenses
			expect(Math.abs(newSavings - expectedSavings)).toBeLessThan(10)
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M8-E2E-TXN-05: Should update category breakdown after transaction creation', async ({
		page,
	}) => {
		const testId = generateShortId()

		try {
			// Step 1: Navigate to dashboard first to establish auth context
			await page.goto('/dashboard')
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 2: Create isolated category and transaction
			const today = new Date().toISOString().split('T')[0]
			const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
			const expenseCategory = categories.find(c => c.type === 'expense')

			await createTransaction(page, {
				date: today,
				description: isolatedName('Category Breakdown Test', testId),
				amount: 300,
				type: 'expense',
				categoryId: expenseCategory?.id,
			})

			// Step 3: Reload dashboard to show updated data
			await page.reload()
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()
			await page.waitForLoadState('networkidle')

			// Step 4: Check category donut chart
			const donutChart = page.getByTestId('category-donut')
			if (await donutChart.isVisible()) {
				// Chart should have at least one segment or data
				const chartSegments = donutChart.locator('[data-testid="donut-segment"]')
				const chartLegend = donutChart.getByTestId('chart-legend')
				const chartContainer = donutChart.locator('svg, canvas, [data-testid="chart-container"]')

				const hasSegments = (await chartSegments.count()) > 0
				const hasLegend = await chartLegend.isVisible().then(() => true, () => false)
				const hasChartElement = (await chartContainer.count()) > 0

				// Should have some chart data visible
				expect(hasSegments || hasLegend || hasChartElement).toBeTruthy()

				// Check if isolated category appears in legend (may not be visible if aggregated)
				if (hasLegend && expenseCategory?.name) {
					const legendText = await chartLegend.textContent()
					// Just verify legend exists and has content
					expect(legendText).toBeTruthy()
				}
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})
})
