# M3: Categories - Missing E2E Tests

## Missing Test Scenarios

### 1. Complete Category Creation Flow
**Priority:** High
**File:** `e2e/tests/m3-categories/category-crud.spec.ts`

```typescript
test.describe('M3: Category CRUD', () => {
  test('M3-NEW-001: Complete category creation flow', async ({ page }) => {
    // Step 1: Navigate to categories screen
    await page.goto('/categories')

    // Step 2: Click "Add Category" button
    await page.getByTestId('add-category-btn').click()

    // Step 3: Verify modal opens
    await expect(page.getByTestId('category-modal')).toBeVisible()

    // Step 4: Fill in category name
    await page.getByTestId('category-name-input').fill('New Test Category')

    // Step 5: Select type
    await page.getByTestId('category-type-select').click()
    await page.getByRole('option', { name: /expense/i }).click()

    // Step 6: Select an icon
    await page.getByTestId('icon-picker').click()
    await page.getByTestId('icon-option').first().click()

    // Step 7: Select a color
    await page.getByTestId('color-picker').click()
    await page.getByTestId('color-option').first().click()

    // Step 8: Click "Create Category"
    await page.getByTestId('save-category-btn').click()

    // Step 9: Verify modal closes
    await expect(page.getByTestId('category-modal')).not.toBeVisible()

    // Step 10: Verify success toast appears
    await expect(page.getByTestId('toast-success')).toBeVisible()

    // Step 11: Verify new category is visible in the grid
    await expect(page.getByText('New Test Category')).toBeVisible()
  })

  test('M3-NEW-002: Complete category edit flow', async ({ page }) => {
    // Step 1: Navigate to categories screen
    await page.goto('/categories')

    // Step 2: Click on an existing category
    const categoryCard = page.getByTestId('category-card').first()
    const originalName = await categoryCard.getByTestId('category-name').textContent()
    await categoryCard.click()

    // Step 3: Verify edit modal opens with pre-populated data
    await expect(page.getByTestId('category-modal')).toBeVisible()
    await expect(page.getByTestId('category-name-input')).toHaveValue(originalName || '')

    // Step 4: Change the name
    await page.getByTestId('category-name-input').clear()
    await page.getByTestId('category-name-input').fill('Updated Category Name')

    // Step 5: Click "Save Changes"
    await page.getByTestId('save-category-btn').click()

    // Step 6: Verify modal closes
    await expect(page.getByTestId('category-modal')).not.toBeVisible()

    // Step 7: Verify success toast
    await expect(page.getByTestId('toast-success')).toBeVisible()

    // Step 8: Verify category shows updated name
    await expect(page.getByText('Updated Category Name')).toBeVisible()
  })
})
```

### 2. Form Validation Tests
**Priority:** Medium
**File:** `e2e/tests/m3-categories/category-validation.spec.ts`

```typescript
test.describe('M3: Category Validation', () => {
  test('M3-NEW-003: Validate category name too short', async ({ page }) => {
    await page.goto('/categories')
    await page.getByTestId('add-category-btn').click()

    // Enter single character
    await page.getByTestId('category-name-input').fill('A')
    await page.getByTestId('save-category-btn').click()

    // Should show error
    await expect(page.getByTestId('name-error')).toContainText(/pelo menos 2 caracteres|at least 2 characters/i)
  })

  test('M3-NEW-004: Validate category name too long', async ({ page }) => {
    await page.goto('/categories')
    await page.getByTestId('add-category-btn').click()

    // Enter 51 characters
    await page.getByTestId('category-name-input').fill('A'.repeat(51))
    await page.getByTestId('save-category-btn').click()

    // Should show error
    await expect(page.getByTestId('name-error')).toContainText(/menos de 50|less than 50/i)
  })
})
```

### 3. Empty State Tests
**Priority:** Low
**File:** `e2e/tests/m3-categories/categories.spec.ts` (add to existing)

```typescript
test('M3-NEW-005: Display empty state when no categories', async ({ page }) => {
  // This test requires a fresh user with no categories
  await page.goto('/categories')

  // Verify empty state
  await expect(page.getByTestId('categories-empty-state')).toBeVisible()
  await expect(page.getByTestId('categories-empty-state')).toContainText(/nenhuma categoria|no categories/i)

  // Verify CTA button
  const createBtn = page.getByTestId('create-first-category-btn')
  await expect(createBtn).toBeVisible()

  // Click should open modal
  await createBtn.click()
  await expect(page.getByTestId('category-modal')).toBeVisible()
})
```

### 4. Combined Search and Filter
**Priority:** Low
**File:** `e2e/tests/m3-categories/categories.spec.ts` (add to existing)

```typescript
test('M3-NEW-006: Combined search and type filter', async ({ page }) => {
  await page.goto('/categories')

  // Apply type filter
  await page.getByTestId('type-filter').click()
  await page.getByRole('option', { name: /expense/i }).click()

  // Apply search
  await page.getByTestId('search-input').fill('Food')

  // Verify only matching results shown
  const categories = page.getByTestId('category-card')
  const count = await categories.count()

  for (let i = 0; i < count; i++) {
    const card = categories.nth(i)
    await expect(card.getByTestId('category-type-badge')).toContainText(/expense/i)
    await expect(card).toContainText(/food/i)
  }
})
```

### 5. Group Categories Tab
**Priority:** Medium
**File:** `e2e/tests/m3-categories/group-categories.spec.ts`

```typescript
test.describe('M3: Group Categories', () => {
  test('M3-NEW-007: Switch between personal and group categories', async ({ page }) => {
    await page.goto('/categories')

    // Verify tabs exist
    await expect(page.getByTestId('personal-categories-tab')).toBeVisible()
    await expect(page.getByTestId('group-categories-tab')).toBeVisible()

    // Click group categories tab
    await page.getByTestId('group-categories-tab').click()

    // Verify group categories are shown
    await expect(page.getByTestId('group-categories-list')).toBeVisible()
  })
})
```

---

## Implementation Notes

- Use test isolation to ensure tests don't affect each other
- Consider using API to seed test data before tests
- Empty state test may need database cleanup or new user

## Related Review Document

See `review/M3-Categories-QA-Review.md` for full context.
