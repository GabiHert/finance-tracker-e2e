# Task: Fix Category Rules Display and Auto-Categorization During Import

## Overview

Two critical issues were found in the Category Rules Engine (M6):

1. **Unknown Category Bug**: Rules display "Unknown" instead of the actual category name
2. **Rules Not Applied During Import**: Auto-categorization is not implemented during transaction import

**Goal:** Fix the category name display and implement auto-categorization so rules are applied when importing transactions.

---

## Current State Analysis

### Issue 1: Unknown Category Display

**Root Cause:** Data structure mismatch between backend API response and frontend expectation.

| Layer | What It Does | Format |
|-------|--------------|--------|
| Backend | Returns flat structure | `{ "category_name": "...", "category_icon": "...", "category_color": "..." }` |
| Frontend | Expects nested structure | `{ "category": { "name": "...", "icon": "...", "color": "..." } }` |

**Backend DTO** (`backend/internal/integration/entrypoint/dto/category_rule.go:43-56`):
```go
type CategoryRuleResponse struct {
    // ... other fields
    CategoryName  string   `json:"category_name,omitempty"`    // FLAT
    CategoryIcon  string   `json:"category_icon,omitempty"`    // FLAT
    CategoryColor string   `json:"category_color,omitempty"`   // FLAT
}
```

**Frontend Expectation** (`frontend/src/main/features/rules/api/rules.ts:5-14`):
```typescript
interface CategoryRuleApiResponse {
    category: {        // NESTED - WRONG!
        id: string
        name: string
        icon: string
        color: string
    }
}
```

**Frontend Transformation** (`frontend/src/main/features/rules/api/rules.ts:44-46`):
```typescript
categoryName: apiRule.category?.name || 'Unknown',  // category is undefined!
categoryIcon: apiRule.category?.icon || 'folder',
categoryColor: apiRule.category?.color || '#6B7280',
```

### Issue 2: Rules Not Applied During Import

**Root Cause:** Auto-categorization was never implemented.

**Current Flow:**
1. User imports CSV in `TransactionsScreen.tsx`
2. Frontend calls `POST /transactions` with user-selected category (or none)
3. Backend `CreateTransactionUseCase` creates transaction with provided category
4. **No rule matching occurs at any point**

**Backend CreateTransactionUseCase** (`backend/internal/application/usecase/transaction/create_transaction.go:59-157`):
- Accepts optional `CategoryID` parameter
- Does NOT have dependency on `CategoryRuleRepository`
- Does NOT perform pattern matching against descriptions
- Simply creates transaction with whatever category is provided (or null)

**What's Missing:**
- No `CategoryRuleRepository` dependency in `CreateTransactionUseCase`
- No pattern matching logic
- No auto-categorization service
- No API to suggest category based on description

---

## Execution Plan

### Phase 1: Fix Category Display (Frontend Only)

Fix the data structure mismatch in the frontend API transformation.

**Files to Modify:**
- `frontend/src/main/features/rules/api/rules.ts` - Fix interface and transformation

### Phase 2: Implement Auto-Categorization (Backend)

Add rule-based auto-categorization to transaction creation.

**New Files:**
- Backend service to match description against rules

**Modified Files:**
- `CreateTransactionUseCase` - Add auto-categorization when no category provided

### Phase 3: Frontend Integration

Update import flow to leverage auto-categorization.

**Modified Files:**
- Import wizard to show auto-suggested categories

### Phase 4: E2E Verification

Verify all tests pass after implementation.

---

## Detailed Specifications

### Fix 1: Category Display (Frontend)

**File:** `frontend/src/main/features/rules/api/rules.ts`

**Change 1 - Update Interface (lines 5-21):**
```typescript
// BEFORE (WRONG - expects nested)
interface CategoryRuleApiResponse {
    id: string
    pattern: string
    category_id: string
    category: {
        id: string
        name: string
        icon: string
        color: string
    }
    // ...
}

// AFTER (CORRECT - matches backend flat response)
interface CategoryRuleApiResponse {
    id: string
    pattern: string
    category_id: string
    category_name: string
    category_icon: string
    category_color: string
    priority: number
    is_active: boolean
    owner_type: string
    owner_id: string
    created_at: string
    updated_at: string
}
```

