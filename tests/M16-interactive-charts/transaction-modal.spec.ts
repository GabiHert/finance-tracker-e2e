import { test, expect } from '@playwright/test'
import { seedM16TestData, hasM16TestData } from './m16-fixtures'

/**
 * M16-E2E: Interactive Charts - Transaction Modal
 * Tests transaction modal that opens when clicking chart data points
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M16: Transaction Modal', () => {
	// Seed data once at the start of the test file
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
		const page = await context.newPage()

		const hasData = await hasM16TestData(page)
		if (!hasData) {
			console.log('M16 Transaction Modal: Seeding test data...')
			await seedM16TestData(page)
		}

		await context.close()
	})

	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByTestId('dashboard-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(500)
	})

	test('E2E-ICHART-006: Open transaction modal by clicking data point', async ({ page }) => {
		// Click on a data point
		const dataPoint = page.getByTestId('chart-data-point').first()
		await expect(dataPoint).toBeVisible()
		await dataPoint.click()

		// Verify modal opens
		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Verify period title exists with date format
		const periodTitle = modal.getByTestId('modal-period-title')
		await expect(periodTitle).toBeVisible()
		await expect(periodTitle).toContainText(/\w+ 20\d{2}|S\d+ 20\d{2}|T\d 20\d{2}/)

		// Verify summary cards
		await expect(modal.getByTestId('summary-income')).toBeVisible()
		await expect(modal.getByTestId('summary-expenses')).toBeVisible()
		await expect(modal.getByTestId('summary-balance')).toBeVisible()

		// Verify transaction list exists
		const transactions = modal.getByTestId('modal-transaction-row')
		const emptyState = modal.getByTestId('modal-empty-state')

		// Either transactions or empty state should be present
		const hasTransactions = (await transactions.count()) > 0
		const hasEmptyState = await emptyState.isVisible().catch(() => false)
		expect(hasTransactions || hasEmptyState).toBeTruthy()
	})

	test('E2E-ICHART-007: Navigate to full transactions from modal', async ({ page }) => {
		// Open modal
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Click "Ver Todas" button
		const viewAllBtn = modal.getByTestId('view-all-btn')
		await expect(viewAllBtn).toBeVisible()
		await viewAllBtn.click()

		// Verify navigation to transactions page with filters
		await expect(page).toHaveURL(/\/transactions\?/)

		// Verify filter params in URL
		const url = page.url()
		expect(url).toMatch(/start_date=/)
		expect(url).toMatch(/end_date=/)
	})

	test('E2E-ICHART-008: Close transaction modal - X button', async ({ page }) => {
		// Open modal
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Close with X button
		const closeBtn = modal.getByTestId('modal-close-btn')
		await closeBtn.click()

		await expect(modal).not.toBeVisible()
	})

	test('E2E-ICHART-008b: Close transaction modal - Escape key', async ({ page }) => {
		// Open modal
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Close with Escape key
		await page.keyboard.press('Escape')

		await expect(modal).not.toBeVisible()
	})

	test('E2E-ICHART-008c: Close transaction modal - Click backdrop', async ({ page }) => {
		// Open modal
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Close by clicking backdrop
		const backdrop = page.getByTestId('modal-backdrop')
		await backdrop.click({ position: { x: 10, y: 10 } })

		await expect(modal).not.toBeVisible()
	})

	test('E2E-ICHART-021: Modal shows correct summary values', async ({ page }) => {
		// Click on a data point
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Get summary values
		const incomeEl = modal.getByTestId('summary-income')
		const expensesEl = modal.getByTestId('summary-expenses')
		const balanceEl = modal.getByTestId('summary-balance')

		await expect(incomeEl).toBeVisible()
		await expect(expensesEl).toBeVisible()
		await expect(balanceEl).toBeVisible()

		// Verify values are in currency format
		const incomeText = await incomeEl.textContent()
		const expensesText = await expensesEl.textContent()
		const balanceText = await balanceEl.textContent()

		expect(incomeText).toMatch(/R\$\s*[\d.,]+/)
		expect(expensesText).toMatch(/R\$\s*[\d.,]+/)
		expect(balanceText).toMatch(/R\$\s*-?[\d.,]+/)
	})

	test('E2E-ICHART-022: Modal shows loading state', async ({ page }) => {
		// Slow down API to see loading state
		await page.route('**/api/v1/dashboard/period-transactions*', async route => {
			await new Promise(resolve => setTimeout(resolve, 500))
			await route.continue()
		})

		// Click on a data point
		const dataPoint = page.getByTestId('chart-data-point').first()
		await dataPoint.click()

		const modal = page.getByTestId('transaction-modal')
		await expect(modal).toBeVisible()

		// Loading state should be visible
		const loadingState = modal.getByTestId('modal-loading')
		await expect(loadingState).toBeVisible()

		// Wait for loading to complete
		await expect(loadingState).not.toBeVisible({ timeout: 5000 })
	})

	test('E2E-ICHART-023: Click on donut segment opens filtered modal', async ({ page }) => {
		// Click on a donut chart segment
		const donutSegment = page.getByTestId('donut-segment').first()

		if (await donutSegment.isVisible()) {
			await donutSegment.click()

			const modal = page.getByTestId('transaction-modal')
			await expect(modal).toBeVisible()

			// Modal should show category filter indicator
			const categoryFilter = modal.getByTestId('modal-category-filter')
			await expect(categoryFilter).toBeVisible()

			// All transactions should be from the selected category
			const transactions = modal.getByTestId('modal-transaction-row')
			if (await transactions.count() > 0) {
				const categoryBadges = modal.locator('[data-testid="modal-transaction-row"] [data-testid="transaction-category"]')
				const firstCategory = await categoryBadges.first().textContent()

				// All should have the same category
				const allCategories = await categoryBadges.allTextContents()
				expect(allCategories.every(c => c === firstCategory)).toBeTruthy()
			}
		}
	})
})
