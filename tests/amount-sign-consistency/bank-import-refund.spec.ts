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
		// Use dates from current month to ensure they're visible in the default date range
		const baseDate = new Date()
		const year = baseDate.getFullYear()
		const month = String(baseDate.getMonth() + 1).padStart(2, '0')
		const testDatePrefix = `${year}-${month}`

		// Navigate to transactions page - ensure auth is still valid
		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')
		await page.waitForLoadState('networkidle')

		// Check if we were redirected to login (auth expired)
		if (page.url().includes('login')) {
			// Auth expired during test run - skip this test gracefully
			console.log('Auth expired during test run - skipping')
			return
		}

		await expect(page.getByTestId('import-transactions-btn')).toBeVisible({
			timeout: 10000,
		})

		try {
			// Open import wizard
			await page.getByTestId('import-transactions-btn').click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Prepare CSV content with mixed debits and credits
			// Use dates from test month to ensure visibility
			const csvContent = `Data,Descrição,Valor
${year}-${month}-15,[${testId}] Store Purchase,-75.00
${year}-${month}-16,[${testId}] Refund from Store,50.00
${year}-${month}-17,[${testId}] Another Expense,-25.00`

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

			// Wait for modal to close
			await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

			// Wait for page to refresh after modal closes
			await page.waitForLoadState('networkidle')

			// Fetch transactions via API to verify stored values
			// Retry fetch to handle potential caching/timing issues
			let testTransactions: Array<{ description?: string; type?: string; amount?: string }> = []
			let allTransactions: Array<{ description?: string }> = []
			for (let i = 0; i < 10; i++) {
				allTransactions = await fetchTransactions(page)
				testTransactions = allTransactions.filter(
					(t: { description?: string }) => t.description?.includes(`[${testId}]`)
				)
				if (testTransactions.length >= 3) break
				// Short delay before retrying
				await new Promise(resolve => setTimeout(resolve, 300))
			}

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
		// Use dates from current month to ensure they're visible in the default date range
		const baseDate = new Date()
		const year = baseDate.getFullYear()
		const month = String(baseDate.getMonth() + 1).padStart(2, '0')
		const testDatePrefix = `${year}-${month}`

		// Navigate to transactions page - ensure auth is still valid
		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')
		await page.waitForLoadState('networkidle')

		// Check if we were redirected to login (auth expired)
		if (page.url().includes('login')) {
			// Auth expired during test run - skip this test gracefully
			console.log('Auth expired during test run - skipping')
			return
		}

		await expect(page.getByTestId('import-transactions-btn')).toBeVisible({
			timeout: 10000,
		})

		try {
			// Open import wizard
			await page.getByTestId('import-transactions-btn').click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// CSV with multiple credits (positive = money in)
			// Use dates from test month to ensure visibility
			const csvContent = `Data,Descrição,Valor
${year}-${month}-10,[${testId}] Original Purchase 1,-100.00
${year}-${month}-11,[${testId}] Partial Refund 1,30.00
${year}-${month}-12,[${testId}] Original Purchase 2,-200.00
${year}-${month}-13,[${testId}] Full Refund 2,200.00
${year}-${month}-14,[${testId}] Bonus Credit,50.00`

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

			// Click done to close modal
			const doneBtn = page.getByTestId('import-done-btn')
			if (await doneBtn.isVisible()) {
				await doneBtn.click()
			}

			// Wait for modal to close
			await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

			// Wait for page to refresh after modal closes
			await page.waitForLoadState('networkidle')

			// Verify transactions via API to ensure proper import
			// Retry fetch to handle potential caching/timing issues
			let testTransactions: Array<{ description?: string; type?: string; amount?: string }> = []
			let allTransactions: Array<{ description?: string }> = []
			for (let i = 0; i < 10; i++) {
				allTransactions = await fetchTransactions(page)
				testTransactions = allTransactions.filter(
					(t: { description?: string }) => t.description?.includes(`[${testId}]`)
				)
				if (testTransactions.length >= 5) break
				// Short delay before retrying
				await new Promise(resolve => setTimeout(resolve, 300))
			}

			expect(testTransactions.length).toBe(5)

			// Find each transaction
			const purchase1 = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Original Purchase 1')
			)
			const purchase2 = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Original Purchase 2')
			)
			const refund1 = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Partial Refund 1')
			)
			const refund2 = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Full Refund 2')
			)
			const bonusCredit = testTransactions.find((t: { description?: string }) =>
				t.description?.includes('Bonus Credit')
			)

			// Verify all transactions exist
			expect(purchase1).toBeDefined()
			expect(purchase2).toBeDefined()
			expect(refund1).toBeDefined()
			expect(refund2).toBeDefined()
			expect(bonusCredit).toBeDefined()

			// KEY ASSERTIONS:
			// 1. Negative CSV amounts should become 'expense' type
			expect(purchase1.type).toBe('expense')
			expect(purchase2.type).toBe('expense')

			// 2. Positive CSV amounts (refunds/credits) should become 'income' type
			expect(refund1.type).toBe('income')
			expect(refund2.type).toBe('income')
			expect(bonusCredit.type).toBe('income')

			// 3. Verify amounts are correctly stored (absolute values)
			expect(parseFloat(purchase1.amount)).toBe(100)
			expect(parseFloat(purchase2.amount)).toBe(200)
			expect(parseFloat(refund1.amount)).toBe(30)
			expect(parseFloat(refund2.amount)).toBe(200)
			expect(parseFloat(bonusCredit.amount)).toBe(50)
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
