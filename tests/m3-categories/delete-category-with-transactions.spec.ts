import { test, expect } from '@playwright/test'
import {
  createCategory,
  createTransaction,
  fetchCategories,
  fetchTransactions,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
} from '../fixtures/test-utils'

/**
 * M3-E2E-04: Delete Category with Transactions Flow
 *
 * This test suite validates the complete category deletion flow when categories
 * have linked transactions. It covers:
 *
 * - Warning message display for categories with transactions (04a)
 * - Accurate transaction count in warning messages (04b)
 * - Cancel action preserving categories and transactions (04c)
 * - Successful deletion with toast notification (04d)
 * - No warning for categories without transactions (04e)
 * - Different transaction counts across multiple categories (04f)
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 *
 * PARALLEL EXECUTION: Each test uses isolated data with unique testIds
 * to prevent interference between parallel test runs.
 */
test.describe('M3: Delete Category with Transactions', () => {
  test('M3-E2E-04a: Should show transaction warning when deleting category with transactions', async ({
    page,
  }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Category With Transactions', testId)
    const transactionDesc = isolatedName('Test Transaction for Warning Display', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Create a test category via API
      const category = await createCategory(page, {
        name: categoryName,
        type: 'expense',
      })

      // Step 2: Create a transaction linked to this category
      const today = new Date().toISOString().split('T')[0]
      await createTransaction(page, {
        date: today,
        description: transactionDesc,
        amount: 50.0,
        type: 'expense',
        categoryId: category.id,
      })

      // Step 3: Navigate to categories page and wait for grid to render
      await page.goto('/categories')
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 4: Locate the specific category card by name
      const categoryCard = page.locator('[data-testid="category-card"]', {
        hasText: categoryName,
      })
      await expect(categoryCard).toBeVisible()

      // Step 5: Trigger delete action
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 6: Verify delete confirmation modal appears
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()

      // Step 7: Assert that the transaction warning IS visible
      await expect(page.getByTestId('transaction-warning')).toBeVisible()

      // Step 8: Clean up by closing the modal
      await page.getByTestId('cancel-delete-btn').click()
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-04b: Should show specific transaction count in warning', async ({
    page,
  }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Category With Specific Count', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Create a test category
      const category = await createCategory(page, {
        name: categoryName,
        type: 'expense',
      })

      // Step 2: Create exactly 3 transactions to verify precise count display
      const today = new Date().toISOString().split('T')[0]
      const EXPECTED_TRANSACTION_COUNT = 3

      await seedIsolatedTransactions(page, testId, [
        {
          date: today,
          description: 'Transaction 1 for Count Test',
          amount: 10.0,
          type: 'expense',
          categoryId: category.id,
        },
        {
          date: today,
          description: 'Transaction 2 for Count Test',
          amount: 20.0,
          type: 'expense',
          categoryId: category.id,
        },
        {
          date: today,
          description: 'Transaction 3 for Count Test',
          amount: 30.0,
          type: 'expense',
          categoryId: category.id,
        },
      ])

      // Step 3: Navigate to categories page
      await page.goto('/categories')
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 4: Locate and interact with the category card
      const categoryCard = page.locator('[data-testid="category-card"]', {
        hasText: categoryName,
      })
      await expect(categoryCard).toBeVisible()
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 5: Verify modal and warning are visible
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toBeVisible()

      // Step 6: Assert the warning contains the EXACT transaction count
      await expect(page.getByTestId('transaction-warning')).toContainText(
        `${EXPECTED_TRANSACTION_COUNT} transacoes ficarao sem categoria`
      )

      // Step 7: Clean up
      await page.getByTestId('cancel-delete-btn').click()
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-04c: Should cancel deletion and keep category with transactions', async ({
    page,
  }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Category To Cancel Delete', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Create a category with linked transactions
      const category = await createCategory(page, {
        name: categoryName,
        type: 'expense',
      })

      const today = new Date().toISOString().split('T')[0]
      const TRANSACTION_COUNT = 2

      await seedIsolatedTransactions(page, testId, [
        {
          date: today,
          description: 'Transaction 1 - Should Survive Cancel',
          amount: 50.0,
          type: 'expense',
          categoryId: category.id,
        },
        {
          date: today,
          description: 'Transaction 2 - Should Survive Cancel',
          amount: 75.0,
          type: 'expense',
          categoryId: category.id,
        },
      ])

      // Step 2: Navigate to categories page
      await page.goto('/categories')
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 3: Open delete modal for the target category
      const categoryCard = page.locator('[data-testid="category-card"]', {
        hasText: categoryName,
      })
      await expect(categoryCard).toBeVisible()
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 4: Verify modal opens with transaction warning
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toContainText(
        `${TRANSACTION_COUNT} transacoes ficarao sem categoria`
      )

      // Step 5: Click Cancel button
      await page.getByTestId('cancel-delete-btn').click()

      // Step 6: Verify modal closes properly
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

      // Step 7: Verify category still exists in the grid
      await expect(categoryCard).toBeVisible()

      // Step 8: Verify via API that category still exists
      const categories = await fetchCategories(page)
      const categoryStillExists = categories.some((c) => c.id === category.id)
      expect(categoryStillExists).toBeTruthy()

      // Step 9: Verify transactions are still linked to the category
      const transactions = await fetchTransactions(page)
      const linkedTransactions = transactions.filter(
        (t) => t.category_id === category.id
      )
      expect(linkedTransactions.length).toBe(TRANSACTION_COUNT)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-04d: Should delete category with transactions and show success toast', async ({
    page,
  }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Category To Delete With Toast', testId)
    const transactionDesc = isolatedName('Transaction To Be Orphaned', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Create a category with a linked transaction
    const category = await createCategory(page, {
      name: categoryName,
      type: 'expense',
    })

    const today = new Date().toISOString().split('T')[0]
    const transaction = await createTransaction(page, {
      date: today,
      description: transactionDesc,
      amount: 100.0,
      type: 'expense',
      categoryId: category.id,
    })

    // Step 2: Navigate to categories page
    await page.goto('/categories')
    await expect(page.getByTestId('categories-grid')).toBeVisible()

    // Step 3: Open delete modal for the category
    const categoryCard = page.locator('[data-testid="category-card"]', {
      hasText: categoryName,
    })
    await expect(categoryCard).toBeVisible()
    await categoryCard.hover()
    await categoryCard.getByTestId('delete-category-btn').click()

    // Step 4: Verify modal opens with warning
    await expect(page.getByTestId('delete-category-modal')).toBeVisible()
    await expect(page.getByTestId('transaction-warning')).toBeVisible()

    // Step 5: Click Confirm delete button
    await page.getByTestId('confirm-delete-btn').click()

    // Step 6: Verify modal closes
    await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

    // Step 7: Verify success toast appears
    const toastSuccess = page.getByTestId('toast-success')
    const toastText = page.getByText(/categoria exclu[ií]da/i)
    const toastAlert = page.locator('[role="alert"]')

    const hasSuccessToast =
      (await toastSuccess.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await toastText.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await toastAlert.isVisible({ timeout: 5000 }).catch(() => false))

    expect(hasSuccessToast).toBeTruthy()

    // Step 8: Verify category is removed from the grid
    await expect(categoryCard).not.toBeVisible()

    // Step 9: Verify via API that category no longer exists
    const categories = await fetchCategories(page)
    const categoryStillExists = categories.some((c) => c.id === category.id)
    expect(categoryStillExists).toBeFalsy()

    // Step 10: Verify transaction still exists but is now uncategorized
    const transactions = await fetchTransactions(page)
    const orphanedTransaction = transactions.find((t) => t.id === transaction.id)
    expect(orphanedTransaction).toBeDefined()
    expect(orphanedTransaction?.category_id ?? null).toBeNull()

    // Cleanup remaining transaction
    await cleanupIsolatedTestData(page, testId)
  })

  test('M3-E2E-04e: Should not show transaction warning for category with zero transactions', async ({
    page,
  }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Category with No Transactions', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Create a category (will have 0 transactions)
      await createCategory(page, {
        name: categoryName,
        type: 'expense',
      })

      // Step 2: Navigate to categories page
      await page.goto('/categories')
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 3: Find our category
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()

      // Step 4: Hover and click delete
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 5: Verify confirmation dialog appears
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('delete-confirmation-text')).toBeVisible()

      // Step 6: Verify NO transaction warning is shown (category has 0 transactions)
      await expect(page.getByTestId('transaction-warning')).not.toBeVisible()

      // Step 7: Close dialog
      await page.getByTestId('cancel-delete-btn').click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-04f: Should show different transaction counts for different categories', async ({
    page,
  }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Create three categories with different transaction counts
      const categoryA = await createCategory(page, {
        name: isolatedName('Cat A - 2 Transactions', testId),
        type: 'expense',
      })
      const categoryB = await createCategory(page, {
        name: isolatedName('Cat B - 5 Transactions', testId),
        type: 'expense',
      })
      const categoryC = await createCategory(page, {
        name: isolatedName('Cat C - 0 Transactions', testId),
        type: 'expense',
      })

      const today = new Date().toISOString().split('T')[0]

      // Step 2: Seed 2 transactions for Category A
      const CATEGORY_A_COUNT = 2
      await seedIsolatedTransactions(page, testId, [
        {
          date: today,
          description: 'A-1',
          amount: 10.0,
          type: 'expense',
          categoryId: categoryA.id,
        },
        {
          date: today,
          description: 'A-2',
          amount: 20.0,
          type: 'expense',
          categoryId: categoryA.id,
        },
      ])

      // Step 3: Seed 5 transactions for Category B
      const CATEGORY_B_COUNT = 5
      await seedIsolatedTransactions(page, testId, [
        {
          date: today,
          description: 'B-1',
          amount: 10.0,
          type: 'expense',
          categoryId: categoryB.id,
        },
        {
          date: today,
          description: 'B-2',
          amount: 20.0,
          type: 'expense',
          categoryId: categoryB.id,
        },
        {
          date: today,
          description: 'B-3',
          amount: 30.0,
          type: 'expense',
          categoryId: categoryB.id,
        },
        {
          date: today,
          description: 'B-4',
          amount: 40.0,
          type: 'expense',
          categoryId: categoryB.id,
        },
        {
          date: today,
          description: 'B-5',
          amount: 50.0,
          type: 'expense',
          categoryId: categoryB.id,
        },
      ])

      // Category C has 0 transactions - nothing to create

      // Step 4: Navigate to categories page
      await page.goto('/categories')
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 5: Test Category A - should show "2 transacoes ficarao sem categoria"
      const cardA = page.locator('[data-testid="category-card"]', {
        hasText: categoryA.name,
      })
      await expect(cardA).toBeVisible()
      await cardA.hover()
      await cardA.getByTestId('delete-category-btn').click()

      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toContainText(
        `${CATEGORY_A_COUNT} transacoes ficarao sem categoria`
      )

      // Close modal before proceeding to next category
      await page.getByTestId('cancel-delete-btn').click()
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

      // Step 6: Test Category B - should show "5 transacoes ficarao sem categoria"
      const cardB = page.locator('[data-testid="category-card"]', {
        hasText: categoryB.name,
      })
      await expect(cardB).toBeVisible()
      await cardB.hover()
      await cardB.getByTestId('delete-category-btn').click()

      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).toContainText(
        `${CATEGORY_B_COUNT} transacoes ficarao sem categoria`
      )

      // Close modal before proceeding to next category
      await page.getByTestId('cancel-delete-btn').click()
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

      // Step 7: Test Category C - should NOT show warning (0 transactions)
      const cardC = page.locator('[data-testid="category-card"]', {
        hasText: categoryC.name,
      })
      await expect(cardC).toBeVisible()
      await cardC.hover()
      await cardC.getByTestId('delete-category-btn').click()

      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByTestId('transaction-warning')).not.toBeVisible()

      // Step 8: Clean up
      await page.getByTestId('cancel-delete-btn').click()
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
