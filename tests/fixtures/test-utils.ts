import { Page, expect, TestInfo } from '@playwright/test'

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

// ============================================
// Test Isolation Helpers for Parallel Execution
// ============================================

/**
 * Generates a unique test identifier for data isolation in parallel tests.
 * Uses testInfo.testId + timestamp to ensure uniqueness across parallel runs.
 */
export function generateTestId(testInfo: TestInfo): string {
  return `${testInfo.testId}-${Date.now()}`
}

/**
 * Creates a short unique suffix for test data names.
 * Useful when full testId is too long for display.
 */
export function generateShortId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
}

/**
 * Wraps a name with a unique test identifier for isolation.
 * Example: "Food & Dining" -> "Food & Dining [abc123]"
 */
export function isolatedName(baseName: string, testId: string): string {
  return `${baseName} [${testId}]`
}

/**
 * Extracts the test ID from an isolated name.
 * Example: "Food & Dining [abc123]" -> "abc123"
 */
export function extractTestId(isolatedName: string): string | null {
  const match = isolatedName.match(/\[([^\]]+)\]$/)
  return match ? match[1] : null
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
export async function loginViaUI(page: Page, maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Add delay between retry attempts to avoid rate limiting
    // Delay increases with each attempt: 2s, 4s, 6s...
    if (attempt > 1) {
      await page.waitForTimeout(2000 * (attempt - 1))
    }

    await page.goto('/login')

    // Wait for form to be ready
    await expect(page.getByLabel('E-mail')).toBeVisible()

    // Wait for any error messages to clear (from previous failed attempts)
    const errorElement = page.getByText(/erro|error/i).first()
    if (await errorElement.isVisible().catch(() => false)) {
      await page.waitForTimeout(500)
    }

    // Clear and fill form fields
    const emailField = page.getByLabel('E-mail')
    const passwordField = page.getByTestId('input-password')

    await emailField.clear()
    await emailField.fill(TEST_USER.email)
    await passwordField.clear()
    await passwordField.fill(TEST_USER.password)

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
  const { rememberMe = false, maxRetries = 5 } = options
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
    // Add delay between retry attempts to avoid rate limiting
    // Delay increases with each attempt: 2s, 4s, 6s...
    if (attempt > 1) {
      await page.waitForTimeout(2000 * (attempt - 1))
    }

    await page.goto('/login')
    await expect(page.getByLabel('E-mail')).toBeVisible()

    // Wait for any error messages to clear (from previous failed attempts)
    const errorElement = page.getByText(/erro|error/i).first()
    if (await errorElement.isVisible().catch(() => false)) {
      await page.waitForTimeout(500)
    }

    // Clear and fill credentials
    const emailField = page.getByLabel('E-mail')
    const passwordField = page.getByTestId('input-password')

    await emailField.clear()
    await emailField.fill(TEST_USER.email)
    await passwordField.clear()
    await passwordField.fill(TEST_USER.password)

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

// ============================================
// Isolated Test Data Helpers (for parallel execution)
// ============================================

/**
 * Creates categories with isolated names for parallel test execution.
 * Each category name is suffixed with [testId] for unique identification.
 * Handles 409 conflicts by finding and returning the existing category.
 */
export async function seedIsolatedCategories(
  page: Page,
  testId: string,
  categories: Array<{ name: string; icon?: string; color?: string; type?: 'expense' | 'income' }> = Object.values(TEST_CATEGORIES)
): Promise<TestCategory[]> {
  const createdCategories: TestCategory[] = []

  for (const cat of categories) {
    const isolatedCategoryName = isolatedName(cat.name, testId)
    try {
      const created = await createCategory(page, {
        ...cat,
        name: isolatedCategoryName,
      })
      createdCategories.push(created)
    } catch (error) {
      // Handle 409 conflict - category already exists
      const errorMessage = String(error)
      if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
        // Find the existing category with this name
        const existingCategories = await fetchCategories(page)
        const existing = existingCategories.find(c => c.name === isolatedCategoryName)
        if (existing) {
          console.log(`Using existing isolated category: ${isolatedCategoryName}`)
          createdCategories.push(existing)
        } else {
          console.log(`Could not find existing category ${isolatedCategoryName} after 409 conflict`)
        }
      } else {
        console.log(`Could not create isolated category ${cat.name}: ${error}`)
      }
    }
  }

  return createdCategories
}

/**
 * Creates transactions with isolated descriptions for parallel test execution.
 * Each transaction description is suffixed with [testId] for unique identification.
 */
export async function seedIsolatedTransactions(
  page: Page,
  testId: string,
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
      const created = await createTransaction(page, {
        ...txn,
        description: isolatedName(txn.description, testId),
      })
      createdTransactions.push(created)
    } catch (error) {
      console.log(`Could not create isolated transaction ${txn.description}: ${error}`)
    }
  }

  return createdTransactions
}

