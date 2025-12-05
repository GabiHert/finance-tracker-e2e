# Task: M12-cc-import - Backend Database & Domain

## Overview

**Feature:** M12-cc-import
**Task:** 2 of 6
**Goal:** Add credit card fields to transactions table and update entity

---

## Reference Specifications

- **Feature Specs:** `context/features/M12-cc-import/`
- **Relevant File:** `infrastructure.md` (Section 2 - Migrations)
- **Relevant File:** `backend-tdd.md` (Section 2-3 - Schema & Entity)

---

## Scope

### Files to Create
- `backend/scripts/migrations/000013_add_credit_card_fields.up.sql`
- `backend/scripts/migrations/000013_add_credit_card_fields.down.sql`

### Files to Modify
- `backend/internal/domain/entity/transaction.go` - Add CC fields
- `backend/internal/integration/persistence/model/transaction.go` - Add CC fields
- `backend/internal/integration/persistence/transaction_repository.go` - Update queries

---

## Acceptance Criteria

- [ ] Migration creates correct schema with indexes and constraints
- [ ] Transaction entity has CC fields
- [ ] Repository handles CC fields properly
- [ ] Migration can be rolled back

---

## Commands

```bash
# Run migration
cd backend && go run cmd/migrate/main.go up

# Verify migration
cd backend && go run cmd/migrate/main.go status
```
