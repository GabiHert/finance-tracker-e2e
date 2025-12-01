import { test, expect } from '@playwright/test'
import {
  seedTestCategories,
  deleteAllCategories,
  TEST_CATEGORIES,
  TestCategory,
} from '../fixtures/test-utils'

/**
 * M3-E2E: Category Management
 * Validates the categories UI with real backend API integration.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M3: Category Management', () => {
  let seededCategories: TestCategory[] = []

  test.beforeAll(async ({ browser }) => {
    // Create a page to seed test data
    const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
    const page = await context.newPage()

    // Navigate to app to ensure localStorage is accessible
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Clean up any existing categories and seed fresh test data
    await deleteAllCategories(page)
    seededCategories = await seedTestCategories(page, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
      TEST_CATEGORIES.transportation,
    ])

    await context.close()
  })

  test.afterAll(async ({ browser }) => {
    // Clean up seeded categories after all tests
    const context = await browser.newContext({ storageState: 'tests/fixtures/.auth/user.json' })
    const page = await context.newPage()
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')
    await deleteAllCategories(page)
    await context.close()
  })

  test('M3-E2E-001: Should display categories page with existing categories', async ({ page }) => {
    await page.goto('/categories')

    // Verify categories page is displayed
    await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

    // Verify the add button exists
    await expect(page.getByTestId('add-category-btn')).toBeVisible()

    // Verify search and filter controls exist
    await expect(page.getByTestId('category-search')).toBeVisible()
    await expect(page.getByTestId('category-type-filter')).toBeVisible()

    // Verify categories grid shows default categories (mock data)
    await expect(page.getByTestId('categories-grid')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).toBeVisible()
  })

  test('M3-E2E-002: Should open category creation modal and validate form', async ({ page }) => {
    await page.goto('/categories')

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

    // Fill the form
    const categoryName = `E2E Category ${Date.now()}`
    await page.getByTestId('category-name-input').fill(categoryName)

    // Verify cancel closes the modal
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('M3-E2E-003: Should filter categories by type', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    // Initially all categories should be visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).toBeVisible()

    // Filter by expense type
    await page.getByTestId('category-type-filter').click()
    await page.getByRole('option', { name: /expense/i }).click()

    // Expense categories should be visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    // Income category should not be visible
    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).not.toBeVisible()

    // Filter by income type
    await page.getByTestId('category-type-filter').click()
    await page.getByRole('option', { name: /income/i }).click()

    // Income categories should be visible
    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).toBeVisible()
    // Expense category should not be visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).not.toBeVisible()
  })

  test('M3-E2E-004: Should search categories by name', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    // Wait for categories to be fully loaded - check for specific categories with timeout
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Transportation', level: 3 })).toBeVisible({ timeout: 10000 })

    // Search for "Food"
    const searchInput = page.getByTestId('category-search')
    await searchInput.fill('Food')

    // Wait for search filter to apply
    await page.waitForTimeout(500)

    // Only Food & Dining should be visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Transportation', level: 3 })).not.toBeVisible({ timeout: 5000 })

    // Clear search and search for something else
    await searchInput.fill('Salary')

    // Wait for search filter to apply
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).not.toBeVisible({ timeout: 5000 })
  })

  test('M3-E2E-005: Should click on category card to open edit modal', async ({ page }) => {
    await page.goto('/categories')

    // Click on a category card using the test-id (consistent with M3-E2E-06b)
    const categoryCard = page.getByTestId('category-card').first()
    await expect(categoryCard).toBeVisible()
    await categoryCard.click()

    // Modal should open with edit mode
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /edit category/i })).toBeVisible()

    // Name input should be pre-filled with something
    await expect(page.getByTestId('category-name-input')).toBeVisible()

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