**Change 2 - Update Transformation (lines 38-52):**
```typescript
// BEFORE (WRONG)
function transformRule(apiRule: CategoryRuleApiResponse): CategoryRule {
    return {
        id: apiRule.id,
        pattern: apiRule.pattern,
        matchType: detectMatchType(apiRule.pattern),
        categoryId: apiRule.category_id,
        categoryName: apiRule.category?.name || 'Unknown',      // WRONG
        categoryIcon: apiRule.category?.icon || 'folder',       // WRONG
        categoryColor: apiRule.category?.color || '#6B7280',    // WRONG
        priority: apiRule.priority,
        isActive: apiRule.is_active,
        createdAt: apiRule.created_at,
        updatedAt: apiRule.updated_at,
    }
}

// AFTER (CORRECT)
function transformRule(apiRule: CategoryRuleApiResponse): CategoryRule {
    return {
        id: apiRule.id,
        pattern: apiRule.pattern,
        matchType: detectMatchType(apiRule.pattern),
        categoryId: apiRule.category_id,
        categoryName: apiRule.category_name || 'Unknown',       // CORRECT - flat field
        categoryIcon: apiRule.category_icon || 'folder',        // CORRECT - flat field
        categoryColor: apiRule.category_color || '#6B7280',     // CORRECT - flat field
        priority: apiRule.priority,
        isActive: apiRule.is_active,
        createdAt: apiRule.created_at,
        updatedAt: apiRule.updated_at,
    }
}
```

### Fix 2: Auto-Categorization (Backend)

#### Option A: Auto-categorize in CreateTransactionUseCase

**File:** `backend/internal/application/usecase/transaction/create_transaction.go`

Add CategoryRuleRepository dependency and auto-categorization logic:

```go
type CreateTransactionUseCase struct {
    transactionRepo  adapter.TransactionRepository
    categoryRepo     adapter.CategoryRepository
    categoryRuleRepo adapter.CategoryRuleRepository  // NEW
}

func (uc *CreateTransactionUseCase) Execute(ctx context.Context, input CreateTransactionInput) (*CreateTransactionOutput, error) {
    // ... existing validation ...

    // NEW: Auto-categorize if no category provided
    if input.CategoryID == nil {
        categoryID, err := uc.applyCategoryRules(ctx, input.UserID, input.Description)
        if err == nil && categoryID != nil {
            input.CategoryID = categoryID
        }
    }

    // ... rest of existing logic ...
}

// NEW: Apply category rules to find matching category
func (uc *CreateTransactionUseCase) applyCategoryRules(ctx context.Context, userID uuid.UUID, description string) (*uuid.UUID, error) {
    rules, err := uc.categoryRuleRepo.FindByOwner(ctx, entity.OwnerTypeUser, userID)
    if err != nil {
        return nil, err
    }

    // Sort by priority (higher first)
    sort.Slice(rules, func(i, j int) bool {
        return rules[i].Priority > rules[j].Priority
    })

    // Match against each active rule
    for _, rule := range rules {
        if !rule.IsActive {
            continue
        }

        matched, err := regexp.MatchString(rule.Pattern, description)
        if err != nil {
            continue // Skip invalid patterns
        }

        if matched {
            return &rule.CategoryID, nil
        }
    }

    return nil, nil // No match found
}
```

#### Option B: New API Endpoint for Auto-Categorization

Create `POST /category-rules/match` endpoint that accepts a description and returns the matching category:

**Request:**
```json
{
    "description": "UBER TRIP 12345"
}
```

**Response:**
```json
{
    "category_id": "uuid",
    "category_name": "Transportation",
    "rule_id": "uuid",
    "rule_pattern": ".*UBER.*"
}
```

Then frontend can call this during import to pre-fill categories.

---

## Files to Create/Modify

### Issue 1 Fix (Category Display):

**Modified Files:**
- `frontend/src/main/features/rules/api/rules.ts` - Fix interface and transformation function

### Issue 2 Fix (Auto-Categorization):

**Modified Files (Backend):**
- `backend/internal/application/usecase/transaction/create_transaction.go` - Add auto-categorization
- `backend/internal/application/adapter/category_rule_repository.go` - Ensure FindByOwner exists
- `backend/internal/infra/dependency/injector.go` - Wire new dependency

