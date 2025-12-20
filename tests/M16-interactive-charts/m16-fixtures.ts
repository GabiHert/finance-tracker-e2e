import { Page, TestInfo } from '@playwright/test'
import {
	seedTestTransactions,
	seedTestCategories,
	deleteAllTransactions,
	TestCategory,
	TestTransaction,
	getAuthToken,
	API_URL,
} from '../fixtures/test-utils'

/**
 * M16 Test Fixtures
 * Provides data seeding helpers for interactive chart tests
 */

/**
 * Generates sample transactions spread over 18 months
 * This provides enough data for chart navigation, minimap, and zoom level testing
 */
export function generateM16TestTransactions(
	expenseCategoryId: string,
	incomeCategoryId: string
): Array<{
	date: string
	description: string
	amount: number
	type: 'expense' | 'income'
	categoryId: string
	notes?: string
}> {
	const transactions: Array<{
		date: string
		description: string
		amount: number
		type: 'expense' | 'income'
		categoryId: string
		notes?: string
	}> = []

	const today = new Date()

	// Generate transactions for the past 18 months
	for (let monthsAgo = 0; monthsAgo < 18; monthsAgo++) {
		const monthDate = new Date(today)
		monthDate.setMonth(today.getMonth() - monthsAgo)

		// Add 2-4 expenses per month
		const expenseCount = 2 + Math.floor(Math.random() * 3)
		for (let i = 0; i < expenseCount; i++) {
			const day = Math.min(1 + Math.floor(Math.random() * 27), 28)
			const expenseDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)

			transactions.push({
				date: expenseDate.toISOString().split('T')[0],
				description: `M16 Test Expense ${monthsAgo}-${i}`,
				amount: 5000 + Math.floor(Math.random() * 50000), // R$ 50.00 - R$ 550.00 in cents
				type: 'expense',
				categoryId: expenseCategoryId,
			})
		}

		// Add 1-2 income entries per month
		const incomeCount = 1 + Math.floor(Math.random() * 2)
		for (let i = 0; i < incomeCount; i++) {
			const day = Math.min(5 + Math.floor(Math.random() * 10), 28)
			const incomeDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)

			transactions.push({
				date: incomeDate.toISOString().split('T')[0],
				description: `M16 Test Income ${monthsAgo}-${i}`,
				amount: 100000 + Math.floor(Math.random() * 200000), // R$ 1000.00 - R$ 3000.00 in cents
				type: 'income',
				categoryId: incomeCategoryId,
			})
		}
	}

	return transactions
}

/**
 * Seeds categories and transactions needed for M16 tests
 */
export async function seedM16TestData(page: Page): Promise<{
	categories: TestCategory[]
	transactions: TestTransaction[]
}> {
	// Navigate to ensure auth context is established
	await page.goto('/')
	await page.waitForLoadState('domcontentloaded')

	// Create test categories
	const categories = await seedTestCategories(page, [
		{ name: 'M16 Test Expense Category', icon: 'shopping-cart', color: '#EF4444', type: 'expense' },
		{ name: 'M16 Test Income Category', icon: 'banknotes', color: '#22C55E', type: 'income' },
	])

	if (categories.length < 2) {
		throw new Error('Failed to create M16 test categories')
	}

	const expenseCategory = categories.find(c => c.type === 'expense')
	const incomeCategory = categories.find(c => c.type === 'income')

	if (!expenseCategory || !incomeCategory) {
		throw new Error('Could not find expense or income category after seeding')
	}

	// Generate and seed transactions
	const transactionData = generateM16TestTransactions(expenseCategory.id, incomeCategory.id)
	const transactions = await seedTestTransactions(page, transactionData)

	console.log(`M16: Seeded ${categories.length} categories and ${transactions.length} transactions`)

	return { categories, transactions }
}

/**
 * Cleans up M16 test data
 */
export async function cleanupM16TestData(page: Page): Promise<void> {
	try {
		await deleteAllTransactions(page)
	} catch (e) {
		console.log('M16 cleanup: Could not delete transactions', e)
	}
}

/**
 * Checks if M16 test data already exists with sufficient historical data
 * M16 tests require at least 12 months of data for navigation testing
 */
export async function hasM16TestData(page: Page): Promise<boolean> {
	// Navigate to app first to establish auth context and access localStorage
	await page.goto('/')
	await page.waitForLoadState('domcontentloaded')

	const token = await getAuthToken(page)

	try {
		const response = await page.request.get(`${API_URL}/dashboard/data-range`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		if (!response.ok()) {
			return false
		}

		const data = await response.json()
		const hasData = data.data?.has_data === true || data.has_data === true

		if (!hasData) {
			return false
		}

		// Check if we have at least 12 months of data for proper M16 testing
		const oldestDate = data.data?.oldest_date || data.oldest_date
		const newestDate = data.data?.newest_date || data.newest_date

		if (!oldestDate || !newestDate) {
			return false
		}

		const oldest = new Date(oldestDate)
		const newest = new Date(newestDate)
		const monthsDiff = (newest.getFullYear() - oldest.getFullYear()) * 12 + (newest.getMonth() - oldest.getMonth())

		// Need at least 12 months of data for navigation tests
		return monthsDiff >= 12
	} catch {
		return false
	}
}
