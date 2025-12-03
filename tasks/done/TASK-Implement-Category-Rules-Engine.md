# Task: Implement Category Rules Engine (M6) - Complete Feature Implementation

## Overview

This is a comprehensive task to implement the **Category Rules Engine** feature (Milestone 6), which allows users to create regex-based rules to automatically categorize transactions. The frontend has a partial mock implementation, but the backend has no implementation at all.

**Goal:** Enable users to create rules like "transactions containing 'UBER' → Transportation category" so transactions are automatically categorized during import or manual entry.

---

## Current State Analysis

### Frontend (`frontend/src/main/features/rules/`)
- **Partial implementation exists** with mock data
- `RulesScreen.tsx` - Uses `useState` with `mockRules`, no API calls
- `RuleModal.tsx` - Modal for creating/editing rules
- `PatternHelper.tsx` - UI helper for regex generation
- `RuleRow.tsx` - Individual rule display with drag handle
- `types.ts` - TypeScript interfaces defined
- **Missing:** API integration, real backend calls

### Backend (`backend/internal/domain/entity/`)
- **No implementation** - No `category_rule.go` entity exists
- No repository, service, or handlers for category rules
- No database migration for the `category_rules` table

### E2E Tests (`e2e/tests/m6-rules/`)
- `rules.spec.ts` - Comprehensive E2E tests exist (16 scenarios)
- Tests are likely **failing** because backend API doesn't exist

---

## Execution Plan

This task should be executed in the following phases, using the project's slash commands:

### Phase 1: Requirements Verification
1. Read and understand the UI requirements in `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` (Section 4.5)
2. Read the backend API specifications in `context/finance-tracker-backend-tdd-v6.md` (Section 4.5)
3. Read the integration guide in `context/Finance-Tracker-Integration-TDD-v1.md` (Section 7)
4. Verify the E2E test scenarios in `e2e/tests/m6-rules/rules.spec.ts`

### Phase 2: Create Detailed E2E Scenarios
Create a new E2E test file that covers the **full integration flow** with explicit failure expectations. This test should validate:
- Rule CRUD operations persisted to backend
- Pattern testing against real transactions
- Rule priority reordering with backend sync
- Auto-categorization during transaction import
- Error handling for invalid patterns

### Phase 3: Backend Implementation
Execute `/implement-task` with the backend implementation task:

**Backend Tasks (from M6 specification):**
1. **M6-I1: Database Migration** - Create `category_rules` table
2. **M6-B1: CategoryRule Domain Entity** - Create entity in `backend/internal/domain/entity/category_rule.go`
3. **M6-B2: Regex Matching Engine** - Service to match patterns against transaction descriptions
4. **M6-B3: GET /category-rules** - List all rules sorted by priority
5. **M6-B4: POST /category-rules** - Create new rule
6. **M6-B5: POST /category-rules/test** - Test pattern against existing transactions
7. **M6-B6: PATCH /category-rules/reorder** - Batch update rule priorities
8. **M6-B7: PATCH /category-rules/:id** - Update single rule
9. **M6-B8: DELETE /category-rules/:id** - Delete rule

### Phase 4: Frontend Implementation
Execute `/implement-task` with the frontend implementation task:

**Frontend Tasks (from M6 specification):**
1. **M6-F0: Rules API Client** - Create `frontend/src/main/features/rules/api/rules.ts`
2. **M6-F1: Rule Row with Drag Handle** - Already exists, needs backend integration
3. **M6-F2: Pattern Helper UI** - Already exists, verify functionality
4. **M6-F3: Rules List Screen** - Convert from mock data to real API calls
5. **M6-F4: Rule Create/Edit Modal** - Add API calls for save/update
6. **M6-F5: Drag-and-Drop Reordering** - Add backend sync on reorder

### Phase 5: E2E Test Verification
Execute `/fix-e2e` to run and fix any remaining E2E test failures.

---

## Detailed Specifications

### Database Schema (from backend-tdd-v6.md Section 3.7)

```sql
CREATE TABLE category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern VARCHAR(255) NOT NULL,           -- Regex pattern
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,     -- Higher = checked first
    is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable without deleting
    owner_type VARCHAR(10) NOT NULL,         -- 'user' or 'group'
    owner_id UUID NOT NULL,                  -- user_id or group_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE (owner_type, owner_id, pattern)   -- No duplicate patterns per owner
);

CREATE INDEX idx_category_rules_owner ON category_rules(owner_type, owner_id);
CREATE INDEX idx_category_rules_priority ON category_rules(owner_type, owner_id, priority DESC);
```