**Modified Files (Frontend - Optional Enhancement):**
- `frontend/src/main/features/transactions/TransactionsScreen.tsx` - Show auto-suggested categories

---

## Step-by-Step Execution Instructions

### Step 1: Fix Category Display (Frontend)

1. Open `frontend/src/main/features/rules/api/rules.ts`
2. Update `CategoryRuleApiResponse` interface to use flat structure
3. Update `transformRule` function to read from flat fields
4. Test by viewing the Rules screen - categories should now display correctly

### Step 2: Implement Auto-Categorization (Backend)

1. Add `CategoryRuleRepository` to `CreateTransactionUseCase` dependencies
2. Implement `applyCategoryRules` method
3. Call auto-categorization when `CategoryID` is nil in `Execute`
4. Update dependency injection in `injector.go`
5. Write BDD tests for auto-categorization
6. Run existing tests to ensure no regressions

### Step 3: E2E Verification

1. Run M6 E2E tests: `cd e2e && npx playwright test tests/m6-rules/`
2. Run full E2E suite to check for regressions
3. Manually test:
   - Create a rule with pattern `.*UBER.*` for Transportation category
   - Import a CSV with "UBER TRIP" description
   - Verify transaction is auto-categorized as Transportation

---

## Acceptance Criteria

- [ ] Rules screen displays actual category names instead of "Unknown"
- [ ] Category icons display correctly on rule rows
- [ ] Category colors display correctly on rule rows
- [ ] Transactions without a category are auto-categorized based on rules during import
- [ ] Rules are matched in priority order (higher priority first)
- [ ] Only active rules are applied
- [ ] "Despesas por Categoria" section shows correctly categorized transactions
- [ ] All existing M6 E2E tests pass
- [ ] No regressions in other features

---

## E2E Test Scenarios to Validate

### Existing Tests (should pass after Issue 1 fix):
- M6-E2E-001 through M6-E2E-016 in `e2e/tests/m6-rules/rules.spec.ts`

### New Test Scenarios for Issue 2:

```typescript
// New test file: e2e/tests/m6-rules/rules-auto-categorization.spec.ts

test.describe('M6-E2E: Auto-Categorization', () => {
    test('should auto-categorize imported transaction matching a rule', async ({ page }) => {
        // 1. Create a rule: pattern ".*UBER.*" → Transportation category
        // 2. Import CSV with transaction "UBER TRIP 12345"
        // 3. Navigate to Transactions
        // 4. Verify transaction has Transportation category
    })

    test('should apply higher priority rule when multiple rules match', async ({ page }) => {
        // 1. Create rule: ".*UBER.*" → Transportation (priority 5)
        // 2. Create rule: ".*UBER.*" → Entertainment (priority 10)
        // 3. Import CSV with "UBER TRIP"
        // 4. Verify transaction has Entertainment category (higher priority)
    })

    test('should not apply inactive rules', async ({ page }) => {
        // 1. Create rule: ".*UBER.*" → Transportation
        // 2. Deactivate the rule
        // 3. Import CSV with "UBER TRIP"
        // 4. Verify transaction has no category
    })
})
```

---

## Related Documentation

- **Task Definition:** `tasks/done/TASK-Implement-Category-Rules-Engine.md` - Original M6 implementation task
- **Backend Specs:** `context/finance-tracker-backend-tdd-v6.md` - Section 4.5 for API specs
- **UI Requirements:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - Section 4.5 for UI specs
- **E2E Tests:** `e2e/tests/m6-rules/rules.spec.ts` - Existing E2E tests

---

## Commands to Run

```bash
# After fixing Issue 1 (Frontend)
cd frontend && npm run build

# After fixing Issue 2 (Backend)
cd backend && make test

# Run M6 E2E tests
cd e2e && npx playwright test tests/m6-rules/

# Run full E2E suite
cd e2e && npx playwright test
```

---

## Priority

**Issue 1 (Unknown Category):** HIGH - Quick fix, immediate user impact
**Issue 2 (Auto-Categorization):** HIGH - Core feature functionality missing
