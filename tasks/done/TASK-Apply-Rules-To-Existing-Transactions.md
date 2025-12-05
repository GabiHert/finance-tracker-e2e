# Task: Apply Category Rules to Existing Transactions

## Overview

When a user creates a new category rule, existing uncategorized transactions that match the rule pattern should be automatically updated with the rule's category. Currently, rules only apply to **new transactions** created after the rule exists - they do NOT retroactively update existing transactions.

**Goal:** After creating a category rule, all existing uncategorized transactions matching the pattern should be automatically categorized.

---

## Current State Analysis

### What Exists

**Backend Implementation:**
- `CreateCategoryRuleUseCase` at `backend/internal/application/usecase/category_rule/create_category_rule.go` - Creates rules but does NOT apply them to existing transactions
- `TestPatternUseCase` at `backend/internal/application/usecase/category_rule/test_pattern.go` - Can find matching transactions but doesn't update them
- `FindMatchingTransactions` in repository - Queries transactions matching a pattern
- Auto-categorization in `CreateTransactionUseCase` - Applies rules only when creating new transactions
- `BulkCategorizeTransactionsUseCase` - Manual bulk categorization (explicit category ID, NOT rule-based)

**Database Capabilities:**
- PostgreSQL `~*` regex operator for case-insensitive matching
- Query to find matching transactions already exists in `FindMatchingTransactions`

**E2E Tests:**
- `e2e/tests/m6-rules/rule-application.spec.ts` - Tests auto-categorization during import
- Does NOT test retroactive rule application to existing transactions

### What's Missing

1. **Backend Use Case:** `ApplyRuleToExistingTransactionsUseCase` - Apply a rule to matching uncategorized transactions
2. **Trigger Mechanism:** Call the apply use case after rule creation
3. **E2E Test:** Test that creating a rule updates existing uncategorized transactions

---

## Execution Plan

### Phase 1: Create E2E Test (TDD)

Create an E2E test that will FAIL until the feature is implemented:
- User uploads transactions without categories (all show as "Unknown")
- User creates a category and a rule for it
- User navigates to dashboard/transactions
- Transactions matching the rule should NOW have the category assigned

### Phase 2: Backend Implementation

1. Create `ApplyRuleToExistingTransactionsUseCase`
2. Integrate it into `CreateCategoryRuleUseCase` (call after successful rule creation)
3. Return count of updated transactions in the response

### Phase 3: Frontend (Optional Enhancement)

- Show toast notification: "Rule created. X existing transactions were categorized."
- No frontend code changes required for core functionality (automatic on backend)

### Phase 4: Verification

- Run new E2E test - should pass
- Run all existing M6 rules tests - should still pass
- Manual verification of the user flow

---

## Detailed Specifications

### E2E Test Scenario

**File:** `e2e/tests/m6-rules/rule-application.spec.ts`

Add new test case after existing tests:

```typescript
test('M6-E2E-17i: Apply rule to existing uncategorized transactions', async ({ page }) => {
  // Setup: Create category via API
  const categoryName = 'Test Transport';
  const categoryResponse = await page.request.post(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: {
      name: categoryName,
      icon: 'car',
      color: '#FF5722',
      owner_type: 'user',
      owner_id: userId,
    },
  });
  const category = await categoryResponse.json();

  // Setup: Create transactions WITHOUT category via API
  const transactions = [
    { description: 'UBER TRIP TO AIRPORT', amount: -50.00, date: '2024-01-15' },
    { description: 'uber ride downtown', amount: -25.00, date: '2024-01-16' },
    { description: 'GROCERY STORE', amount: -100.00, date: '2024-01-17' }, // Should NOT match
  ];

  for (const tx of transactions) {
    await page.request.post(`${BASE_URL}/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        type: 'expense',
        // NO category_id - should be uncategorized
      },
    });
  }

  // Verify: Transactions are uncategorized
  await page.goto('/transactions');
  await expect(page.getByText('UBER TRIP TO AIRPORT')).toBeVisible();
  await expect(page.getByText('Desconhecido').or(page.getByText('Unknown'))).toHaveCount(3);

  // Action: Create a rule with pattern "uber" (case-insensitive)
  await page.goto('/rules');
  await page.click('[data-testid="add-rule-button"]');

  // Select "Contains" match type and enter "uber"
  await page.selectOption('[data-testid="match-type-select"]', 'contains');
  await page.fill('[data-testid="pattern-input"]', 'uber');
  await page.selectOption('[data-testid="category-select"]', category.id);
  await page.click('[data-testid="save-rule-button"]');

  // Wait for rule creation and automatic application
  await expect(page.getByText('Regra criada').or(page.getByText('Rule created'))).toBeVisible();

  // Verify: Matching transactions now have the category
  await page.goto('/transactions');

  // The 2 UBER transactions should now show "Test Transport" category
  const transportBadges = page.locator(`[data-testid="category-badge"]:has-text("${categoryName}")`);
  await expect(transportBadges).toHaveCount(2);

  // The GROCERY STORE transaction should still be uncategorized
  const uncategorizedBadges = page.locator('[data-testid="category-badge"]:has-text("Desconhecido")').or(
    page.locator('[data-testid="category-badge"]:has-text("Unknown")')
  );
  await expect(uncategorizedBadges).toHaveCount(1);
});
```

### Backend Use Case: ApplyRuleToExistingTransactionsUseCase

**File:** `backend/internal/application/usecase/category_rule/apply_rule_to_existing_transactions.go`

```go
package categoryrule