### API Endpoints (from backend-tdd-v6.md Section 4.5)

#### GET /category-rules
**Response:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "pattern": ".*UBER.*",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Transportation",
        "icon": "car",
        "color": "#F59E0B"
      },
      "priority": 10,
      "is_active": true,
      "owner_type": "user",
      "owner_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /category-rules
**Request:**
```json
{
  "pattern": ".*UBER.*",
  "category_id": "uuid",
  "priority": 10,
  "owner_type": "user",
  "owner_id": "uuid"
}
```
**Response (201):** Created CategoryRule object

#### POST /category-rules/test
**Request:**
```json
{
  "pattern": ".*UBER.*"
}
```
**Response (200):**
```json
{
  "matching_transactions": [
    {
      "id": "uuid",
      "description": "UBER TRIP",
      "date": "2024-01-15",
      "amount": 25.50
    }
  ],
  "match_count": 5
}
```

#### PATCH /category-rules/reorder
**Request:**
```json
{
  "order": [
    { "id": "rule-uuid-1", "priority": 10 },
    { "id": "rule-uuid-2", "priority": 9 },
    { "id": "rule-uuid-3", "priority": 8 }
  ]
}
```
**Response (200):** Updated array of CategoryRule objects

#### PATCH /category-rules/:id
**Request:** Partial update of rule fields
**Response (200):** Updated CategoryRule object

#### DELETE /category-rules/:id
**Response (204):** No content

### Frontend Pattern Helper Logic (from UI Requirements v3.0 Section 4.5.2)

The Pattern Helper converts user-friendly match types to regex:

| Match Type | User Input | Generated Regex |
|------------|------------|-----------------|
| Contém | UBER | `.*UBER.*` |
| Começa com | PIX | `^PIX.*` |
| Exato | NETFLIX | `^NETFLIX$` |
| Regex personalizado | (raw) | User's exact input |

```typescript
function generateRegex(matchType: MatchType, pattern: string): string {
  switch (matchType) {
    case 'contains':
      return `.*${escapeRegex(pattern)}.*`
    case 'starts_with':
      return `^${escapeRegex(pattern)}.*`
    case 'exact':
      return `^${escapeRegex(pattern)}$`
    case 'custom':
      return pattern  // Raw regex from user
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

---

## E2E Test Scenarios to Validate

The following E2E tests in `e2e/tests/m6-rules/rules.spec.ts` must pass:

1. **M6-E2E-001:** Display rules screen with navigation
2. **M6-E2E-002:** Open rule creation modal with pattern helper
3. **M6-E2E-003:** Create rule with "Contains" match type
4. **M6-E2E-004:** Create rule with "Starts with" match type
5. **M6-E2E-005:** Create rule with "Exact" match type
6. **M6-E2E-006:** Test pattern against existing transactions
7. **M6-E2E-007:** Edit an existing rule
8. **M6-E2E-008:** Delete a rule
9. **M6-E2E-009:** Display drag handles for priority reordering
10. **M6-E2E-010:** Reorder rules by drag and drop
11. **M6-E2E-011:** Show priority indicators on rules
12. **M6-E2E-012:** Navigate to rules from sidebar/menu
13. **M6-E2E-013:** Display empty state when no rules exist
14. **M6-E2E-014:** Validate pattern input
15. **M6-E2E-015:** Cancel rule creation
16. **M6-E2E-016:** Support custom regex match type

---

## Step-by-Step Execution Instructions

### Step 1: Explore and Understand the Codebase

First, thoroughly explore the existing codebase patterns:

```
# Frontend patterns to study:
frontend/src/main/features/categories/api/categories.ts  # API client pattern
frontend/src/main/features/transactions/api/transactions.ts  # Another API example
frontend/src/main/features/rules/  # Existing mock implementation

