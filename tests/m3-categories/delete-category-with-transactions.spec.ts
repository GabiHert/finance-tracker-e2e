import { test, expect } from '@playwright/test'
import {
  createCategory,
  createTransaction,
  deleteAllCategories,
  deleteAllTransactions,
  fetchCategories,
  fetchTransactions,
  seedTestTransactions,
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
 * Test Dependencies:
 * - Transaction API must return transaction_count in category response
 * - Frontend must correctly render the transaction warning based on count
 * - Toast notification system must be operational
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Delete Category with Transactions', () => {
  /**
   * Test setup: Establishes authentication context and ensures clean state
   * by removing all existing transactions and categories before each test.
   *
   * Cleanup order matters: transactions must be deleted before categories
   * due to foreign key constraints.
   */
  test.beforeEach(async ({ page }) => {
    // Navigate first to establish auth context from saved storage state
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Clean up existing data in dependency order
    await deleteAllTransactions(page)
    await deleteAllCategories(page)
  })

  /**
   * M3-E2E-04a: Should show transaction warning when deleting category with transactions
   *
   * Scenario: User attempts to delete a category that has linked transactions
   * Expected: The delete confirmation modal displays a warning message indicating
   *           that transactions will become uncategorized
   *
   * This test validates that:
   * 1. The system correctly identifies categories with associated transactions
   * 2. The warning element (transaction-warning) is rendered when appropriate
   * 3. Users are informed about the impact of deletion before confirming
   */
  test('M3-E2E-04a: Should show transaction warning when deleting category with transactions', async ({
    page,
  }) => {
    // Step 1: Create a test category via API
    const category = await createCategory(page, {
      name: 'Category With Transactions',
      type: 'expense',
    })

    // Step 2: Create a transaction linked to this category
    const today = new Date().toISOString().split('T')[0]
    await createTransaction(page, {
      date: today,
      description: 'Test Transaction for Warning Display',
      amount: 50.0,
      type: 'expense',
      categoryId: category.id,
    })

    // Step 3: Navigate to categories page and wait for grid to render
    await page.goto('/categories')
    await expect(page.getByTestId('categories-grid')).toBeVisible()

    // Step 4: Locate the specific category card by name
    const categoryCard = page.locator('[data-testid="category-card"]', {
      hasText: category.name,
    })
    await expect(categoryCard).toBeVisible()

    // Step 5: Trigger delete action - hover to reveal delete button, then click
    await categoryCard.hover()
    await categoryCard.getByTestId('delete-category-btn').click()

    // Step 6: Verify delete confirmation modal appears
    await expect(page.getByTestId('delete-category-modal')).toBeVisible()

    // Step 7: Assert that the transaction warning IS visible
    // This is the key assertion - categories with transactions must show this warning
    await expect(page.getByTestId('transaction-warning')).toBeVisible()

    // Step 8: Clean up by closing the modal
    await page.getByTestId('cancel-delete-btn').click()
    await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
  })

  /**
   * M3-E2E-04b: Should show specific transaction count in warning
   *
   * Scenario: User attempts to delete a category with exactly 3 transactions
   * Expected: The warning message displays the exact count "3 transacoes ficarao sem categoria"
   *
   * This test validates that:
   * 1. The backend accurately counts transactions per category
   * 2. The frontend displays the exact count from the API response
   * 3. The warning message format matches the expected Portuguese text
   */
  test('M3-E2E-04b: Should show specific transaction count in warning', async ({
    page,
  }) => {
    // Step 1: Create a test category
    const category = await createCategory(page, {
      name: 'Category With Specific Count',
      type: 'expense',
    })

    // Step 2: Create exactly 3 transactions to verify precise count display
    const today = new Date().toISOString().split('T')[0]
    const EXPECTED_TRANSACTION_COUNT = 3

    await seedTestTransactions(page, [
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
      hasText: category.name,
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
  })

  /**
   * M3-E2E-04c: Should cancel deletion and keep category with transactions
   *
   * Scenario: User opens delete modal for category with transactions, then clicks Cancel
   * Expected: Modal closes, category remains in grid, all transactions remain linked
   *
   * This test validates that:
   * 1. Cancel action does NOT trigger any delete API call
   * 2. Frontend state is properly reset after cancellation
   * 3. Category count in the grid remains unchanged
   * 4. Category still exists via API verification
   */
  test('M3-E2E-04c: Should cancel deletion and keep category with transactions', async ({
    page,
  }) => {
    // Step 1: Create a category with linked transactions
    const category = await createCategory(page, {
      name: 'Category To Cancel Delete',
      type: 'expense',
    })

    const today = new Date().toISOString().split('T')[0]
    const TRANSACTION_COUNT = 2

    await seedTestTransactions(page, [
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

    // Step 3: Record initial category count for later comparison
    const initialCategoryCount = await page.getByTestId('category-card').count()

    // Step 4: Open delete modal for the target category
    const categoryCard = page.locator('[data-testid="category-card"]', {
      hasText: category.name,
    })
    await expect(categoryCard).toBeVisible()
    await categoryCard.hover()
    await categoryCard.getByTestId('delete-category-btn').click()

    // Step 5: Verify modal opens with transaction warning
    await expect(page.getByTestId('delete-category-modal')).toBeVisible()
    await expect(page.getByTestId('transaction-warning')).toBeVisible()
    await expect(page.getByTestId('transaction-warning')).toContainText(
      `${TRANSACTION_COUNT} transacoes ficarao sem categoria`
    )

    // Step 6: Click Cancel button
    await page.getByTestId('cancel-delete-btn').click()

    // Step 7: Verify modal closes properly
    await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

    // Step 8: Verify category still exists in the grid
    await expect(categoryCard).toBeVisible()

    // Step 9: Verify category count is unchanged
    const finalCategoryCount = await page.getByTestId('category-card').count()
    expect(finalCategoryCount).toBe(initialCategoryCount)

    // Step 10: Verify via API that category still exists
    const categories = await fetchCategories(page)
    const categoryStillExists = categories.some((c) => c.id === category.id)
    expect(categoryStillExists).toBeTruthy()

    // Step 11: Verify transactions are still linked to the category
    const transactions = await fetchTransactions(page)
    const linkedTransactions = transactions.filter(
      (t) => t.category_id === category.id
    )
    expect(linkedTransactions.length).toBe(TRANSACTION_COUNT)
  })

  /**
   * M3-E2E-04d: Should delete category with transactions and show success toast
   *
   * Scenario: User confirms deletion of a category that has linked transactions
   * Expected: Category is deleted, success toast appears, transactions become uncategorized
   *
   * This test validates:
   * 1. Delete API successfully removes categories with associated transactions
   * 2. Success toast notification is displayed
   * 3. Category is removed from the UI grid
   * 4. Transactions are NOT deleted (orphaned/uncategorized instead)
   */
  test('M3-E2E-04d: Should delete category with transactions and show success toast', async ({
    page,
  }) => {
    // Step 1: Create a category with a linked transaction
    const category = await createCategory(page, {
      name: 'Category To Delete With Toast',
      type: 'expense',
    })

    const today = new Date().toISOString().split('T')[0]
    const transaction = await createTransaction(page, {
      date: today,
      description: 'Transaction To Be Orphaned',
      amount: 100.0,
      type: 'expense',
      categoryId: category.id,
    })

    // Step 2: Navigate to categories page
    await page.goto('/categories')
    await expect(page.getByTestId('categories-grid')).toBeVisible()

    // Step 3: Record initial category count
    const initialCount = await page.getByTestId('category-card').count()

    // Step 4: Open delete modal for the category
    const categoryCard = page.locator('[data-testid="category-card"]', {
      hasText: category.name,
    })
    await expect(categoryCard).toBeVisible()
    await categoryCard.hover()
    await categoryCard.getByTestId('delete-category-btn').click()

    // Step 5: Verify modal opens with warning
    await expect(page.getByTestId('delete-category-modal')).toBeVisible()
    await expect(page.getByTestId('transaction-warning')).toBeVisible()

    // Step 6: Click Confirm delete button
    await page.getByTestId('confirm-delete-btn').click()

    // Step 7: Verify modal closes
    await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

    // Step 8: Verify success toast appears
    // Using multiple selector strategies for robustness
    const toastSuccess = page.getByTestId('toast-success')
    const toastText = page.getByText(/categoria exclu[ií]da/i)
    const toastAlert = page.locator('[role="alert"]')

    const hasSuccessToast =
      (await toastSuccess.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await toastText.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await toastAlert.isVisible({ timeout: 5000 }).catch(() => false))

    expect(hasSuccessToast).toBeTruthy()

    // Step 9: Verify category is removed from the grid
    await expect(categoryCard).not.toBeVisible()

    // Step 10: Verify category count decreased by 1
    const finalCount = await page.getByTestId('category-card').count()
    expect(finalCount).toBe(initialCount - 1)

    // Step 11: Verify via API that category no longer exists
    const categories = await fetchCategories(page)
    const categoryStillExists = categories.some((c) => c.id === category.id)
    expect(categoryStillExists).toBeFalsy()

    // Step 12: Verify transaction still exists but is now uncategorized
    const transactions = await fetchTransactions(page)
    const orphanedTransaction = transactions.find((t) => t.id === transaction.id)
    expect(orphanedTransaction).toBeDefined()
    // category_id should be null or undefined (backend may omit null fields)
    expect(orphanedTransaction?.category_id ?? null).toBeNull()
  })

  /**
   * M3-E2E-04e: Should not show transaction warning for category with zero transactions
   *
   * Scenario: User attempts to delete a category that has no linked transactions
   * Expected: Delete confirmation modal appears WITHOUT the transaction warning
   *
   * This test validates:
   * 1. Categories with zero transactions do NOT show the warning element
   * 2. The conditional rendering logic correctly evaluates transactionCount === 0
   */
  test('M3-E2E-04e: Should not show transaction warning for category with zero transactions', async ({
    page,
  }) => {
    // Step 1: Create a category (will have 0 transactions)
    await createCategory(page, {
      name: 'Category with No Transactions',
      type: 'expense',
    })

    // Step 2: Navigate to categories page
    await page.goto('/categories')
    await expect(page.getByTestId('categories-grid')).toBeVisible()

    // Step 3: Find and hover over the category
    const categoryCard = page.getByTestId('category-card').first()
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
  })

  /**
   * M3-E2E-04f: Should show different transaction counts for different categories
   *
   * Scenario: Multiple categories exist with varying transaction counts (2, 5, 0)
   * Expected: Each category's delete modal shows its respective count or no warning
   *
   * This test validates:
   * 1. Transaction counts are accurately tracked per category
   * 2. The system correctly distinguishes between categories
   * 3. Warning appears only for categories with transactions > 0
   * 4. Each warning shows the correct count for that specific category
   */
  test('M3-E2E-04f: Should show different transaction counts for different categories', async ({
    page,
  }) => {
    // Step 1: Create three categories with different transaction counts
    const categoryA = await createCategory(page, {
      name: 'Cat A - 2 Transactions',
      type: 'expense',
    })
    const categoryB = await createCategory(page, {
      name: 'Cat B - 5 Transactions',
      type: 'expense',
    })
    const categoryC = await createCategory(page, {
      name: 'Cat C - 0 Transactions',
      type: 'expense',
    })

    const today = new Date().toISOString().split('T')[0]

    // Step 2: Seed 2 transactions for Category A
    const CATEGORY_A_COUNT = 2
    await seedTestTransactions(page, [
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
    await seedTestTransactions(page, [
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
  })
})