import (
	"context"
	"fmt"
	"regexp"

	"github.com/google/uuid"

	"github.com/finance-tracker/backend/internal/application/adapter"
	"github.com/finance-tracker/backend/internal/domain/entity"
)

// ApplyRuleToExistingTransactionsInput represents the input for applying a rule.
type ApplyRuleToExistingTransactionsInput struct {
	RuleID    uuid.UUID
	OwnerType entity.OwnerType
	OwnerID   uuid.UUID
}

// ApplyRuleToExistingTransactionsOutput represents the output.
type ApplyRuleToExistingTransactionsOutput struct {
	UpdatedCount int
}

// ApplyRuleToExistingTransactionsUseCase handles applying a rule to existing transactions.
type ApplyRuleToExistingTransactionsUseCase struct {
	ruleRepo        adapter.CategoryRuleRepository
	transactionRepo adapter.TransactionRepository
}

// NewApplyRuleToExistingTransactionsUseCase creates a new use case instance.
func NewApplyRuleToExistingTransactionsUseCase(
	ruleRepo adapter.CategoryRuleRepository,
	transactionRepo adapter.TransactionRepository,
) *ApplyRuleToExistingTransactionsUseCase {
	return &ApplyRuleToExistingTransactionsUseCase{
		ruleRepo:        ruleRepo,
		transactionRepo: transactionRepo,
	}
}

// Execute applies the rule to all matching uncategorized transactions.
func (uc *ApplyRuleToExistingTransactionsUseCase) Execute(
	ctx context.Context,
	input ApplyRuleToExistingTransactionsInput,
) (*ApplyRuleToExistingTransactionsOutput, error) {
	// Fetch the rule
	rule, err := uc.ruleRepo.FindByID(ctx, input.RuleID)
	if err != nil {
		return nil, fmt.Errorf("failed to find rule: %w", err)
	}

	// Validate rule is active
	if !rule.IsActive {
		return &ApplyRuleToExistingTransactionsOutput{UpdatedCount: 0}, nil
	}

	// Validate regex pattern
	if _, err := regexp.Compile(rule.Pattern); err != nil {
		return nil, fmt.Errorf("invalid rule pattern: %w", err)
	}

	// Update all matching uncategorized transactions
	// This should be a single database operation for efficiency
	updatedCount, err := uc.transactionRepo.BulkUpdateCategoryByPattern(
		ctx,
		rule.Pattern,
		rule.CategoryID,
		input.OwnerType,
		input.OwnerID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to apply rule to transactions: %w", err)
	}

	return &ApplyRuleToExistingTransactionsOutput{
		UpdatedCount: updatedCount,
	}, nil
}
```

### Repository Method: BulkUpdateCategoryByPattern

**File:** `backend/internal/application/adapter/transaction_repository.go`

Add to the `TransactionRepository` interface:

```go
// BulkUpdateCategoryByPattern updates category for all uncategorized transactions
// matching the given pattern for the specified owner.
BulkUpdateCategoryByPattern(
	ctx context.Context,
	pattern string,
	categoryID uuid.UUID,
	ownerType entity.OwnerType,
	ownerID uuid.UUID,
) (int, error)
```

**File:** `backend/internal/integration/persistence/transaction_repository.go`

Add implementation:

```go
// BulkUpdateCategoryByPattern updates category for uncategorized transactions matching pattern.
func (r *TransactionRepository) BulkUpdateCategoryByPattern(
	ctx context.Context,
	pattern string,
	categoryID uuid.UUID,
	ownerType entity.OwnerType,
	ownerID uuid.UUID,
) (int, error) {
	var query string
	var args []interface{}

	if ownerType == entity.OwnerTypeUser {
		// For user: update transactions belonging to user that have no category
		query = `
			UPDATE transactions
			SET category_id = $1, updated_at = NOW()
			WHERE user_id = $2
			  AND category_id IS NULL
			  AND deleted_at IS NULL
			  AND description ~* $3
		`
		args = []interface{}{categoryID, ownerID, pattern}
	} else {
		// For group: update transactions belonging to any group member that have no category
		query = `
			UPDATE transactions
			SET category_id = $1, updated_at = NOW()
			WHERE user_id IN (
				SELECT user_id FROM group_members WHERE group_id = $2 AND deleted_at IS NULL
			)
			  AND category_id IS NULL
			  AND deleted_at IS NULL
			  AND description ~* $3
		`
		args = []interface{}{categoryID, ownerID, pattern}
	}

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to bulk update transactions by pattern: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return int(rowsAffected), nil
}
```

### Modify CreateCategoryRuleUseCase

**File:** `backend/internal/application/usecase/category_rule/create_category_rule.go`

Modify to call `ApplyRuleToExistingTransactionsUseCase` after rule creation:

```go
// Add to struct
type CreateCategoryRuleUseCase struct {
	ruleRepo        adapter.CategoryRuleRepository
	categoryRepo    adapter.CategoryRepository
	transactionRepo adapter.TransactionRepository // ADD THIS
}

