# Feature: Smart Credit Card Reconciliation

**Code:** M15-smart-reconciliation
**Milestone:** M15
**Status:** Specification Complete

## Overview

### Problem Statement
Currently, users must follow a strict order when importing credit card data:
1. First, ensure the bill payment ("Pagamento de fatura") exists in the system
2. Then, import the CC statement CSV
3. Manually select which bill payment to link

This creates friction because users must remember the correct order, and if they import CC transactions first, those transactions remain "orphaned" until manually matched.

### Solution
**"Import anything, in any order. The system figures it out."**

Smart Reconciliation enables automatic detection and linking of credit card transactions to their corresponding bill payments, regardless of import order. When users import CC statements before their bank statement, the system stores the transactions with a "pending" status. When the bill payment is later imported (or manually created), the system automatically detects the match and links them together.

## User Stories

- As a user, I want to import my CC statement without worrying about whether the bill exists, so that I can work in any order
- As a user, I want to see pending CC transactions clearly marked, so that I know they're waiting for a bill link
- As a user, I want the system to automatically link my CC transactions to bills, so that I don't have to manually match them
- As a user, I want to be notified when auto-linking occurs, so that I stay informed about changes
- As a user, I want to manually override auto-links if needed, so that I maintain control
- As a user, I want to see a dashboard indicator for pending reconciliations, so that I know when action might be needed

## Key Features

### 1. Order-Independent Import
- CC statements can be imported before, after, or simultaneously with bank statements
- No more "orphaned" transactions - all imports work regardless of order

### 2. Automatic Matching
- Billing cycle matching (YYYY-MM format)
- Amount tolerance: ±2% or R$20 (whichever is greater)
- Date range validation: ±15 days from billing cycle month
- Confidence-based linking (high/medium/low)

### 3. Visual Feedback
- "Aguardando fatura" badge on pending CC transactions
- Dashboard indicator for months with pending reconciliations
- Toast notifications when auto-linking occurs
- Amount mismatch warnings

### 4. Manual Override
- Users can manually link transactions to different bills
- Collapse (unlink) functionality remains available
- Force-link option for non-matching amounts (with confirmation)

### 5. Disambiguation
- Multiple potential bill matches show selection dialog
- Full details displayed: amount, date, description, category

## Dependencies

### Requires
- **M12-cc-import:** Core CC import functionality, transaction fields, linking mechanism
- **Core Transactions:** Base transaction CRUD operations

### Enables
- Future multi-card support
- Enhanced reporting on CC spending patterns

## Specification Files

| File | Description |
|------|-------------|
| [ui-requirements.md](./ui-requirements.md) | Frontend UI specifications |
| [integration.md](./integration.md) | API contracts & state management |
| [backend-tdd.md](./backend-tdd.md) | Backend implementation specs |
| [infrastructure.md](./infrastructure.md) | Database migrations & infrastructure |
| [e2e-scenarios.md](./e2e-scenarios.md) | End-to-end test scenarios |

## Quick Links

- **Frontend Code:** `frontend/src/main/features/credit-card/`
- **Backend Code:** `backend/internal/application/usecase/credit_card/`
- **E2E Tests:** `e2e/tests/M15-smart-reconciliation/`
- **Related Feature:** `context/features/M12-cc-import/`

## Implementation Checklist

- [ ] UI Requirements reviewed
- [ ] Integration contracts defined
- [ ] Backend TDD scenarios written
- [ ] Infrastructure migrations defined
- [ ] E2E scenarios defined
- [ ] Ready for implementation

## Success Metrics

1. Users can import in any order without confusion
2. 90%+ of CC/bill matches happen automatically
3. Zero user complaints about "orphaned" transactions
4. Import flow feels seamless and intelligent

## Out of Scope (For Now)

- Multi-card support (different credit cards)
- Automatic CC statement fetching via API
- Recurring bill prediction
- Cross-month installment tracking improvements
