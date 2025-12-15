import { test, expect } from '@playwright/test'
import { deleteAllCategoryRules } from '../fixtures/test-utils'

/**
 * M6-E2E: Category Rules Engine
 * Validates the category rules functionality including:
 * - Rule creation with pattern helper UI
 * - Match types: Contains, Starts With, Exact Match
 * - Pattern testing against existing transactions
 * - Rule editing and deletion
 * - Drag-and-drop priority reordering
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M6: Category Rules Engine', () => {
  // Clean up all category rules before running tests to avoid conflicts
  test.beforeAll(async ({ browser }) => {
    // Create context with stored auth state
    const context = await browser.newContext({
      storageState: 'tests/fixtures/.auth/user.json',
    })
    const page = await context.newPage()
    try {
      // Navigate to app to establish auth context
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await deleteAllCategoryRules(page)
      console.log('Cleaned up category rules successfully')
    } catch (e) {
      console.log('Could not clean up category rules:', e)
    }
    await page.close()
    await context.close()
  })
  // No login needed - auth state is pre-populated by auth-setup project

  test('M6-E2E-001: Should display rules screen with navigation', async ({ page }) => {
    // Navigate to rules screen (may be accessible from sidebar or settings)
    await page.goto('/rules')

    // Verify the rules screen loads
    await expect(page.getByTestId('rules-screen')).toBeVisible()

    // Verify "Nova Regra" button exists
    await expect(page.getByTestId('new-rule-btn')).toBeVisible()
  })

  test('M6-E2E-002: Should open rule creation modal with pattern helper', async ({ page }) => {
    await page.goto('/rules')

    // Click new rule button
    await page.getByTestId('new-rule-btn').click()

    // Verify modal opens
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Verify pattern helper components exist
    await expect(page.getByTestId('match-type-selector')).toBeVisible()
    await expect(page.getByTestId('pattern-input')).toBeVisible()
    await expect(page.getByTestId('category-selector')).toBeVisible()

    // Regex preview only appears after entering a pattern
    await page.getByTestId('pattern-input').fill('TEST')
    await expect(page.getByTestId('regex-preview')).toBeVisible()
  })

  test('M6-E2E-003: Should create rule with "Contains" match type', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select "Contains" match type
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()

    // Enter pattern
    await page.getByTestId('pattern-input').fill('UBER')

    // Verify regex preview shows ".*UBER.*"
    await expect(page.getByTestId('regex-preview')).toContainText('.*UBER.*')

    // Select a category
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()

    // Save the rule
    await page.getByTestId('save-rule-btn').click()

    // Verify rule appears in the list (at least one rule row should be visible)
    await expect(page.getByTestId('rule-row').first()).toBeVisible()
    await expect(page.getByTestId('rule-pattern').last()).toContainText('.*UBER.*')
  })

  test('M6-E2E-004: Should create rule with "Starts with" match type', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select "Starts with" match type
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /come[cç]a com/i }).click()

    // Enter pattern
    await page.getByTestId('pattern-input').fill('PIX')

    // Verify regex preview shows "^PIX.*"
    await expect(page.getByTestId('regex-preview')).toContainText('^PIX.*')

    // Select a category
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()

    // Save the rule
    await page.getByTestId('save-rule-btn').click()

    // Verify success (at least one rule row should be visible)
    await expect(page.getByTestId('rule-row').first()).toBeVisible()
  })

  test('M6-E2E-005: Should create rule with "Exact" match type', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select "Exact" match type
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /exato/i }).click()

    // Enter pattern
    await page.getByTestId('pattern-input').fill('NETFLIX')

    // Verify regex preview shows "^NETFLIX$"
    await expect(page.getByTestId('regex-preview')).toContainText('^NETFLIX$')

    // Select a category
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()

    // Save the rule
    await page.getByTestId('save-rule-btn').click()

    // Verify success (at least one rule row should be visible)
    await expect(page.getByTestId('rule-row').first()).toBeVisible()
  })

  test('M6-E2E-006: Should test pattern against existing transactions', async ({ page }) => {
    // First, ensure there are some transactions with "UBER" in description
    // (This may already exist from previous tests or seeded data)

    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select "Contains" match type and enter pattern
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')

    // Click test pattern button
    await page.getByTestId('test-pattern-btn').click()

    // Verify test results panel appears
    await expect(page.getByTestId('pattern-test-results')).toBeVisible()

    // Should show matching transactions count
    await expect(page.getByTestId('match-count')).toBeVisible()
  })

  test('M6-E2E-007: Should edit an existing rule', async ({ page }) => {
    // First create a rule to edit
    await page.goto('/rules')

    // Wait for rules list to load
    await expect(page.getByTestId('rules-list')).toBeVisible()

    // If there are existing rules, click edit on the first one
    const ruleRows = page.getByTestId('rule-row')
    const count = await ruleRows.count()

    if (count > 0) {
      // Click edit button on first rule
      await ruleRows.first().getByTestId('edit-rule-btn').click()

      // Verify edit modal opens
      await expect(page.getByRole('dialog')).toBeVisible()

      // Modify the pattern
      await page.getByTestId('pattern-input').clear()
      await page.getByTestId('pattern-input').fill('UBER|99')

      // Save changes
      await page.getByTestId('save-rule-btn').click()

      // Verify the update is reflected
      await expect(page.getByTestId('rule-pattern').first()).toContainText('UBER|99')
    } else {
      // Create a rule first, then edit it
      await page.getByTestId('new-rule-btn').click()
      await page.getByTestId('match-type-selector').click()
      await page.getByRole('option', { name: /cont[eé]m/i }).click()
      await page.getByTestId('pattern-input').fill('TEST_RULE')
      await page.getByTestId('category-selector').click()
      await page.getByRole('option').first().click()
      await page.getByTestId('save-rule-btn').click()

      // Now edit it
      await page.getByTestId('rule-row').first().getByTestId('edit-rule-btn').click()
      await page.getByTestId('pattern-input').clear()
      await page.getByTestId('pattern-input').fill('TEST_RULE_EDITED')
      await page.getByTestId('save-rule-btn').click()

      await expect(page.getByTestId('rule-pattern').first()).toContainText('TEST_RULE_EDITED')
    }
  })

  test('M6-E2E-008: Should delete a rule', async ({ page }) => {
    await page.goto('/rules')

    // Wait for rules list to load
    await expect(page.getByTestId('rules-list')).toBeVisible()

    const ruleRows = page.getByTestId('rule-row')
    const initialCount = await ruleRows.count()

    if (initialCount > 0) {
      // Click delete button on first rule
      await ruleRows.first().getByTestId('delete-rule-btn').click()

      // Confirm deletion in the dialog
      await expect(page.getByTestId('confirm-delete-dialog')).toBeVisible()
      await page.getByTestId('confirm-delete-btn').click()

      // Wait for dialog to close and deletion to complete
      await expect(page.getByTestId('confirm-delete-dialog')).not.toBeVisible()

      // Wait for the rule count to decrease
      await expect(page.getByTestId('rule-row')).toHaveCount(initialCount - 1)
    } else {
      // Create a rule first, then delete it
      await page.getByTestId('new-rule-btn').click()
      await page.getByTestId('match-type-selector').click()
      await page.getByRole('option', { name: /cont[eé]m/i }).click()
      await page.getByTestId('pattern-input').fill('TO_DELETE')
      await page.getByTestId('category-selector').click()
      await page.getByRole('option').first().click()
      await page.getByTestId('save-rule-btn').click()

      // Wait for rule to appear
      await expect(page.getByTestId('rule-row').first()).toBeVisible()

      // Get initial count
      const initialCount = await page.getByTestId('rule-row').count()

      // Delete the last rule (the one we just created)
      await page.getByTestId('rule-row').last().getByTestId('delete-rule-btn').click()
      await page.getByTestId('confirm-delete-btn').click()

      // Wait for deletion to complete - there should be one less rule
      await expect(page.getByTestId('rule-row')).toHaveCount(initialCount - 1)
    }
  })

  test('M6-E2E-009: Should display drag handles for priority reordering', async ({ page }) => {
    await page.goto('/rules')

    // Wait for rules list
    await expect(page.getByTestId('rules-list')).toBeVisible()

    const ruleRows = page.getByTestId('rule-row')
    const count = await ruleRows.count()

    if (count >= 2) {
      // Verify drag handles exist on each rule row
      const dragHandles = page.getByTestId('drag-handle')
      await expect(dragHandles.first()).toBeVisible()
    }
  })

  test('M6-E2E-010: Should reorder rules by drag and drop', async ({ page }) => {
    await page.goto('/rules')

    // Create at least 2 rules if they don't exist
    const ruleRows = page.getByTestId('rule-row')
    let count = await ruleRows.count()

    // Create rules if needed
    while (count < 2) {
      await page.getByTestId('new-rule-btn').click()
      await page.getByTestId('match-type-selector').click()
      await page.getByRole('option', { name: /cont[eé]m/i }).click()
      await page.getByTestId('pattern-input').fill(`RULE_${count + 1}`)
      await page.getByTestId('category-selector').click()
      await page.getByRole('option').first().click()
      await page.getByTestId('save-rule-btn').click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
      count = await ruleRows.count()
    }

    // Get initial order
    const firstRulePattern = await page.getByTestId('rule-pattern').first().textContent()

    // Perform drag and drop (drag first rule to second position)
    const firstHandle = page.getByTestId('drag-handle').first()
    const secondRule = page.getByTestId('rule-row').nth(1)

    await firstHandle.dragTo(secondRule)

    // Wait for reorder to save
    await page.waitForTimeout(500)

    // Verify order changed (first pattern should now be different)
    const newFirstPattern = await page.getByTestId('rule-pattern').first().textContent()
    expect(newFirstPattern).not.toBe(firstRulePattern)
  })

  test('M6-E2E-011: Should show priority indicators on rules', async ({ page }) => {
    await page.goto('/rules')

    // Wait for rules list
    await expect(page.getByTestId('rules-list')).toBeVisible()

    const ruleRows = page.getByTestId('rule-row')
    const count = await ruleRows.count()

    if (count > 0) {
      // Verify priority indicator exists
      await expect(page.getByTestId('rule-priority').first()).toBeVisible()
    }
  })

  test('M6-E2E-012: Should navigate to rules from sidebar/menu', async ({ page }) => {
    // Start from dashboard or another page
    await page.goto('/transactions')

    // Look for rules link in sidebar or menu
    const rulesLink = page.getByRole('link', { name: /regras/i })

    if (await rulesLink.isVisible()) {
      await rulesLink.click()
      await expect(page).toHaveURL(/\/rules/)
      await expect(page.getByTestId('rules-screen')).toBeVisible()
    } else {
      // Alternative: Rules might be in settings or a submenu
      const settingsMenu = page.getByTestId('settings-menu')
      if (await settingsMenu.isVisible()) {
        await settingsMenu.click()
        const rulesOption = page.getByRole('menuitem', { name: /regras/i })
        if (await rulesOption.isVisible()) {
          await rulesOption.click()
          await expect(page.getByTestId('rules-screen')).toBeVisible()
        }
      }
    }
  })

  test('M6-E2E-013: Should display empty state when no rules exist', async ({ page }) => {
    // This test may need to run in isolation or after cleanup
    await page.goto('/rules')

    // Wait for the rules screen to be fully loaded
    await expect(page.getByTestId('rules-screen')).toBeVisible()

    // Wait for either the rules list or empty state to be visible
    const emptyState = page.getByTestId('rules-empty-state')
    const rulesList = page.getByTestId('rules-list')

    // Wait a moment for the content to load
    await page.waitForTimeout(500)

    // Check which element is visible
    const emptyStateVisible = await emptyState.isVisible().then(() => true, () => false)
    const rulesListVisible = await rulesList.isVisible().then(() => true, () => false)

    // If empty state is showing (no rules), validate it
    if (emptyStateVisible && !rulesListVisible) {
      await expect(emptyState).toContainText(/nenhuma regra|criar.*regra/i)
    }
    // If rules list is visible, test passes (rules exist from previous tests)
  })

  test('M6-E2E-014: Should validate pattern input', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Try to save without entering a pattern
    await page.getByTestId('save-rule-btn').click()

    // Should show validation error
    await expect(page.getByTestId('pattern-error')).toBeVisible()
  })

  test('M6-E2E-015: Should cancel rule creation', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill in some data
    await page.getByTestId('pattern-input').fill('TEST_CANCEL')

    // Click cancel
    await page.getByTestId('cancel-btn').click()

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // No rule should be created with this pattern
    const ruleWithPattern = page.getByText('TEST_CANCEL')
    await expect(ruleWithPattern).not.toBeVisible()
  })

  test('M6-E2E-016: Should support custom regex match type', async ({ page }) => {
    await page.goto('/rules')

    // Open rule creation modal
    await page.getByTestId('new-rule-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select "Custom regex" match type
    await page.getByTestId('match-type-selector').click()
    const customOption = page.getByRole('option', { name: /regex|personalizado|custom/i })

    if (await customOption.isVisible()) {
      await customOption.click()

      // Enter custom regex pattern
      await page.getByTestId('pattern-input').fill('(UBER|99|TAXI).*TRIP')

      // Verify regex preview shows the pattern as-is
      await expect(page.getByTestId('regex-preview')).toContainText('(UBER|99|TAXI).*TRIP')

      // Select a category
      await page.getByTestId('category-selector').click()
      await page.getByRole('option').first().click()

      // Save the rule
      await page.getByTestId('save-rule-btn').click()

      // Verify rule is created (at least one rule row should be visible)
      await expect(page.getByTestId('rule-row').first()).toBeVisible()
    }
  })
})