/**
 * Deletes only categories that belong to a specific test (identified by testId in name).
 * This allows parallel tests to clean up only their own data.
 */
export async function deleteIsolatedCategories(page: Page, testId: string): Promise<void> {
  const categories = await fetchCategories(page)
  const isolatedCategories = categories.filter(c => c.name.includes(`[${testId}]`))

  for (const category of isolatedCategories) {
    await deleteCategory(page, category.id)
  }
}

/**
 * Deletes only transactions that belong to a specific test (identified by testId in description).
 * This allows parallel tests to clean up only their own data.
 */
export async function deleteIsolatedTransactions(page: Page, testId: string): Promise<void> {
  const transactions = await fetchTransactions(page)
  const isolatedTransactions = transactions.filter(t => t.description.includes(`[${testId}]`))

  for (const transaction of isolatedTransactions) {
    await deleteTransaction(page, transaction.id)
  }
}

// ============================================
// Goal API Helpers
// ============================================

/**
 * Goal type definition
 */
export interface TestGoal {
  id: string
  user_id: string
  category_id: string
  limit_amount: number
  current_amount: number
  alert_on_exceed: boolean
  period: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

/**
 * Helper to create a goal via API
 */
export async function createGoal(
  page: Page,
  goal: {
    categoryId: string
    limitAmount: number
    alertOnExceed?: boolean
    period?: 'monthly' | 'weekly' | 'yearly'
  }
): Promise<TestGoal> {
  const token = await getAuthToken(page)

  const response = await page.request.post(`${API_URL}/goals`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: {
      category_id: goal.categoryId,
      limit_amount: goal.limitAmount,
      alert_on_exceed: goal.alertOnExceed ?? false,
      period: goal.period || 'monthly',
    },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create goal: ${response.status()} - ${error}`)
  }

  return await response.json()
}

/**
 * Helper to delete a goal via API
 */
export async function deleteGoal(page: Page, goalId: string): Promise<void> {
  const token = await getAuthToken(page)

  const response = await page.request.delete(`${API_URL}/goals/${goalId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete goal: ${response.status()}`)
  }
}

/**
 * Helper to fetch all goals via API
 */
export async function fetchGoals(page: Page): Promise<TestGoal[]> {
  const token = await getAuthToken(page)

  const response = await page.request.get(`${API_URL}/goals`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to fetch goals: ${response.status()}`)
  }

  const data = await response.json()
  return data.goals || []
}

/**
 * Helper to delete all goals via API
 */
export async function deleteAllGoals(page: Page): Promise<void> {
  const goals = await fetchGoals(page)
  for (const goal of goals) {
    await deleteGoal(page, goal.id)
  }
}

/**
 * Creates goals with isolated category names for parallel test execution.
 * Categories must already exist with isolated names.
 *
 * NOTE: Goals are stored in localStorage, not the backend API yet.
 * This function directly injects goals into localStorage for testing.
 */
export async function seedIsolatedGoals(
  page: Page,
  testId: string,
  goals: Array<{
    categoryName: string  // The base category name (without [testId])
    limitAmount: number
    alertOnExceed?: boolean
    period?: 'monthly' | 'weekly' | 'yearly'
  }>
): Promise<TestGoal[]> {
  const createdGoals: TestGoal[] = []

  // Fetch all categories to find the isolated ones
  const categories = await fetchCategories(page)

  // Inject goals into localStorage
  await page.evaluate(({testId, goalsSpec, categories}) => {
    // Get existing goals from localStorage
    const STORAGE_KEY = 'finance_tracker_goals'
    let existingGoals: any[] = []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        existingGoals = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load existing goals:', e)
    }

    // Create new goals
    const newGoals = goalsSpec.map((spec: any) => {
      const isolatedCategoryName = `${spec.categoryName} [${testId}]`
      const category = categories.find((c: any) => c.name === isolatedCategoryName)

      if (!category) {
        console.log(`Could not find isolated category ${isolatedCategoryName} for goal`)
        return null
      }

      const now = new Date().toISOString()
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const endOfMonth = new Date(startOfMonth)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)
      endOfMonth.setDate(0)
      endOfMonth.setHours(23, 59, 59, 999)

      return {
        id: `goal-${testId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        limitAmount: spec.limitAmount,
        currentAmount: 0,
        alertOnExceed: spec.alertOnExceed ?? true,
        period: spec.period || 'monthly',
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
        createdAt: now,
        updatedAt: now,
      }
    }).filter((g: any) => g !== null)

    // Merge with existing goals
    const allGoals = [...existingGoals, ...newGoals]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allGoals))

    return newGoals
  }, { testId, goalsSpec: goals, categories })

  // Convert to TestGoal format (approximately, since localStorage format is slightly different)
  for (const goalSpec of goals) {
    const isolatedCategoryName = isolatedName(goalSpec.categoryName, testId)
    const category = categories.find(c => c.name === isolatedCategoryName)

    if (category) {
      createdGoals.push({
        id: `goal-${testId}-${Date.now()}`,
        user_id: '', // Not used in localStorage
        category_id: category.id,
        limit_amount: goalSpec.limitAmount,
        current_amount: 0,
        alert_on_exceed: goalSpec.alertOnExceed ?? true,
        period: goalSpec.period || 'monthly',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return createdGoals
}

/**
 * Deletes only goals that belong to isolated categories (identified by testId in category name).
 * This allows parallel tests to clean up only their own data.
 *
 * NOTE: Goals are stored in localStorage, so we clean up from there.
 */
export async function deleteIsolatedGoals(page: Page, testId: string): Promise<void> {
  // Get isolated category IDs
  const categories = await fetchCategories(page)
  const isolatedCategoryIds = categories
    .filter(c => c.name.includes(`[${testId}]`))
    .map(c => c.id)

  // Remove goals from localStorage that belong to isolated categories
  await page.evaluate((categoryIds) => {
    const STORAGE_KEY = 'finance_tracker_goals'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const allGoals = JSON.parse(stored)
        const filteredGoals = allGoals.filter((goal: any) =>
          !categoryIds.includes(goal.categoryId)
        )
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredGoals))
      }
    } catch (e) {
      console.error('Failed to delete isolated goals from localStorage:', e)
    }
  }, isolatedCategoryIds)
}

/**
 * Cleans up all test data created with a specific testId.
 * Deletes goals first (they reference categories), then transactions, then categories.
 */
export async function cleanupIsolatedTestData(page: Page, testId: string): Promise<void> {
  try {
    await deleteIsolatedGoals(page, testId)
  } catch (e) {
    console.log(`Could not delete isolated goals for ${testId}: ${e}`)
  }

  try {
    await deleteIsolatedTransactions(page, testId)
  } catch (e) {
    console.log(`Could not delete isolated transactions for ${testId}: ${e}`)
  }

  try {
    await deleteIsolatedCategories(page, testId)
  } catch (e) {
    console.log(`Could not delete isolated categories for ${testId}: ${e}`)
  }
}

// ============================================
// Category Rules API Helpers
// ============================================

/**
 * Category Rule type definition
 */
export interface TestCategoryRule {
  id: string
  pattern: string
  category_id: string
  priority: number
  created_at: string
  updated_at: string
}

/**
 * Helper to fetch all category rules via API
 */
export async function fetchCategoryRules(page: Page): Promise<TestCategoryRule[]> {
  const token = await getAuthToken(page)

  const response = await page.request.get(`${API_URL}/category-rules`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to fetch category rules: ${response.status()}`)
  }

  const data = await response.json()
  return data.rules || data || []
}

/**
 * Helper to delete a category rule via API
 */
export async function deleteCategoryRule(page: Page, ruleId: string): Promise<void> {
  const token = await getAuthToken(page)

  const response = await page.request.delete(`${API_URL}/category-rules/${ruleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete category rule: ${response.status()}`)
  }
}

/**
 * Helper to delete all category rules via API
 * Used by M6 tests to clean up before each test file
 */
export async function deleteAllCategoryRules(page: Page): Promise<void> {
  const rules = await fetchCategoryRules(page)
  for (const rule of rules) {
    await deleteCategoryRule(page, rule.id)
  }
}

// ============================================
// Group API Helpers
// ============================================

/**
 * Group type definition
 */
export interface TestGroup {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

/**
 * Helper to fetch all groups via API
 */
export async function fetchGroups(page: Page): Promise<TestGroup[]> {
  const token = await getAuthToken(page)

  const response = await page.request.get(`${API_URL}/groups`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to fetch groups: ${response.status()}`)
  }

  const data = await response.json()
  return data.groups || data || []
}

/**
 * Helper to delete a group via API
 */
export async function deleteGroup(page: Page, groupId: string): Promise<void> {
  const token = await getAuthToken(page)

  const response = await page.request.delete(`${API_URL}/groups/${groupId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Failed to delete group: ${response.status()}`)
  }
}

/**
 * Helper to delete all groups via API
 * Used by M9 tests to clean up before each test file
 */
export async function deleteAllGroups(page: Page): Promise<void> {
  const groups = await fetchGroups(page)
  for (const group of groups) {
    await deleteGroup(page, group.id)
  }
}
