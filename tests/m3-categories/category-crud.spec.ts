import { test, expect } from '@playwright/test'
import {
  createCategory,
  fetchCategories,
  seedIsolatedCategories,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
  TEST_CATEGORIES,
  TestCategory,
} from '../fixtures/test-utils'

/**
 * M3-E2E: Category CRUD Operations
 * Validates complete create, read, update flows for categories:
 * - Full category creation with all fields
 * - Category editing with data persistence
 * - Form validation for name length
 * - Empty state handling
 * - Combined search and filter operations
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 *
 * PARALLEL EXECUTION: Each test uses isolated data with unique testIds
 * to prevent interference between parallel test runs.
 */
test.describe('M3: Category CRUD Operations', () => {
  test('M3-E2E-06a: Should complete full category creation flow', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('E2E Test', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Navigate to categories screen
      await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

      // Step 2: Count initial categories (may include other parallel tests' data)
      const initialCards = page.getByTestId('category-card')
      const initialCount = await initialCards.count()

      // Step 3: Click "Add Category" button
      await page.getByTestId('add-category-btn').click()

      // Step 4: Verify modal opens
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('heading', { name: /new category/i })).toBeVisible()

      // Step 5: Fill in category name with unique identifier
      await page.getByTestId('category-name-input').fill(categoryName)

      // Step 6: Verify form elements have valid values
      await expect(page.getByTestId('category-type-select')).toBeVisible()
      await expect(page.getByTestId('category-icon-picker')).toBeVisible()
      await expect(page.getByTestId('category-color-picker')).toBeVisible()

      // Step 7: Click "Save" button
      await page.getByTestId('save-category-btn').click()

      // Step 8: Verify modal closes (save was successful)
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Step 9: Category MUST appear in list
      const createdCategory = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(createdCategory).toBeVisible()

      // Step 10: Count MUST have increased by at least 1
      const newCount = await page.getByTestId('category-card').count()
      expect(newCount).toBeGreaterThanOrEqual(initialCount + 1)

      // Step 11: API MUST have the category
      const categories = await fetchCategories(page)
      const found = categories.find(c => c.name === categoryName)
      expect(found).toBeDefined()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-06b: Should complete full category edit flow', async ({ page }) => {
    const testId = generateShortId()
    const originalName = isolatedName('Category to Edit', testId)
    const updatedName = isolatedName('Updated Category', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Create a category to edit
    await createCategory(page, { name: originalName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Step 1: Navigate to categories screen
      await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

      // Step 2: Find our specific category card
      const categoryCard = page.getByTestId('category-card').filter({ hasText: originalName })
      await expect(categoryCard).toBeVisible()

      // Step 3: Click on the category card to open edit modal
      await categoryCard.click()

      // Step 4: Verify edit modal opens with pre-populated data
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByTestId('modal-title')).toContainText(/edit category/i)

      // Step 5: Verify name is pre-filled with original name
      const nameInput = page.getByTestId('category-name-input')
      await expect(nameInput).toHaveValue(originalName)

      // Step 6: Change the name
      await nameInput.clear()
      await nameInput.fill(updatedName)

      // Step 7: Click "Save Changes" button
      await page.getByTestId('save-category-btn').click()

      // Step 8: Verify modal closes (save was successful)
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Step 9: Verify new name appears in list
      await expect(page.getByTestId('category-name').filter({ hasText: updatedName })).toBeVisible()

      // Step 10: Verify old name no longer appears
      await expect(page.getByTestId('category-name').filter({ hasText: originalName })).not.toBeVisible()

      // Step 11: Verify API has updated category
      const categories = await fetchCategories(page)
      const updated = categories.find(c => c.name === updatedName)
      expect(updated).toBeDefined()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-06c: Should validate category name minimum length', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Navigate to categories screen
    // Step 2: Open create modal
    await page.getByTestId('add-category-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 3: Enter single character (too short)
    await page.getByTestId('category-name-input').fill('A')

    // Step 4: Try to save
    await page.getByTestId('save-category-btn').click()

    // Step 5: Should show error message
    const errorMessage = page.getByTestId('name-error').or(page.locator('[role="alert"]'))
    await expect(errorMessage.first()).toBeVisible()

    // Step 6: Modal should remain open
    await expect(page.getByRole('dialog')).toBeVisible()

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('M3-E2E-06d: Should handle category name with many characters', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Open create modal
    await page.getByTestId('add-category-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 2: Enter name with 51 characters (over the limit)
    const longName = 'A'.repeat(51)
    await page.getByTestId('category-name-input').fill(longName)

    // Step 3: Try to save
    await page.getByTestId('save-category-btn').click()

    // Step 4: Modal should remain open (validation failed)
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 5: Error message should be shown for exceeding max length
    const errorMessage = page.getByTestId('name-error').or(page.getByTestId('input-error-message'))
    await expect(errorMessage.first()).toBeVisible()
    await expect(errorMessage.first()).toContainText(/too long|muito longo|max|máximo|character|caractere/i)

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
  })

  test('M3-E2E-06e: Should apply combined search and type filter', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test categories for filtering
    await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining, // expense
      TEST_CATEGORIES.salary, // income
      TEST_CATEGORIES.transportation, // expense
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

    const foodName = isolatedName('Food & Dining', testId)
    const salaryName = isolatedName('Salary', testId)

    try {
      // Step 1: Apply type filter for expense
      await page.getByTestId('category-type-filter').click()
      await page.getByRole('option', { name: /expense/i }).click()

      // Step 2: Apply search for "Food"
      await page.getByTestId('category-search').fill('Food')

      // Step 3: Wait for filtering
      await page.waitForTimeout(300)

      // Step 4: Verify only matching results shown
      const visibleCategories = page.getByTestId('category-card')
      const count = await visibleCategories.count()

      // If categories visible, they should match both criteria
      if (count > 0) {
        // Food & Dining should be visible (it's an expense containing "Food")
        await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible()

        // Salary should NOT be visible (it's income, not expense)
        await expect(page.getByRole('heading', { name: salaryName, level: 3 })).not.toBeVisible()
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-06f: Should clear filters and show all categories', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test categories
    const seededCategories = await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
      TEST_CATEGORIES.transportation,
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

    // Wait for categories to load
    await expect(page.getByTestId('categories-grid')).toBeVisible()
    await expect(page.getByTestId('category-card').first()).toBeVisible()

    const foodName = isolatedName('Food & Dining', testId)

    try {
      // Get initial count of OUR categories visible
      const getOurCategoriesCount = async () => {
        let count = 0
        for (const cat of seededCategories) {
          const card = page.getByTestId('category-card').filter({ hasText: cat.name })
          if (await card.isVisible().catch(() => false)) {
            count++
          }
        }
        return count
      }

      const initialOurCount = await getOurCategoriesCount()
      expect(initialOurCount).toBe(3) // We seeded 3 categories

      // Step 1: Apply type filter
      await page.getByTestId('category-type-filter').click()
      await page.getByRole('option', { name: /expense/i }).click()

      // Step 2: Apply search
      await page.getByTestId('category-search').fill('Food')

      // Step 3: Wait for filtering
      await page.waitForTimeout(300)

      // Step 4: Our Food category should be visible
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible()

      // Step 5: Clear search
      await page.getByTestId('category-search').clear()

      // Step 6: Reset type filter to "All"
      await page.getByTestId('category-type-filter').click()
      await page.getByRole('option', { name: /all|todos/i }).click()

      // Step 7: Wait for reset
      await page.waitForTimeout(300)

      // Step 8: Verify all our categories are shown again
      const restoredOurCount = await getOurCategoriesCount()
      expect(restoredOurCount).toBe(initialOurCount)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-06g: Should cancel category creation without saving', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Cancelled Category', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Step 1: Open create modal
      await page.getByTestId('add-category-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Step 2: Fill in some data
      await page.getByTestId('category-name-input').fill(categoryName)

      // Step 3: Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Step 4: Verify modal closes
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Step 5: Verify category was NOT created
      await expect(page.getByText(categoryName)).not.toBeVisible()

      // Verify via API
      const categories = await fetchCategories(page)
      const found = categories.find(c => c.name === categoryName)
      expect(found).toBeUndefined()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-06h: Should close modal by clicking outside (backdrop)', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Open create modal
    await page.getByTestId('add-category-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 2: Click outside the modal (on backdrop)
    await page.mouse.click(10, 10)

    // Step 3: Verify modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('M3-E2E-06i: Should close modal by pressing Escape key', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 1: Open create modal
    await page.getByTestId('add-category-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 2: Press Escape key
    await page.keyboard.press('Escape')

    // Step 3: Verify modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
