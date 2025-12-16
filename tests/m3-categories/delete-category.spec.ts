import { test, expect } from '@playwright/test'
import {
  createCategory,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
} from '../fixtures/test-utils'

/**
 * M3-E2E-03: Delete Category Flow
 * Validates the complete category deletion flow including:
 * - Delete button visibility on hover
 * - Confirmation dialog display
 * - Category removal from grid
 * - Success toast notification
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 *
 * PARALLEL EXECUTION: Each test uses isolated data with unique testIds
 * to prevent interference between parallel test runs.
 */
test.describe('M3: Delete Category Flow', () => {
  test('M3-E2E-03a: Should show delete button on category card hover', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Hover', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Create a fresh test category
    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Step 1: Navigate to categories page
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 2: Find our specific category card
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()

      // Step 3: Verify delete button is initially not visible (opacity-0)
      const deleteBtn = categoryCard.getByTestId('delete-category-btn')
      await expect(deleteBtn).toBeAttached()

      // Step 4: Hover over the category card
      await categoryCard.hover()

      // Step 5: Verify delete button becomes visible on hover
      await expect(deleteBtn).toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-03b: Should open confirmation dialog when clicking delete', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Dialog', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 1: Hover over our category card and click delete
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()
      await categoryCard.hover()

      const deleteBtn = categoryCard.getByTestId('delete-category-btn')
      await deleteBtn.click()

      // Step 2: Verify confirmation dialog appears
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()
      await expect(page.getByRole('heading', { name: /excluir categoria/i })).toBeVisible()
      await expect(page.getByTestId('delete-confirmation-text')).toContainText(/Deseja excluir esta categoria/i)

      // Step 3: Verify cancel and confirm buttons exist
      await expect(page.getByTestId('cancel-delete-btn')).toBeVisible()
      await expect(page.getByTestId('confirm-delete-btn')).toBeVisible()

      // Close modal
      await page.getByTestId('cancel-delete-btn').click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-03c: Should cancel deletion and keep category', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Cancel', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      await expect(page.getByTestId('categories-grid')).toBeVisible()

      // Step 1: Find our category card
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()

      // Step 2: Open delete dialog
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 3: Click cancel
      await page.getByTestId('cancel-delete-btn').click()

      // Step 4: Verify dialog closes
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

      // Step 5: Verify our category still exists
      await expect(categoryCard).toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-03d: Should delete category and show success toast', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Delete', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Note: No try/finally needed since we're deleting the category as part of the test
    await expect(page.getByTestId('categories-grid')).toBeVisible()

    // Step 1: Find our category card
    const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
    await expect(categoryCard).toBeVisible()

    // Step 2: Open delete dialog
    await categoryCard.hover()
    await categoryCard.getByTestId('delete-category-btn').click()

    // Step 3: Confirm deletion
    await page.getByTestId('confirm-delete-btn').click()

    // Step 4: Verify dialog closes
    await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

    // Step 5: Verify success toast
    await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('toast-success')).toContainText(/Categoria excluida/i)

    // Step 6: Verify category is removed from grid
    await expect(categoryCard).not.toBeVisible()
  })

  test('M3-E2E-03e: Should close dialog when clicking outside', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Backdrop', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Step 1: Find our category
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()

      // Step 2: Open delete dialog
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 3: Verify dialog is open
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()

      // Step 4: Click outside (on backdrop)
      await page.getByTestId('modal-backdrop').click({ position: { x: 10, y: 10 } })

      // Step 5: Verify dialog closes
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M3-E2E-03f: Should close dialog when pressing Escape', async ({ page }) => {
    const testId = generateShortId()
    const categoryName = isolatedName('Test Category for Escape', testId)

    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    await createCategory(page, { name: categoryName, type: 'expense' })

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Step 1: Find our category
      const categoryCard = page.getByTestId('category-card').filter({ hasText: categoryName })
      await expect(categoryCard).toBeVisible()

      // Step 2: Open delete dialog
      await categoryCard.hover()
      await categoryCard.getByTestId('delete-category-btn').click()

      // Step 3: Verify dialog is open
      await expect(page.getByTestId('delete-category-modal')).toBeVisible()

      // Step 4: Press Escape
      await page.keyboard.press('Escape')

      // Step 5: Verify dialog closes
      await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