# Backend patterns to study:
backend/internal/domain/entity/category.go  # Entity pattern
backend/internal/application/*/  # Service layer pattern
backend/internal/integration/handler/  # HTTP handler pattern
backend/internal/infrastructure/repository/  # Repository pattern
backend/test/integration/  # BDD test pattern
```

Read the following context files completely:
- `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` (Section 4.5)
- `context/finance-tracker-backend-tdd-v6.md` (Section 3.7, 4.5)
- `context/Finance-Tracker-Integration-TDD-v1.md` (Section 7)
- `context/Finance-Tracker-Implementation-Guide-Complete-v1.md` (Milestone 6)

### Step 2: Create Enhanced E2E Test

Create a new E2E test file `e2e/tests/m6-rules/rules-integration.spec.ts` that tests the full integration:

```typescript
/**
 * M6-E2E: Category Rules Integration Tests
 *
 * These tests validate the complete category rules flow including:
 * - Backend API integration (not just mock data)
 * - Persistence across page reloads
 * - Pattern testing with real transaction data
 * - Auto-categorization during import
 *
 * EXPECTED: These tests will FAIL until full implementation is complete.
 */
```

Key scenarios to add:
1. Create rule → Reload page → Rule still exists (tests persistence)
2. Create rule with UBER pattern → Import CSV with UBER transactions → Verify auto-categorization
3. Test pattern → Verify matches real transactions from database
4. Create multiple rules → Reorder → Reload → Order preserved

### Step 3: Implement Backend

Run the following command to implement the backend:

```
/implement-task
```

Provide this context to the implementation:
- Follow Clean Architecture patterns in the existing codebase
- Create BDD feature files first (in `backend/test/integration/features/`)
- Implement domain entity, repository, service, and handler layers
- Use the existing patterns from categories and transactions features

### Step 4: Implement Frontend

Run the following command to implement the frontend:

```
/implement-task
```

Provide this context to the implementation:
- Create `frontend/src/main/features/rules/api/rules.ts` following the pattern in `categories/api/categories.ts`
- Update `RulesScreen.tsx` to use real API calls instead of mock data
- Add error handling and loading states
- Ensure optimistic updates for better UX

### Step 5: Verify E2E Tests

Run the following command to fix any failing E2E tests:

```
/fix-e2e
```

This should run all M6 E2E tests and fix any remaining issues.

---

## Files to Create/Modify

### Backend (New Files):
- `backend/internal/domain/entity/category_rule.go`
- `backend/internal/application/category_rule/service.go`
- `backend/internal/application/category_rule/repository.go`
- `backend/internal/integration/handler/category_rule_handler.go`
- `backend/internal/infrastructure/repository/postgres/category_rule_repository.go`
- `backend/internal/infrastructure/db/migrations/XXXXXX_create_category_rules.up.sql`
- `backend/internal/infrastructure/db/migrations/XXXXXX_create_category_rules.down.sql`
- `backend/test/integration/features/category_rules.feature`
- `backend/test/integration/category_rules_test.go`

### Frontend (New/Modified Files):
- `frontend/src/main/features/rules/api/rules.ts` (NEW)
- `frontend/src/main/features/rules/RulesScreen.tsx` (MODIFY - add API integration)
- `frontend/src/main/features/rules/RuleModal.tsx` (MODIFY - add API calls)
- `frontend/src/main/features/rules/mock-data.ts` (DELETE - no longer needed)

### E2E Tests:
- `e2e/tests/m6-rules/rules-integration.spec.ts` (NEW - integration tests)

---

## Acceptance Criteria

- [ ] Category rules can be created, read, updated, and deleted via API
- [ ] Rules are persisted in the database and survive page reloads
- [ ] Pattern helper correctly generates regex for all match types
- [ ] "Test Pattern" shows matching transactions from real database
- [ ] Drag-and-drop reordering syncs with backend
- [ ] Rules are applied during transaction import (future milestone integration)
- [ ] All 16 E2E test scenarios pass
- [ ] No regressions in other features

---

## Related Documentation

- **UI Requirements:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` (Section 4.5)
- **Backend TDD:** `context/finance-tracker-backend-tdd-v6.md` (Section 3.7, 4.5)
- **Integration Guide:** `context/Finance-Tracker-Integration-TDD-v1.md` (Section 7)
- **Implementation Guide:** `context/Finance-Tracker-Implementation-Guide-Complete-v1.md` (Milestone 6)
- **E2E Testing Guide:** `context/Finance-Tracker-E2E-Testing-Guide-v1.md` (Milestone 6)

---

## Command Sequence Summary

Execute the following commands in order:

1. **Research Phase:** Read all context files and understand patterns
2. **E2E Creation:** Create detailed integration E2E test file
3. **Backend:** `/implement-task` with backend specifications
4. **Frontend:** `/implement-task` with frontend specifications
5. **Verification:** `/fix-e2e` to ensure all tests pass

This ensures a TDD/BDD approach where tests are defined first, then implementation follows.
