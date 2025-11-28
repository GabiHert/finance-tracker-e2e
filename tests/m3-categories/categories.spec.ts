import { test, expect } from '@playwright/test'

/**
 * M3-E2E: Category Management
 * Validates the categories UI. Note: The frontend categories feature currently uses
 * mock data and is not fully integrated with the backend API yet.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M3: Category Management', () => {
  // No login needed - auth state is pre-populated by auth-setup project

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

    // Initially multiple categories visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Transportation', level: 3 })).toBeVisible()

    // Search for "Food"
    const searchInput = page.getByTestId('category-search')
    await searchInput.fill('Food')

    // Only Food & Dining should be visible
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Transportation', level: 3 })).not.toBeVisible()

    // Clear search and search for something else
    await searchInput.fill('Salary')

    await expect(page.getByRole('heading', { name: 'Salary', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).not.toBeVisible()
  })

  test('M3-E2E-005: Should click on category card to open edit modal', async ({ page }) => {
    await page.goto('/categories')

    // Click on a category card
    await page.getByRole('button', { name: /food & dining/i }).click()

    // Modal should open with edit mode
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /edit category/i })).toBeVisible()

    // Name should be pre-filled
    await expect(page.getByTestId('category-name-input')).toHaveValue('Food & Dining')

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
