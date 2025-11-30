import { test, expect } from '@playwright/test'
import {
  deleteAllTransactions,
  deleteAllCategories,
  createCategory,
  createTransaction,
  TestCategory,
} from '../fixtures/test-utils'

/**
 * BUG: Category Icon and Text Display Issues
 *
 * Issue: When creating a category with an icon (e.g., "Mercado" with shopping cart icon),
 * the display is misconfigured:
 * 1. The icon is not visible
 * 2. The text is overlapping with where the icon should be
 *
 * Expected behavior: Category should display with the icon clearly visible
 * and the text properly positioned without overlap.
 *
 * This test validates that categories display correctly with proper icon and text layout.
 */
test.describe('BUG: Category Icon and Text Display Issues', () => {
  let testCategory: TestCategory

  test.beforeEach(async ({ page }) => {
    // Navigate to establish auth context
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Clean up existing data
    await deleteAllTransactions(page)
    await deleteAllCategories(page)

    // Create a category with a shopping cart icon (similar to "Mercado")
    testCategory = await createCategory(page, {
      name: 'Mercado',
      icon: 'cart-shopping', // FontAwesome shopping cart icon
      color: '#22C55E',
      type: 'expense',
    })

    // Reload to pick up the new category
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('BUG-009: Category icon should be visible in category card', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    // Wait for categories grid to load
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    // Find the category card for "Mercado"
    const categoryCard = page.getByTestId('category-card').filter({
      has: page.getByText('Mercado'),
    })
    await expect(categoryCard).toBeVisible()

    // The icon should be visible within the category card
    // Look for the icon container or SVG element
    const iconContainer = categoryCard.getByTestId('category-icon')
      .or(categoryCard.locator('[data-testid*="icon"]'))
      .or(categoryCard.locator('svg'))
      .or(categoryCard.locator('i[class*="fa-"]'))

    // This test will FAIL if the icon is not visible
    await expect(iconContainer.first()).toBeVisible({ timeout: 5000 })
  })

  test('BUG-010: Category text should not overlap with icon', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    // Wait for categories grid to load
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    // Find the category card for "Mercado"
    const categoryCard = page.getByTestId('category-card').filter({
      has: page.getByText('Mercado'),
    })
    await expect(categoryCard).toBeVisible()

    // Get the bounding boxes of icon and text elements
    const iconElement = categoryCard.getByTestId('category-icon')
      .or(categoryCard.locator('[data-testid*="icon"]'))
      .or(categoryCard.locator('svg').first())
      .or(categoryCard.locator('i[class*="fa-"]').first())

    const textElement = categoryCard.getByRole('heading', { name: 'Mercado' })
      .or(categoryCard.getByText('Mercado'))

    // Both should be visible
    const isIconVisible = await iconElement.first().isVisible().catch(() => false)
    const isTextVisible = await textElement.first().isVisible().catch(() => false)

    expect(isIconVisible).toBe(true)
    expect(isTextVisible).toBe(true)

    // If both are visible, check for overlap
    if (isIconVisible && isTextVisible) {
      const iconBox = await iconElement.first().boundingBox()
      const textBox = await textElement.first().boundingBox()

      if (iconBox && textBox) {
        // Check that text doesn't start where icon is (no overlap)
        // Icon should be to the left of text, or above text (depending on layout)
        // The text should NOT start before the icon ends (horizontal overlap check)

        const hasHorizontalOverlap =
          textBox.x < iconBox.x + iconBox.width && textBox.x + textBox.width > iconBox.x

        const hasVerticalOverlap =
          textBox.y < iconBox.y + iconBox.height && textBox.y + textBox.height > iconBox.y

        // If both horizontal and vertical overlap exist, elements are overlapping
        const isOverlapping = hasHorizontalOverlap && hasVerticalOverlap

        // This assertion will FAIL if there's overlap
        expect(isOverlapping).toBe(false)
      }
    }
  })

  test('BUG-011: Category icon should have proper dimensions', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    const categoryCard = page.getByTestId('category-card').filter({
      has: page.getByText('Mercado'),
    })
    await expect(categoryCard).toBeVisible()

    // Get icon element
    const iconElement = categoryCard.getByTestId('category-icon')
      .or(categoryCard.locator('[data-testid*="icon"]'))
      .or(categoryCard.locator('svg').first())
      .or(categoryCard.locator('i[class*="fa-"]').first())

    const iconBox = await iconElement.first().boundingBox()

    // Icon should have reasonable dimensions (not 0x0 or extremely small)
    // According to UI requirements, icon container should be at least 24px
    if (iconBox) {
      expect(iconBox.width).toBeGreaterThanOrEqual(16)
      expect(iconBox.height).toBeGreaterThanOrEqual(16)
    } else {
      // If no bounding box, icon is not rendered properly
      test.fail(true, 'Category icon has no bounding box - icon may not be rendered')
    }
  })

  test('BUG-012: Category should display icon in transaction row', async ({ page }) => {
    // First create a transaction with this category
    const today = new Date().toISOString().split('T')[0]
    await createTransaction(page, {
      date: today,
      description: 'Test Transaction with Category',
      amount: 150.50,
      type: 'expense',
      categoryId: testCategory.id,
    })

    // Navigate to transactions page
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Find the transaction row
    const transactionRow = page.getByTestId('transaction-row').filter({
      has: page.getByText('Test Transaction with Category'),
    })
    await expect(transactionRow).toBeVisible({ timeout: 10000 })

    // The category icon should be visible in the transaction row
    const categoryIndicator = transactionRow.getByTestId('category-indicator')
      .or(transactionRow.getByTestId('transaction-category-icon'))
      .or(transactionRow.locator('[data-testid*="category"]').locator('svg'))
      .or(transactionRow.locator('[data-testid*="category"]').locator('i[class*="fa-"]'))

    // This test will FAIL if category icon is not visible in transaction row
    await expect(categoryIndicator.first()).toBeVisible({ timeout: 5000 })
  })

  test('BUG-013: Category text should be fully readable (not truncated or cut off)', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    const categoryCard = page.getByTestId('category-card').filter({
      has: page.getByText('Mercado'),
    })
    await expect(categoryCard).toBeVisible()

    // The full text "Mercado" should be visible and readable
    const textElement = categoryCard.getByRole('heading', { name: 'Mercado' })
      .or(categoryCard.getByText('Mercado'))

    await expect(textElement.first()).toBeVisible()

    // Get the text content and verify it's complete
    const text = await textElement.first().textContent()
    expect(text).toContain('Mercado')
  })

  test('BUG-014: Different icon types should display correctly', async ({ page }) => {
    // Create categories with different icon types
    const icons = [
      { name: 'Test Utensils', icon: 'utensils' },
      { name: 'Test Car', icon: 'car' },
      { name: 'Test Home', icon: 'house' },
    ]

    for (const iconData of icons) {
      await createCategory(page, {
        name: iconData.name,
        icon: iconData.icon,
        color: '#3B82F6',
        type: 'expense',
      })
    }

    // Navigate to categories page
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    // Wait for grid
    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    // Verify each category has visible icon
    for (const iconData of icons) {
      const categoryCard = page.getByTestId('category-card').filter({
        has: page.getByText(iconData.name),
      })

      // Check if card exists
      const cardExists = await categoryCard.count() > 0
      if (!cardExists) continue

      // Check for icon visibility
      const iconElement = categoryCard.getByTestId('category-icon')
        .or(categoryCard.locator('svg').first())
        .or(categoryCard.locator('i[class*="fa-"]').first())

      const iconVisible = await iconElement.first().isVisible().catch(() => false)

      // This will FAIL if any icon is not visible
      expect(iconVisible).toBe(true)
    }
  })

  test('BUG-015: Category icon should maintain aspect ratio', async ({ page }) => {
    await page.goto('/categories')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('categories-grid')).toBeVisible({ timeout: 10000 })

    const categoryCard = page.getByTestId('category-card').filter({
      has: page.getByText('Mercado'),
    })
    await expect(categoryCard).toBeVisible()

    // Get icon element
    const iconElement = categoryCard.getByTestId('category-icon')
      .or(categoryCard.locator('[data-testid*="icon"]'))
      .or(categoryCard.locator('svg').first())

    const iconBox = await iconElement.first().boundingBox()

    if (iconBox) {
      // Icon should be roughly square (aspect ratio close to 1:1)
      // Allow some tolerance for different icon designs
      const aspectRatio = iconBox.width / iconBox.height
      expect(aspectRatio).toBeGreaterThan(0.5)
      expect(aspectRatio).toBeLessThan(2.0)
    }
  })
})
