import { test, expect } from '@playwright/test'
import {
  seedIsolatedCategories,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
  TEST_CATEGORIES,
  TestCategory,
  createCategory,
} from '../fixtures/test-utils'

/**
 * M3-E2E: Category Management
 * Validates the categories UI with real backend API integration.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 *
 * PARALLEL EXECUTION: Each test uses isolated data with unique testIds
 * to prevent interference between parallel test runs.
 */
test.describe('M3: Category Management', () => {
  test('M3-E2E-001: Should display categories page with existing categories', async ({ page }) => {
    const testId = generateShortId()

    // Navigate first to establish auth context
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
      TEST_CATEGORIES.transportation,
    ])

    // Reload to pick up seeded data
    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Verify categories page is displayed
      await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

      // Verify the add button exists
      await expect(page.getByTestId('add-category-btn')).toBeVisible()

      // Verify search and filter controls exist
      await expect(page.getByTestId('category-search')).toBeVisible()
      await expect(page.getByTestId('category-type-filter')).toBeVisible()

      // Verify categories grid shows our seeded categories
      await expect(page.getByTestId('categories-grid')).toBeVisible()
      await expect(page.getByRole('heading', { name: isolatedName('Food & Dining', testId), level: 3 })).toBeVisible()
      await expect(page.getByRole('heading', { name: isolatedName('Salary', testId), level: 3 })).toBeVisible()
    } finally {
      // Cleanup only our test data
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-002: Should open category creation modal and validate form', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    try {
      // Click add category button
      await page.getByTestId('add-category-btn').click()

      // Wait for modal to appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('heading', { name: /new category/i })).toBeVisible()

      // Verify form elements exist
      await expect(page.getByTestId('category-name-input')).toBeVisible()
      await expect(page.getByTestId('category-type-select')).toBeVisible()
      await expect(page.getByTestId('category-icon-picker')).toBeVisible()
      await expect(page.getByTestId('category-color-picker')).toBeVisible()
      await expect(page.getByTestId('save-category-btn')).toBeVisible()

      // Fill the form with isolated name
      const categoryName = isolatedName('E2E Category', testId)
      await page.getByTestId('category-name-input').fill(categoryName)

      // Verify cancel closes the modal
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    } finally {
      // Cleanup any data that might have been created
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-003: Should filter categories by type', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data with both expense and income categories
    await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining, // expense
      TEST_CATEGORIES.salary, // income
      TEST_CATEGORIES.transportation, // expense
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    const foodName = isolatedName('Food & Dining', testId)
    const salaryName = isolatedName('Salary', testId)

    try {
      // Initially all categories should be visible
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible()
      await expect(page.getByRole('heading', { name: salaryName, level: 3 })).toBeVisible()

      // Filter by expense type
      await page.getByTestId('category-type-filter').click()
      await page.getByRole('option', { name: /expense/i }).click()

      // Expense categories should be visible
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible()
      // Income category should not be visible
      await expect(page.getByRole('heading', { name: salaryName, level: 3 })).not.toBeVisible()

      // Filter by income type
      await page.getByTestId('category-type-filter').click()
      await page.getByRole('option', { name: /income/i }).click()

      // Income categories should be visible
      await expect(page.getByRole('heading', { name: salaryName, level: 3 })).toBeVisible()
      // Expense category should not be visible
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-004: Should search categories by name', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
      TEST_CATEGORIES.transportation,
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    const foodName = isolatedName('Food & Dining', testId)
    const transportName = isolatedName('Transportation', testId)
    const salaryName = isolatedName('Salary', testId)

    try {
      // Wait for categories to be fully loaded
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('heading', { name: transportName, level: 3 })).toBeVisible({ timeout: 10000 })

      // Search for "Food" - should find our isolated category
      const searchInput = page.getByTestId('category-search')
      await searchInput.fill('Food')

      // Wait for search filter to apply
      await page.waitForTimeout(500)

      // Only Food & Dining should be visible
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).toBeVisible()
      await expect(page.getByRole('heading', { name: transportName, level: 3 })).not.toBeVisible({ timeout: 5000 })

      // Clear search and search for something else
      await searchInput.fill('Salary')

      // Wait for search filter to apply
      await page.waitForTimeout(500)

      await expect(page.getByRole('heading', { name: salaryName, level: 3 })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: foodName, level: 3 })).not.toBeVisible({ timeout: 5000 })
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-005: Should click on category card to open edit modal', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Create an isolated category for this test
    const categoryName = isolatedName('Test Edit Category', testId)
    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Find our specific category card
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()
      await categoryCard.click()

      // Modal should open with edit mode
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByTestId('modal-title')).toContainText(/edit category/i)

      // Name input should be pre-filled with our category name
      await expect(page.getByTestId('category-name-input')).toHaveValue(categoryName)

      // Close modal
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
