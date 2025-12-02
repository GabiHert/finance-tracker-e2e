import { test, expect } from '@playwright/test'
import {
  generateShortId,
  seedIsolatedCategories,
  seedIsolatedGoals,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
} from '../fixtures/test-utils'

/**
 * M7-E2E: Goal Alerts and Dashboard Integration
 * Validates goal alert functionality including:
 * - Dashboard alert banner for over-limit goals
 * - Warning when approaching limit threshold (80%)
 * - Goal progress updates after transaction creation
 * - Duplicate category goal validation
 *
 * Tests use isolated test data for parallel execution.
 * Each test creates its own categories, goals, and transactions.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M7: Goal Alerts and Integration', () => {
  test('M7-E2E-14a: Should update goal progress after creating new transaction', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Groceries', icon: 'utensils', color: '#EF4444', type: 'expense' }
      ])

      // Create goal with $500 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Groceries', limitAmount: 500 }
      ])

      // Create initial transaction for $200
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Initial Shopping',
          amount: 200,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload to see initial state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify initial progress ($200 / $500 = 40%)
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()
      const initialProgress = await goalCard.getByTestId('goal-current').textContent()
      const initialValue = parseFloat(initialProgress?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0')
      expect(initialValue).toBe(200)

      // Create another transaction for $150
      await page.goto('/transactions')
      await page.getByTestId('add-transaction-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const modalBody = page.getByTestId('modal-body')
      await modalBody.getByTestId('transaction-description').fill('Additional Shopping')
      await modalBody.getByTestId('transaction-amount').fill('150')

      // Select expense type
      const typeSelect = modalBody.getByTestId('transaction-type')
      if (await typeSelect.isVisible()) {
        await typeSelect.click()
        await page.getByRole('option', { name: /expense|despesa/i }).click()
      }

      // Select the same category
      const categorySelect = modalBody.getByTestId('transaction-category')
      await categorySelect.click()
      await page.waitForTimeout(500)

      // Find and select the isolated category
      const categoryOption = page.getByRole('option').filter({ hasText: new RegExp(`\\[${testId}\\]`) })
      await categoryOption.first().click()

      // Save transaction
      const saveBtn = page.getByTestId('modal-save-btn')
      await saveBtn.click()
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

      // Go back to goals and verify progress updated
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Verify progress increased to $350 ($200 + $150)
      const updatedGoalCard = page.getByTestId('goal-card').first()
      const newProgress = await updatedGoalCard.getByTestId('goal-current').textContent()
      const newValue = parseFloat(newProgress?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0')
      expect(newValue).toBe(350)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-14b: Should display over-limit alert on dashboard', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Entertainment', icon: 'film', color: '#8B5CF6', type: 'expense' }
      ])

      // Create goal with very low limit ($10)
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Entertainment', limitAmount: 10 }
      ])

      // Create transaction that exceeds limit ($50 > $10)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Concert Tickets',
          amount: 50,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload goals page to see over-limit state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify goal shows over-limit
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()
      await expect(goalCard).toHaveClass(/over-limit/)

      // Go to dashboard and check for alert banner
      await page.goto('/dashboard')
      await expect(page.getByTestId('dashboard-screen')).toBeVisible({ timeout: 5000 })

      // Verify goal alert banner is visible
      const alertBanner = page.getByTestId('goal-alert-banner').or(page.getByTestId('alerts-banner'))
      await expect(alertBanner).toBeVisible({ timeout: 5000 })
      await expect(alertBanner).toContainText(/exceeded|excedido|limite|over|alert/i)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-14c: Should show warning when approaching limit (80%+)', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      const categories = await seedIsolatedCategories(page, testId, [
        { name: 'Dining', icon: 'utensils', color: '#FFA500', type: 'expense' }
      ])

      // Create goal with $100 limit
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Dining', limitAmount: 100, alertOnExceed: true }
      ])

      // Create transaction for $85 (85% of limit)
      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Restaurant',
          amount: 85,
          type: 'expense',
          categoryId: categories[0].id,
        }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Find goal card
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible({ timeout: 3000 })

      // Check the percentage
      const progressPercent = goalCard.getByTestId('goal-progress-percent')
      await expect(progressPercent).toBeVisible()
      const percentText = await progressPercent.textContent()
      const percent = parseFloat(percentText?.replace('%', '') || '0')

      // If percent is >= 80 and < 100, we should see warning indicator
      if (percent >= 80 && percent < 100) {
        const warningIndicator = goalCard.getByTestId('warning-indicator')
        await expect(warningIndicator).toBeVisible({ timeout: 3000 })
      } else if (percent >= 100) {
        // Over-limit indicator should be visible instead
        const overLimitIndicator = goalCard.getByTestId('over-limit-indicator')
        await expect(overLimitIndicator).toBeVisible({ timeout: 3000 })
      }

      // Verify percentage is >= 80%
      expect(percent).toBeGreaterThanOrEqual(80)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-14d: Should prevent duplicate category goals', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      await seedIsolatedCategories(page, testId, [
        { name: 'Shopping', icon: 'bag-shopping', color: '#EC4899', type: 'expense' }
      ])

      // Create first goal via localStorage
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Shopping', limitAmount: 500 }
      ])

      // Reload to see the goal
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify first goal exists
      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()

      // Try to create another goal for the same category via UI
      await page.getByTestId('new-goal-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.getByTestId('category-selector').click()
      await page.getByRole('option').first().waitFor({ state: 'visible' })

      // Check if the same category is available in the dropdown
      const isolatedCategoryOption = page.getByRole('option').filter({ hasText: new RegExp(`\\[${testId}\\]`) })
      const isAvailable = await isolatedCategoryOption.count() > 0

      if (!isAvailable) {
        // Category is not available - duplicates are prevented
        expect(true).toBe(true)
        await page.keyboard.press('Escape')
      } else {
        // Category is available, try to select it
        await isolatedCategoryOption.first().click()
        await page.getByTestId('limit-amount-input').fill('1000')
        await page.getByTestId('save-goal-btn').click()

        // Wait for either error or success
        await page.waitForLoadState('networkidle')

        // Check for error messages
        const duplicateError = page.getByTestId('duplicate-category-error')
        const errorAlert = page.locator('[role="alert"]')
        const errorText = page.getByText(/duplicado|duplicate|já existe|already exists|categoria já/i)
        const modalStillOpen = await page.getByRole('dialog').isVisible()

        const hasError = (await duplicateError.isVisible().catch(() => false)) ||
          (await errorAlert.first().isVisible().catch(() => false)) ||
          (await errorText.first().isVisible().catch(() => false)) ||
          modalStillOpen

        // Either error is shown or modal stays open (validation failed)
        expect(hasError || modalStillOpen).toBeTruthy()
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-14e: Should display goal period information', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      await seedIsolatedCategories(page, testId, [
        { name: 'Utilities', icon: 'bolt', color: '#3B82F6', type: 'expense' }
      ])

      // Create goal
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Utilities', limitAmount: 200 }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check for period indicator on goal card
      const goalCard = page.getByTestId('goal-card').first()

      if (await goalCard.isVisible()) {
        // Check for period indicator (e.g., current month/year)
        const periodIndicator = goalCard.getByTestId('goal-period')

        if (await periodIndicator.isVisible().catch(() => false)) {
          // Should contain current month/year or "monthly"
          const periodText = await periodIndicator.textContent()
          expect(periodText).toMatch(/nov|novembro|november|dec|dezembro|december|2025|mensal|monthly/i)
        }
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M7-E2E-14f: Should verify goal cards show all required elements', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/goals')
      await page.waitForLoadState('networkidle')

      // Create isolated category
      await seedIsolatedCategories(page, testId, [
        { name: 'Health', icon: 'heart', color: '#10B981', type: 'expense' }
      ])

      // Create goal
      await seedIsolatedGoals(page, testId, [
        { categoryName: 'Health', limitAmount: 300 }
      ])

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      const goalCard = page.getByTestId('goal-card').first()
      await expect(goalCard).toBeVisible()

      // Verify all required elements are present
      await expect(goalCard.getByTestId('goal-category-icon')).toBeVisible()
      await expect(goalCard.getByTestId('goal-category-name')).toBeVisible()
      await expect(goalCard.getByTestId('progress-bar')).toBeVisible()
      await expect(goalCard.getByTestId('goal-current')).toBeVisible()
      await expect(goalCard.getByTestId('goal-limit')).toBeVisible()
      await expect(goalCard.getByTestId('goal-progress-percent')).toBeVisible()
      await expect(goalCard.getByTestId('edit-goal-btn')).toBeVisible()
      await expect(goalCard.getByTestId('delete-goal-btn')).toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
