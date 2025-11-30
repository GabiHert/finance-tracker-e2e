# M8-M11: Dashboard, Groups, Settings, Polish - Missing E2E Tests

## M8: Dashboard - Missing Tests

### 1. Period Comparison Data Accuracy
**Priority:** High
**File:** `e2e/tests/m8-dashboard/dashboard-calculations.spec.ts`

```typescript
test.describe('M8: Dashboard Calculations', () => {
  test('M8-NEW-001: Correct trend calculation', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-screen')).toBeVisible()

    // Get expenses metric card
    const expensesCard = page.getByTestId('metric-card-expenses')
    const trendIndicator = expensesCard.getByTestId('trend-indicator')

    if (await trendIndicator.isVisible()) {
      const trendText = await trendIndicator.textContent()

      // Verify trend has percentage
      expect(trendText).toMatch(/-?\d+%/)

      // Verify trend direction indicator
      const isPositive = trendText?.includes('+')
      const directionIcon = expensesCard.getByTestId('trend-direction')

      if (await directionIcon.isVisible()) {
        const iconClass = await directionIcon.getAttribute('class')
        // For expenses: positive trend (more spending) = bad (red)
        // Negative trend (less spending) = good (green)
        if (isPositive) {
          expect(iconClass).toContain('red')
        }
      }
    }
  })
})
```

### 2. Dashboard Loading State
**Priority:** Medium
**File:** `e2e/tests/m8-dashboard/dashboard-states.spec.ts`

```typescript
test.describe('M8: Dashboard States', () => {
  test('M8-NEW-002: Show loading state on initial load', async ({ page }) => {
    // Slow down network to catch loading state
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await page.goto('/dashboard')

    // Should see loading skeletons
    await expect(page.getByTestId('loading-skeleton')).toBeVisible()

    // After loading, dashboard should appear
    await expect(page.getByTestId('dashboard-screen')).toBeVisible()
  })

  test('M8-NEW-003: Display empty state for new user', async ({ page }) => {
    // This test requires a fresh user context
    await page.goto('/dashboard')

    const emptyState = page.getByTestId('dashboard-empty-state')
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/come[cç]ar|get started/i)
    }
  })
})
```

---

## M9: Groups - Missing Tests

### 1. Accept Group Invitation
**Priority:** High
**File:** `e2e/tests/m9-groups/group-invitations.spec.ts`

```typescript
test.describe('M9: Group Invitations', () => {
  test('M9-NEW-001: Accept group invitation', async ({ page }) => {
    // Navigate to invitations page or check notification
    await page.goto('/groups')

    const pendingInvitation = page.getByTestId('pending-invitation')
    if (await pendingInvitation.isVisible()) {
      // Click accept
      await pendingInvitation.getByTestId('accept-invitation-btn').click()

      // Verify group appears in list
      await expect(page.getByTestId('group-card')).toHaveCount({ greaterThan: 0 })
    }
  })

  test('M9-NEW-002: Decline group invitation', async ({ page }) => {
    await page.goto('/groups')

    const pendingInvitation = page.getByTestId('pending-invitation')
    if (await pendingInvitation.isVisible()) {
      const initialCount = await page.getByTestId('pending-invitation').count()

      // Click decline
      await pendingInvitation.first().getByTestId('decline-invitation-btn').click()

      // Verify invitation removed
      await expect(page.getByTestId('pending-invitation')).toHaveCount(initialCount - 1)
    }
  })
})
```

### 2. Remove Member from Group
**Priority:** High
**File:** `e2e/tests/m9-groups/group-members.spec.ts`

```typescript
test.describe('M9: Group Members', () => {
  test('M9-NEW-003: Admin removes member', async ({ page }) => {
    await page.goto('/groups')

    // Click on a group where user is admin
    const groupCard = page.getByTestId('group-card').first()
    if (await groupCard.isVisible()) {
      await groupCard.click()
      await expect(page.getByTestId('group-detail-screen')).toBeVisible()

      // Go to members tab
      await page.getByTestId('group-tabs').getByText(/membros|members/i).click()
      await expect(page.getByTestId('group-members-tab')).toBeVisible()

      // Find non-admin member
      const memberItems = page.getByTestId('member-item')
      const memberCount = await memberItems.count()

      if (memberCount > 1) {
        const nonAdminMember = memberItems.filter({ hasNot: page.getByTestId('admin-badge') }).first()

        if (await nonAdminMember.isVisible()) {
          await nonAdminMember.getByTestId('remove-member-btn').click()
          await page.getByTestId('confirm-remove-member-btn').click()

          // Verify member removed
          await expect(memberItems).toHaveCount(memberCount - 1)
        }
      }
    }
  })
})
```

### 3. Shared Transaction Creation
**Priority:** High
**File:** `e2e/tests/m9-groups/group-transactions.spec.ts`

