# Missing E2E Tests - Implementation Summary

## Overview

This document summarizes all missing E2E test scenarios identified during the QA review of the Finance Tracker frontend views. Tests are prioritized by importance and grouped by milestone.

## Priority Legend

- **Critical**: Must have for production - blocks release
- **High**: Should have - significantly impacts user experience
- **Medium**: Nice to have - improves quality
- **Low**: Future enhancement - can be deferred

---

## Summary by Milestone

| Milestone | Missing Tests | Critical | High | Medium | Low |
|-----------|---------------|----------|------|--------|-----|
| M2 - Auth | 3 | 0 | 0 | 3 | 0 |
| M3 - Categories | 6 | 0 | 2 | 2 | 2 |
| M4 - Transactions | 7 | 0 | 2 | 4 | 1 |
| M5 - Import | 7 | 0 | 2 | 3 | 2 |
| M6 - Rules | 7 | 0 | 2 | 2 | 3 |
| M7 - Goals | 7 | 0 | 2 | 3 | 2 |
| M8 - Dashboard | 7 | 0 | 1 | 4 | 2 |
| M9 - Groups | 9 | 0 | 3 | 2 | 4 |
| M10 - Settings | 9 | 0 | 1 | 3 | 5 |
| M11 - Polish | 12 | 0 | 1 | 5 | 6 |
| **Total** | **74** | **0** | **16** | **31** | **27** |

---

## Recommended Implementation Order

### Phase 1: High Priority (16 tests)
Focus on core user journeys and data integrity.

1. **M3**: Complete category creation flow
2. **M3**: Complete category edit flow
3. **M4**: Complete transaction creation flow
4. **M4**: Complete transaction edit flow
5. **M5**: OFX file import
6. **M5**: Auto-apply categories via rules
7. **M6**: Rule auto-application on import
8. **M6**: Rule application on manual entry
9. **M7**: Goal progress update after transaction
10. **M7**: Over-limit alert banner on dashboard
11. **M8**: Period comparison data accuracy
12. **M9**: Accept group invitation
13. **M9**: Remove member from group
14. **M9**: Shared transaction creation
15. **M10**: Theme toggle (dark mode)
16. **M11**: Toast notification display

### Phase 2: Medium Priority (31 tests)
Focus on feature completeness and error handling.

- M2: Token expiry, auto-refresh, session messages
- M3: Form validation, empty state, combined filters
- M4: Delete flow, bulk delete, date range filtering
- M5: Bank-specific format, large file, error handling
- M6: Conflicting rules, case sensitivity
- M7: Approaching limit notification, duplicate goals
- M8: Loading state, empty state, chart interactions
- M9: Decline invitation, transfer admin, leave group
- M10: Email update, data export, password strength
- M11: Toast dismissal, multiple toasts, keyboard navigation

### Phase 3: Low Priority (27 tests)
Focus on edge cases and polish.

- Future enhancements and nice-to-have features
- Performance optimizations
- Advanced accessibility features

---

## Quick Reference: Test Files to Create

```
e2e/tests/
├── m2-auth/
│   └── token-expiry.spec.ts          # Token duration tests
├── m3-categories/
│   ├── create-category.spec.ts       # Full CRUD flow
│   └── category-validation.spec.ts   # Form validation
├── m4-transactions/
│   ├── transaction-crud.spec.ts      # Full CRUD flow
│   └── transaction-filters.spec.ts   # Filter combinations
├── m5-import/
│   ├── ofx-import.spec.ts           # OFX format support
│   └── import-errors.spec.ts        # Error handling
├── m6-rules/
│   ├── rule-application.spec.ts     # Auto-categorization
│   └── rule-conflicts.spec.ts       # Priority conflicts
├── m7-goals/
│   ├── goal-updates.spec.ts         # Progress updates
│   └── goal-alerts.spec.ts          # Notification tests
├── m8-dashboard/
│   ├── dashboard-calculations.spec.ts # Trend accuracy
│   └── dashboard-states.spec.ts     # Loading/empty states
├── m9-groups/
│   ├── group-invitations.spec.ts    # Accept/decline flow
│   └── group-members.spec.ts        # Member management
├── m10-settings/
│   ├── theme-toggle.spec.ts         # Dark mode
│   └── password-change.spec.ts      # Password validation
└── m11-polish/
    ├── toast-notifications.spec.ts  # Toast system
    └── keyboard-navigation.spec.ts  # A11y navigation
```

---

## Next Steps

1. Review this summary with the development team
2. Prioritize based on current sprint goals
3. Create test files following existing patterns
4. Run tests against staging environment
5. Update review documents as tests are implemented

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial summary document |
