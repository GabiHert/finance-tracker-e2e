import { test, expect } from '@playwright/test'
import {
	generateShortId,
	fetchTransactions,
	deleteTransaction,
} from '../fixtures/test-utils'

/**
 * Amount Sign Consistency E2E Tests
 *
 * These tests verify that bank transaction imports correctly map:
 * - Negative CSV amounts (debits/money out) → type='expense'
 * - Positive CSV amounts (credits/money in) → type='income'
 *
 * Note: The API stores amounts as absolute values with type determining direction.
 * The sign from CSV is used to determine transaction type, not stored directly.
 *
 * The actual system design:
 * - amount: Always positive (Math.abs applied)
 * - type: 'expense' for money out (negative in CSV), 'income' for money in (positive in CSV)
 */
test.describe('Amount Sign Consistency: Bank Import', () => {
	test('ASC-E2E-001: Bank transactions imported with correct type based on CSV sign', async ({
		page,
	}) => {
		/**
		 * Test that CSV sign correctly maps to transaction type:
		 * - Negative amount in CSV (-75.00) = expense (money OUT)
		 * - Positive amount in CSV (+50.00) = income (money IN/refund)
		 *
		 * Bank statement convention:
		 * - Negative amounts = debits = money leaving your account
		 * - Positive amounts = credits = money entering your account (including refunds)
		 */
		const testId = generateShortId()
		const testDatePrefix = '2017-06'

		// Navigate to transactions page
		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')
		await expect(page.getByTestId('import-transactions-btn')).toBeVisible({
			timeout: 10000,
		})

		try {
			// Open import wizard
			await page.getByTestId('import-transactions-btn').click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Prepare CSV content with mixed debits and credits
			const csvContent = `Data,Descrição,Valor
2017-06-15,[${testId}] Store Purchase,-75.00
2017-06-16,[${testId}] Refund from Store,50.00
2017-06-17,[${testId}] Another Expense,-25.00`

			// Upload CSV file
			const fileInput = page.locator('input[type="file"]')
			await fileInput.setInputFiles({
				name: `test-${testId}.csv`,
				mimeType: 'text/csv',
				buffer: Buffer.from(csvContent),
			})

			// Wait for preview to load
			await expect(page.getByTestId('import-preview-table')).toBeVisible({
				timeout: 10000,
			})

			// Verify we have 3 rows in preview
			const previewRows = page.getByTestId('import-preview-row')
			await expect(previewRows).toHaveCount(3)

			// Proceed to step 2 (categorization)
			const nextBtn = page.getByTestId('import-next-btn')
			if (await nextBtn.isVisible()) {
				await nextBtn.click()
			}

			// Complete import
			const confirmBtn = page.getByTestId('import-confirm-btn')
			await expect(confirmBtn).toBeVisible({ timeout: 5000 })
			await confirmBtn.click()

			// Wait for success
			await expect(page.getByTestId('import-success')).toBeVisible({
				timeout: 30000,
			})

			// Click done to close modal
			const doneBtn = page.getByTestId('import-done-btn')
			if (await doneBtn.isVisible()) {
				await doneBtn.click()
			}

			// Fetch transactions via API to verify stored values
			const transactions = await fetchTransactions(page)
			const testTransactions = transactions.filter(
				(t: { description?: string }) => t.description?.includes(`[${testId}]`)
			)

			expect(testTransactions.length).toBe(3)

			// Find each transaction
			const purchase = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Store Purchase')
			)
			const refund = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Refund from Store')
			)
			const expense2 = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Another Expense')
			)

			expect(purchase).toBeDefined()
			expect(refund).toBeDefined()
			expect(expense2).toBeDefined()

			// KEY ASSERTIONS:
			// 1. Negative CSV amounts should become 'expense' type
			expect(purchase.type).toBe('expense')
			expect(expense2.type).toBe('expense')

			// 2. Positive CSV amounts (refunds/credits) should become 'income' type
			expect(refund.type).toBe('income')

			// 3. All amounts should be positive (absolute value stored)
			expect(parseFloat(purchase.amount)).toBe(75)
			expect(parseFloat(refund.amount)).toBe(50)
			expect(parseFloat(expense2.amount)).toBe(25)
		} finally {
			// Clean up test transactions
			try {
				const transactions = await fetchTransactions(page)
				const testTxns = transactions.filter(
					(t: { date?: string; description?: string }) =>
						t.date?.startsWith(testDatePrefix) ||
						t.description?.includes(`[${testId}]`)
				)
				for (const txn of testTxns) {
					await deleteTransaction(page, txn.id)
				}
			} catch {
				// Ignore cleanup errors
			}
		}
	})

	test('ASC-E2E-002: Multiple refunds/credits correctly imported as income', async ({
		page,
	}) => {
		/**
		 * Test multiple refunds in a single import to ensure consistency
		 */
		const testId = generateShortId()
		const testDatePrefix = '2017-06'

		// Navigate to transactions page
		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')
		await expect(page.getByTestId('import-transactions-btn')).toBeVisible({
			timeout: 10000,
		})

		try {
			// Open import wizard
			await page.getByTestId('import-transactions-btn').click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// CSV with multiple credits (positive = money in)
			const csvContent = `Data,Descrição,Valor
2017-06-10,[${testId}] Original Purchase 1,-100.00
2017-06-11,[${testId}] Partial Refund 1,30.00
2017-06-12,[${testId}] Original Purchase 2,-200.00
2017-06-13,[${testId}] Full Refund 2,200.00
2017-06-14,[${testId}] Bonus Credit,50.00`

			// Upload CSV file
			const fileInput = page.locator('input[type="file"]')
			await fileInput.setInputFiles({
				name: `test-multi-refund-${testId}.csv`,
				mimeType: 'text/csv',
				buffer: Buffer.from(csvContent),
			})

			// Wait for preview
			await expect(page.getByTestId('import-preview-table')).toBeVisible({
				timeout: 10000,
			})

			// Proceed through wizard
			const nextBtn = page.getByTestId('import-next-btn')
			if (await nextBtn.isVisible()) {
				await nextBtn.click()
			}

			const confirmBtn = page.getByTestId('import-confirm-btn')
			await expect(confirmBtn).toBeVisible({ timeout: 5000 })
			await confirmBtn.click()

			await expect(page.getByTestId('import-success')).toBeVisible({
				timeout: 30000,
			})

			// Fetch and verify
			const transactions = await fetchTransactions(page)
			const testTransactions = transactions.filter(
				(t: { description?: string }) => t.description?.includes(`[${testId}]`)
			)

			expect(testTransactions.length).toBe(5)

			// Count expenses and incomes
			const expenses = testTransactions.filter(
				(t: { type: string }) => t.type === 'expense'
			)
			const incomes = testTransactions.filter(
				(t: { type: string }) => t.type === 'income'
			)

			// Should have 2 expenses (negative CSV) and 3 incomes (positive CSV)
			expect(expenses.length).toBe(2)
			expect(incomes.length).toBe(3)

			// Verify amounts (all should be positive as stored)
			const amounts = testTransactions.map((t: { amount: string }) =>
				parseFloat(t.amount)
			)
			for (const amt of amounts) {
				expect(amt).toBeGreaterThan(0)
			}
		} finally {
			// Clean up test transactions
			try {
				const transactions = await fetchTransactions(page)
				const testTxns = transactions.filter(
					(t: { date?: string; description?: string }) =>
						t.date?.startsWith(testDatePrefix) ||
						t.description?.includes(`[${testId}]`)
				)
				for (const txn of testTxns) {
					await deleteTransaction(page, txn.id)
				}
			} catch {
				// Ignore cleanup errors
			}
		}
	})
})
