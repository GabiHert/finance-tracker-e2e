import { test, expect } from '@playwright/test'
import {
  generateShortId,
  seedIsolatedCategories,
  seedIsolatedGoals,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
} from '../fixtures/test-utils'

/**
 * M7-E2E-06: Goal Progress Updates
 * Validates goal progress display and visual indicators:
 * - Progress percentage calculation
 * - Visual indicators for different progress levels
 * - Over-limit warning with red color and animation
 * - Green color for under-limit goals
 *
 * Tests use isolated test data for parallel execution.
 * Each test creates its own categories, goals, and transactions.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M7: Goal Progress Updates', () => {
  test('M7-E2E-06a: Should display goal with correct progress percentage', async ({ page }) => {
    const testId = generateShortId()

    try {
      // Navigate to page first to establish auth context
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Food', icon: 'utensils', color: '#EF4444', type: 'expense' }
      ])

      // Create goal with $2,000 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Food', limitAmount: 2000 }
      ])

      // Create transactions totaling $1,500 (75% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Grocery Shopping',
          amount: 800,
          type: 'expense',
          categoryId: categories[0].id,
        },
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Restaurant',
          amount: 700,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page to see updated goal
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Find goal card
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()

      // Verify progress percentage is displayed (75%)
      const progressPercent = goalCard.getByTestId('goal-progress-percent')
      await expect(progressPercent).toBeVisible()
      await expect(progressPercent).toContainText('75%')

      // Verify current amount is $1,500
      const currentAmount = goalCard.getByTestId('goal-current')
      await expect(currentAmount).toContainText(/1[.,]500/)

      // Verify limit amount is $2,000
      const limitAmount = goalCard.getByTestId('goal-limit')
      await expect(limitAmount).toContainText(/2[.,]000/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06b: Should display under-limit goal with green progress indicator', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Transport', icon: 'car', color: '#F59E0B', type: 'expense' }
      ])

      // Create goal with $800 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Transport', limitAmount: 800 }
      ])

      // Create transactions totaling $450 (56% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Gas',
          amount: 250,
          type: 'expense',
          categoryId: categories[0].id,
        },
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Parking',
          amount: 200,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Find goal card
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()

      // Verify it's under the limit (56%)
      const progressPercent = goalCard.getByTestId('goal-progress-percent')
      await expect(progressPercent).toBeVisible()
      await expect(progressPercent).toContainText('56%')

      // Verify the progress is displayed in green (not red)
      await expect(progressPercent).toHaveClass(/text-green/)

      // Verify the card does NOT have over-limit styling
      await expect(goalCard).not.toHaveClass(/over-limit/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06c: Should display over-limit goal with red warning indicators', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Entertainment', icon: 'film', color: '#8B5CF6', type: 'expense' }
      ])

      // Create goal with $500 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Entertainment', limitAmount: 500 }
      ])

      // Create transactions totaling $650 (130% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Concert Tickets',
          amount: 400,
          type: 'expense',
          categoryId: categories[0].id,
        },
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Movie Night',
          amount: 250,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Find goal card
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()

      // Verify it exceeds the limit (130%)
      const progressPercent = goalCard.getByTestId('goal-progress-percent')
      await expect(progressPercent).toBeVisible()
      await expect(progressPercent).toContainText('130%')

      // Verify the progress is displayed in red
      await expect(progressPercent).toHaveClass(/text-red/)

      // Verify the card has over-limit styling (pulse animation, ring)
      await expect(goalCard).toHaveClass(/over-limit/)

      // Verify "Limite excedido!" warning is visible
      await expect(goalCard).toContainText(/Limite excedido/i)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06d: Should display progress bar with correct fill width', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Shopping', icon: 'bag-shopping', color: '#EC4899', type: 'expense' }
      ])

      // Create goal with $1,000 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Shopping', limitAmount: 1000 }
      ])

      // Create transaction for $750 (75% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Clothes',
          amount: 750,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Get the goal's progress bar fill
      const goalCard = page.getByTestId('goal-card').first()
      const progressFill = goalCard.getByTestId('progress-bar-fill')
      await expect(progressFill).toBeVisible()

      // Verify the progress bar has width style (should be 75%)
      const style = await progressFill.getAttribute('style')
      expect(style).toMatch(/width:\s*(75%|75\.?\d*%)/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06e: Over-limit progress bar should be capped visually at 100%', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Dining', icon: 'utensils', color: '#EF4444', type: 'expense' }
      ])

      // Create goal with $500 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Dining', limitAmount: 500 }
      ])

      // Create transactions totaling $650 (130% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Fine Dining',
          amount: 650,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Get the over-limit goal's progress bar
      const goalCard = page.getByTestId('goal-card').first()
      const progressFill = goalCard.getByTestId('progress-bar-fill')
      await expect(progressFill).toBeVisible()

      // Even though spending is 130%, progress bar fill should max at 100%
      const style = await progressFill.getAttribute('style')
      expect(style).toMatch(/width:\s*(100%|100\.?\d*%)/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06f: Should verify multiple goals with different progress levels', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated categories
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Food', icon: 'utensils', color: '#EF4444', type: 'expense' },
        { name: 'Transport', icon: 'car', color: '#F59E0B', type: 'expense' },
        { name: 'Entertainment', icon: 'film', color: '#8B5CF6', type: 'expense' }
      ])

      // Create goals
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Food', limitAmount: 2000 },
        { categoryName: 'Transport', limitAmount: 800 },
        { categoryName: 'Entertainment', limitAmount: 500 }
      ])

      // Create transactions for different progress levels
      await seedIsolatedTransactions(page, testId, [
        // Food: $1,500 / $2,000 = 75%
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Groceries',
          amount: 1500,
          type: 'expense',
          categoryId: categories[0].id,
        },
        // Transport: $450 / $800 = 56%
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Gas',
          amount: 450,
          type: 'expense',
          categoryId: categories[1].id,
        },
        // Entertainment: $650 / $500 = 130%
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Concert',
          amount: 650,
          type: 'expense',
          categoryId: categories[2].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify all 3 goals are displayed
      const goalCards = page.getByTestId('goal-card')
      await expect(goalCards).toHaveCount(3)

      // Verify first goal (Food - 75%)
      const foodGoal = goalCards.nth(0)
      await expect(foodGoal.getByTestId('goal-progress-percent')).toContainText('75%')

      // Verify second goal (Transport - 56%)
      const transportGoal = goalCards.nth(1)
      await expect(transportGoal.getByTestId('goal-progress-percent')).toContainText('56%')

      // Verify third goal (Entertainment - 130%)
      const entertainmentGoal = goalCards.nth(2)
      await expect(entertainmentGoal.getByTestId('goal-progress-percent')).toContainText('130%')
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-06g: Should update goal progress when editing limit amount', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Groceries', icon: 'utensils', color: '#EF4444', type: 'expense' }
      ])

      // Create goal with $2,000 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Groceries', limitAmount: 2000 }
      ])

      // Create transactions totaling $1,500
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Weekly Shopping',
          amount: 1500,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Get the initial progress (75%)
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard.getByTestId('goal-progress-percent')).toContainText('75%')

      // Click edit on the goal
      await goalCard.getByTestId('edit-goal-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Change the limit from $2,000 to $1,500 (making it 100%)
      await page.getByTestId('limit-amount-input').clear()
      await page.getByTestId('limit-amount-input').fill('1500')

      // Save changes
      await page.getByTestId('save-goal-btn').click()
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Verify progress is now 100% (1500/1500)
      await expect(goalCard.getByTestId('goal-progress-percent')).toContainText('100%')

      // Verify it's now at the limit threshold
      await expect(goalCard).toHaveClass(/over-limit/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
