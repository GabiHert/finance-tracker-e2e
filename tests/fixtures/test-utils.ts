import { Page, expect } from '@playwright/test'

// API URL for direct backend calls
export const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8081/api/v1'

/**
 * Test user credentials for E2E tests
 * Uses environment variables with fallbacks for flexibility
 * Note: Default password avoids special characters (like !) that can cause shell escaping issues
 */
export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_TEST_USER_PASSWORD || 'E2eTestPassword1234',
  name: 'E2E Test User',
}

/**
 * Helper to create a test user via API
 */
export async function createTestUser(page: Page): Promise<void> {
  const response = await page.request.post(`${API_URL}/auth/register`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
      terms_accepted: true,
    },
  })

  // User might already exist from previous test run
  if (response.status() !== 201 && response.status() !== 409) {
    throw new Error(`Failed to create test user: ${response.status()}`)
  }
}

/**
 * Helper to login a test user
 */
export async function loginTestUser(page: Page): Promise<string> {
  const response = await page.request.post(`${API_URL}/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to login: ${response.status()}`)
  }

  const data = await response.json()
  return data.token
}

/**
 * Helper to login via UI with retry logic for flaky connections
 * Note: Rate limiting is disabled in E2E mode via E2E_MODE=true environment variable
 */
export async function loginViaUI(page: Page, maxRetries = 2): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto('/login')

    // Wait for form to be ready
    await expect(page.getByLabel('E-mail')).toBeVisible()

    await page.getByLabel('E-mail').fill(TEST_USER.email)
    await page.getByTestId('input-password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Wait for either navigation to dashboard or error message
    try {
      await expect(page).toHaveURL(/.*dashboard|.*\/$/i, { timeout: 15000 })
      return // Success!
    } catch (error) {
      // Check if there's an error message on the page (rate limit or auth error)
      const hasError = await page.getByText(/erro|error|aguarde|wait|limite|limit/i).isVisible().catch(() => false)

      if (attempt === maxRetries) {
        throw new Error(
          `Login failed after ${maxRetries} attempts. ` +
            (hasError ? 'Backend returned error (may be rate limited).' : 'Navigation timeout.')
        )
      }
    }
  }
}

/**
 * Helper to login via UI with request body capture for remember_me tests
 * Note: Rate limiting is disabled in E2E mode via E2E_MODE=true environment variable
 */
export async function loginViaUIWithRequestCapture(
  page: Page,
  options: { rememberMe?: boolean; maxRetries?: number } = {}
): Promise<{ requestBody: Record<string, unknown> | null }> {
  const { rememberMe = false, maxRetries = 2 } = options
  let loginRequestBody: Record<string, unknown> | null = null

  // Set up request interception
  await page.route('**/auth/login', async (route, request) => {
    if (request.method() === 'POST') {
      try {
        loginRequestBody = JSON.parse(request.postData() || '{}')
      } catch {
        loginRequestBody = null
      }
    }
    await route.continue()
  })

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Reset to login page for retry if needed
    if (attempt > 1) {
      await page.goto('/login')
      await expect(page.getByLabel('E-mail')).toBeVisible()
    }

    // Fill in credentials
    await page.getByLabel('E-mail').fill(TEST_USER.email)
    await page.getByTestId('input-password').fill(TEST_USER.password)

    // Toggle remember me checkbox if needed
    const checkbox = page.getByTestId('remember-me-checkbox')
    const isChecked = await checkbox.isChecked()
    if (rememberMe && !isChecked) {
      await checkbox.click()
    } else if (!rememberMe && isChecked) {
      await checkbox.click()
    }

    // Submit login
    await page.getByRole('button', { name: /entrar/i }).click()

    // Wait for navigation or error
    try {
      await expect(page).toHaveURL(/.*dashboard|.*\/$/i, { timeout: 15000 })
      // Success - remove route handler and return
      await page.unroute('**/auth/login')
      return { requestBody: loginRequestBody }
    } catch {
      // Check for error message (rate limit or auth error)
      const hasError = await page
        .getByText(/erro|error|aguarde|wait|limite|limit/i)
        .isVisible()
        .catch(() => false)

      if (attempt === maxRetries) {
        await page.unroute('**/auth/login')
        throw new Error(
          `Login failed after ${maxRetries} attempts. ` +
            (hasError ? 'Backend returned error (may be rate limited).' : 'Navigation timeout.')
        )
      }
    }
  }

  await page.unroute('**/auth/login')
  return { requestBody: loginRequestBody }
}

/**
 * Helper to reset test data via API
 * Deletes all user data: transactions, categories, and other entities
 */
export async function resetTestData(page: Page, token?: string): Promise<void> {
  // Delete all data types (order matters - delete dependent data first)
  try {
    await deleteAllTransactions(page)
  } catch (e) {
    console.log('No transactions to delete or endpoint not available')
  }

  try {
    await deleteAllCategories(page)
  } catch (e) {
    console.log('No categories to delete or endpoint not available')
  }
}

/**
 * Helper to clean up all test data before/after tests
 * More comprehensive than resetTestData - includes all entity types
 */
export async function cleanupAllTestData(page: Page): Promise<void> {
  // Navigate to app first to establish auth context
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Clean up in order (dependent data first)
  try { await deleteAllTransactions(page) } catch (e) { /* ignore */ }
  try { await deleteAllCategories(page) } catch (e) { /* ignore */ }
}

/**
 * Helper to verify database state
 */