```typescript
test.describe('M9: Group Transactions', () => {
  test('M9-NEW-004: Create shared transaction in group', async ({ page }) => {
    await page.goto('/groups')

    const groupCard = page.getByTestId('group-card').first()
    if (await groupCard.isVisible()) {
      await groupCard.click()
      await expect(page.getByTestId('group-detail-screen')).toBeVisible()

      // Go to transactions tab
      await page.getByTestId('group-tabs').getByText(/transa[cç][oõ]es|transactions/i).click()

      const initialCount = await page.getByTestId('group-transaction-item').count()

      // Click add transaction
      await page.getByTestId('add-group-transaction-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Fill transaction details
      await page.getByTestId('transaction-description').fill('Shared Expense')
      await page.getByTestId('transaction-amount').fill('100')
      await page.getByTestId('modal-save-btn').click()

      // Verify transaction appears
      await expect(page.getByTestId('group-transaction-item')).toHaveCount(initialCount + 1)
    }
  })
})
```

---

## M10: Settings - Missing Tests

### 1. Theme Toggle (Dark Mode)
**Priority:** High
**File:** `e2e/tests/m10-settings/theme-toggle.spec.ts`

```typescript
test.describe('M10: Theme Toggle', () => {
  test('M10-NEW-001: Toggle dark mode', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByTestId('settings-screen')).toBeVisible()

    const themeToggle = page.getByTestId('theme-toggle')
    if (await themeToggle.isVisible()) {
      // Get initial theme
      const htmlElement = page.locator('html')
      const initialClass = await htmlElement.getAttribute('class')
      const isDarkInitially = initialClass?.includes('dark')

      // Toggle theme
      await themeToggle.click()

      // Verify theme changed
      await page.waitForTimeout(300)
      const newClass = await htmlElement.getAttribute('class')

      if (isDarkInitially) {
        expect(newClass).not.toContain('dark')
      } else {
        expect(newClass).toContain('dark')
      }

      // Refresh and verify persistence
      await page.reload()
      const persistedClass = await htmlElement.getAttribute('class')

      if (isDarkInitially) {
        expect(persistedClass).not.toContain('dark')
      } else {
        expect(persistedClass).toContain('dark')
      }
    }
  })
})
```

---

## M11: Polish - Missing Tests

### 1. Toast Notification Display
**Priority:** High
**File:** `e2e/tests/m11-polish/toast-notifications.spec.ts`

```typescript
test.describe('M11: Toast Notifications', () => {
  test('M11-NEW-001: Success toast appears after action', async ({ page }) => {
    await page.goto('/categories')
    await expect(page.getByTestId('categories-screen')).toBeVisible()

    // Create a category to trigger success toast
    await page.getByTestId('add-category-btn').click()
    await page.getByTestId('category-name-input').fill('Toast Test Category')
    await page.getByTestId('category-type-select').click()
    await page.getByRole('option', { name: /expense/i }).click()
    await page.getByTestId('icon-picker').click()
    await page.getByTestId('icon-option').first().click()
    await page.getByTestId('color-picker').click()
    await page.getByTestId('color-option').first().click()
    await page.getByTestId('save-category-btn').click()

    // Verify toast appears
    const toast = page.getByTestId('toast-success')
    await expect(toast).toBeVisible()

    // Verify auto-dismiss (wait 6 seconds)
    await page.waitForTimeout(6000)
    await expect(toast).not.toBeVisible()
  })

  test('M11-NEW-002: Dismiss toast manually', async ({ page }) => {
    await page.goto('/categories')
    await page.getByTestId('add-category-btn').click()
    await page.getByTestId('category-name-input').fill('Dismiss Test')
    await page.getByTestId('category-type-select').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('icon-picker').click()
    await page.getByTestId('icon-option').first().click()
    await page.getByTestId('color-picker').click()
    await page.getByTestId('color-option').first().click()
    await page.getByTestId('save-category-btn').click()

    const toast = page.getByTestId('toast-success')
    await expect(toast).toBeVisible()

    // Click dismiss button
    await toast.getByTestId('toast-dismiss-btn').click()

    // Should disappear immediately
    await expect(toast).not.toBeVisible()
  })
})
```

### 2. Keyboard Navigation Full Flow
**Priority:** Medium
**File:** `e2e/tests/m11-polish/keyboard-navigation.spec.ts`

```typescript
test.describe('M11: Keyboard Navigation', () => {
  test('M11-NEW-003: Complete keyboard-only navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-screen')).toBeVisible()

    // Tab to skip link
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('skip-to-content')).toBeFocused()

    // Skip to main content
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('main-content')).toBeFocused()

    // Tab through navigation items
    await page.keyboard.press('Tab')
    // Continue tabbing and verify focus moves through interactive elements

    // Navigate to transactions using keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const transactionsLink = page.getByTestId('nav-item-transactions')
    if (await transactionsLink.evaluate(el => document.activeElement === el)) {
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/transactions/)
    }
  })
})
```

---

## Implementation Notes

- Dashboard calculation tests need known data for accurate verification
- Group tests may need multiple user contexts
- Theme tests should verify CSS variable changes
- Toast tests need proper timing considerations

## Related Review Documents

- `review/M8-Dashboard-QA-Review.md`
- `review/M9-Groups-QA-Review.md`
- `review/M10-Settings-QA-Review.md`
- `review/M11-Polish-QA-Review.md`