// Add to constructor
func NewCreateCategoryRuleUseCase(
	ruleRepo adapter.CategoryRuleRepository,
	categoryRepo adapter.CategoryRepository,
	transactionRepo adapter.TransactionRepository, // ADD THIS
) *CreateCategoryRuleUseCase {
	return &CreateCategoryRuleUseCase{
		ruleRepo:        ruleRepo,
		categoryRepo:    categoryRepo,
		transactionRepo: transactionRepo, // ADD THIS
	}
}

// Modify output to include updated count
type CreateCategoryRuleOutput struct {
	Rule                    *entity.CategoryRuleWithCategory
	TransactionsUpdated     int  // ADD THIS
}

// At the end of Execute, after rule creation succeeds, add:
// Apply rule to existing uncategorized transactions
updatedCount, err := uc.applyRuleToExistingTransactions(ctx, rule, input.OwnerType, input.OwnerID)
if err != nil {
	// Log error but don't fail the rule creation
	// The rule was created successfully, just the auto-apply failed
	log.Warnf("failed to apply rule to existing transactions: %v", err)
	updatedCount = 0
}

return &CreateCategoryRuleOutput{
	Rule:                rule,
	TransactionsUpdated: updatedCount,
}, nil

// Add helper method
func (uc *CreateCategoryRuleUseCase) applyRuleToExistingTransactions(
	ctx context.Context,
	rule *entity.CategoryRule,
	ownerType entity.OwnerType,
	ownerID uuid.UUID,
) (int, error) {
	if !rule.IsActive {
		return 0, nil
	}

	count, err := uc.transactionRepo.BulkUpdateCategoryByPattern(
		ctx,
		rule.Pattern,
		rule.CategoryID,
		ownerType,
		ownerID,
	)
	if err != nil {
		return 0, err
	}

	return count, nil
}
```

### Update API Response DTO

**File:** `backend/internal/integration/entrypoint/dto/category_rule.go`

```go
// Modify CreateCategoryRuleResponse to include updated count
type CreateCategoryRuleResponse struct {
	ID                  string    `json:"id"`
	Pattern             string    `json:"pattern"`
	CategoryID          string    `json:"category_id"`
	CategoryName        string    `json:"category_name"`
	CategoryIcon        string    `json:"category_icon"`
	CategoryColor       string    `json:"category_color"`
	Priority            int       `json:"priority"`
	IsActive            bool      `json:"is_active"`
	OwnerType           string    `json:"owner_type"`
	OwnerID             string    `json:"owner_id"`
	CreatedAt           time.Time `json:"created_at"`
	TransactionsUpdated int       `json:"transactions_updated"` // ADD THIS
}
```

---

## Files to Create/Modify

### New Files:
- `backend/internal/application/usecase/category_rule/apply_rule_to_existing_transactions.go` - New use case

### Modified Files:
- `backend/internal/application/adapter/transaction_repository.go` - Add `BulkUpdateCategoryByPattern` method to interface
- `backend/internal/integration/persistence/transaction_repository.go` - Implement `BulkUpdateCategoryByPattern`
- `backend/internal/application/usecase/category_rule/create_category_rule.go` - Add transaction repo dependency and call apply logic
- `backend/internal/integration/entrypoint/dto/category_rule.go` - Add `transactions_updated` to response
- `backend/internal/integration/entrypoint/controller/category_rule.go` - Map new field to response
- `backend/internal/infra/dependency/injector.go` - Wire transaction repo to create rule use case
- `e2e/tests/m6-rules/rule-application.spec.ts` - Add new E2E test case

---

## Step-by-Step Execution Instructions

### Step 1: Create E2E Test (TDD)

Add the new test to `e2e/tests/m6-rules/rule-application.spec.ts` as specified above. Run the test to confirm it fails:

```bash
cd e2e && npx playwright test tests/m6-rules/rule-application.spec.ts --grep "M6-E2E-17i"
```

Expected: Test FAILS because existing transactions are not updated.

### Step 2: Add Repository Interface Method

Edit `backend/internal/application/adapter/transaction_repository.go`:
- Add `BulkUpdateCategoryByPattern` method signature to the interface

### Step 3: Implement Repository Method

Edit `backend/internal/integration/persistence/transaction_repository.go`:
- Implement `BulkUpdateCategoryByPattern` with the SQL query

### Step 4: Create Apply Use Case (Optional)

Create `backend/internal/application/usecase/category_rule/apply_rule_to_existing_transactions.go`:
- This can be used standalone or embedded in CreateCategoryRuleUseCase

### Step 5: Modify CreateCategoryRuleUseCase

Edit `backend/internal/application/usecase/category_rule/create_category_rule.go`:
- Add `transactionRepo` dependency
- Add call to apply rule after creation
- Update output to include `TransactionsUpdated`

### Step 6: Update DTOs

Edit `backend/internal/integration/entrypoint/dto/category_rule.go`:
- Add `transactions_updated` field to response struct

### Step 7: Update Controller

Edit `backend/internal/integration/entrypoint/controller/category_rule.go`:
- Map `TransactionsUpdated` from use case output to DTO

### Step 8: Update Dependency Injection

Edit `backend/internal/infra/dependency/injector.go`:
- Pass `transactionRepo` when creating `CreateCategoryRuleUseCase`

### Step 9: Run E2E Test

```bash
cd e2e && npx playwright test tests/m6-rules/rule-application.spec.ts --grep "M6-E2E-17i"
```

Expected: Test PASSES.

### Step 10: Run All M6 Tests

```bash
cd e2e && npx playwright test tests/m6-rules/
```

Expected: All tests pass with no regressions.

---

## Acceptance Criteria

- [ ] Creating a category rule automatically updates existing uncategorized transactions that match the pattern
- [ ] Only transactions with `category_id IS NULL` are updated (already categorized transactions are not changed)
- [ ] Case-insensitive matching works correctly (e.g., "uber" matches "UBER", "Uber", "uber")
- [ ] API response includes `transactions_updated` count
- [ ] Rule creation succeeds even if transaction update fails (graceful degradation)
- [ ] New E2E test `M6-E2E-17i` passes
- [ ] All existing M6 rules tests continue to pass
- [ ] No regressions in other test suites

---

## Related Documentation

- **Backend Spec:** `context/finance-tracker-backend-tdd-v6.md` - Section 5.2 Auto-Categorization Algorithm
- **Frontend Spec:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - Section 4.5 Rules UI
- **E2E Guide:** `context/Finance-Tracker-E2E-Testing-Guide-v1.md` - Test patterns
- **Existing Tests:** `e2e/tests/m6-rules/rule-application.spec.ts` - Related test scenarios

---

## Commands to Run

```bash
# Step 1: Create E2E test and verify it fails
cd e2e && npx playwright test tests/m6-rules/rule-application.spec.ts --grep "M6-E2E-17i"

# Step 2: After backend implementation, run backend tests
cd backend && make test

# Step 3: Run E2E test to verify implementation
cd e2e && npx playwright test tests/m6-rules/rule-application.spec.ts --grep "M6-E2E-17i"

# Step 4: Run all M6 tests to check for regressions
cd e2e && npx playwright test tests/m6-rules/

# Step 5: Run full E2E suite
cd e2e && npx playwright test
```

---

## Technical Notes

### Performance Consideration

The `BulkUpdateCategoryByPattern` query uses a single UPDATE statement with a regex condition. For large transaction volumes, this is efficient because:
1. Single database round-trip
2. PostgreSQL's `~*` operator is optimized for regex matching
3. Index on `user_id` helps narrow down candidates

If performance becomes an issue with very large datasets, consider:
- Adding a GIN index for full-text search
- Batching updates by date ranges
- Running as a background job

### Edge Cases Handled

1. **Inactive rules:** Rules with `is_active = false` do not update transactions
2. **Invalid patterns:** Invalid regex patterns return error (already validated during creation)
3. **Group rules:** Updates transactions for all group members
4. **Already categorized:** Only updates transactions where `category_id IS NULL`
5. **Soft-deleted transactions:** Excluded via `deleted_at IS NULL`