export async function verifyDatabaseRecord(
  page: Page,
  endpoint: string,
  expectedData: Record<string, unknown>,
  token: string
): Promise<void> {
  const response = await page.request.get(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()

  for (const [key, value] of Object.entries(expectedData)) {
    expect(data[key]).toBe(value)
  }
}

/**
 * Category type definition
 */
export interface TestCategory {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
  transaction_count?: number
}

/**
 * Helper to get auth token from localStorage via page context
 */
export async function getAuthToken(page: Page): Promise<string> {
  return await page.evaluate(() => localStorage.getItem('access_token') || '')
}

/**
 * Helper to create a category via API
 */
export async function createCategory(
  page: Page,
  category: { name: string; icon?: string; color?: string; type?: 'expense' | 'income' }
): Promise<TestCategory> {
  const token = await getAuthToken(page)

  const response = await page.request.post(`${API_URL}/categories`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: category.name,
      icon: category.icon || 'folder',
      color: category.color || '#3B82F6',
      type: category.type || 'expense',
    },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create category: ${response.status()} - ${error}`)
  }

  return await response.json()
}

/**
 * Helper to delete a category via API
 */
export async function deleteCategory(page: Page, categoryId: string): Promise<void> {
  const token = await getAuthToken(page)

  const response = await page.request.delete(`${API_URL}/categories/${categoryId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete category: ${response.status()}`)
  }
}

/**
 * Helper to fetch all categories via API
 */
export async function fetchCategories(page: Page): Promise<TestCategory[]> {
  const token = await getAuthToken(page)

  const response = await page.request.get(`${API_URL}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to fetch categories: ${response.status()}`)
  }

  const data = await response.json()
  return data.categories || []
}

/**
 * Helper to delete all categories via API
 */
export async function deleteAllCategories(page: Page): Promise<void> {
  const categories = await fetchCategories(page)
  for (const category of categories) {
    await deleteCategory(page, category.id)
  }
}

/**
 * Standard test categories for seeding
 */
export const TEST_CATEGORIES = {
  foodAndDining: { name: 'Food & Dining', icon: 'utensils', color: '#EF4444', type: 'expense' as const },
  salary: { name: 'Salary', icon: 'banknotes', color: '#22C55E', type: 'income' as const },
  transportation: { name: 'Transportation', icon: 'car', color: '#F59E0B', type: 'expense' as const },
  entertainment: { name: 'Entertainment', icon: 'film', color: '#8B5CF6', type: 'expense' as const },
  shopping: { name: 'Shopping', icon: 'bag-shopping', color: '#EC4899', type: 'expense' as const },
  freelance: { name: 'Freelance', icon: 'laptop', color: '#14B8A6', type: 'income' as const },
}

/**
 * Helper to seed standard test categories
 */
export async function seedTestCategories(
  page: Page,
  categories: Array<{ name: string; icon?: string; color?: string; type?: 'expense' | 'income' }> = Object.values(TEST_CATEGORIES)
): Promise<TestCategory[]> {
  const createdCategories: TestCategory[] = []

  for (const cat of categories) {
    try {
      const created = await createCategory(page, cat)
      createdCategories.push(created)
    } catch (error) {
      console.log(`Could not create category ${cat.name}: ${error}`)
    }
  }

  return createdCategories
}

// ============================================
// Transaction API Helpers
// ============================================

/**
 * Transaction type definition
 */
export interface TestTransaction {
  id: string
  date: string
  description: string
  amount: string
  type: 'expense' | 'income'
  category_id?: string
  category?: {
    id: string
    name: string
    color: string
    icon: string
    type: string
  }
  notes: string
  is_recurring: boolean
  created_at: string
  updated_at: string
}

/**
 * Helper to create a transaction via API
 */
export async function createTransaction(
  page: Page,
  transaction: {
    date: string // YYYY-MM-DD format
    description: string
    amount: number
    type: 'expense' | 'income'
    categoryId?: string
    notes?: string
  }
): Promise<TestTransaction> {
  const token = await getAuthToken(page)

  const response = await page.request.post(`${API_URL}/transactions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: {
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category_id: transaction.categoryId || null,
      notes: transaction.notes || '',
    },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create transaction: ${response.status()} - ${error}`)
  }

  return await response.json()
}

/**
 * Helper to delete a transaction via API
 */
export async function deleteTransaction(page: Page, transactionId: string): Promise<void> {
  const token = await getAuthToken(page)

  const response = await page.request.delete(`${API_URL}/transactions/${transactionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete transaction: ${response.status()}`)
  }
}

/**
 * Helper to fetch all transactions via API
 */
export async function fetchTransactions(page: Page): Promise<TestTransaction[]> {
  const token = await getAuthToken(page)

  const response = await page.request.get(`${API_URL}/transactions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to fetch transactions: ${response.status()}`)
  }

  const data = await response.json()
  return data.transactions || []
}

/**
 * Helper to delete all transactions via API
 */
export async function deleteAllTransactions(page: Page): Promise<void> {
  const transactions = await fetchTransactions(page)
  for (const transaction of transactions) {
    await deleteTransaction(page, transaction.id)
  }
}

/**
 * Helper to seed test transactions
 */
export async function seedTestTransactions(
  page: Page,
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: 'expense' | 'income'
    categoryId?: string
    notes?: string
  }>
): Promise<TestTransaction[]> {
  const createdTransactions: TestTransaction[] = []

  for (const txn of transactions) {
    try {
      const created = await createTransaction(page, txn)
      createdTransactions.push(created)
    } catch (error) {
      console.log(`Could not create transaction ${txn.description}: ${error}`)
    }
  }

  return createdTransactions
}
