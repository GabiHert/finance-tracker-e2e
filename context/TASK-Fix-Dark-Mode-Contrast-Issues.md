# Task: Fix Dark Mode Contrast Issues

## Priority: High

## Problem Statement

Multiple UI components have hardcoded light-mode colors (e.g., `bg-white`) instead of using CSS variables that adapt to dark mode. This causes poor visibility and WCAG AA compliance failures when users have dark mode enabled.

## Evidence

E2E tests in `e2e/tests/m11-polish/theme-contrast.spec.ts` confirm 6 failing contrast tests:

1. **M11-CONTRAST-001**: Modal background is `rgb(255, 255, 255)` (white) in dark mode
2. **M11-CONTRAST-004**: Secondary button has 0 contrast difference between text and background
3. **M11-CONTRAST-005**: Transaction header has white background in dark mode
4. **M11-CONTRAST-007**: Transaction count text RGB value is 100 (expected >130)
5. **M11-CONTRAST-010**: Transaction list container has white background in dark mode
6. **M11-CONTRAST-011**: Summary card labels fail visibility check

## Screenshots Reference

See the original issue screenshots showing:
- Groups modal: "Nome do Grupo" and "Cancelar" button barely visible
- Transactions page: Title, date headers, transaction names, summary values not visible
- Dashboard: Period selector button barely visible

## Required Changes

### 1. Modal Component (`frontend/src/main/components/ui/Modal/Modal.tsx`)

**Line 171**: Replace hardcoded `bg-white` with design system variable

```diff
- relative z-[510] w-full bg-white
+ relative z-[510] w-full bg-[var(--color-surface-elevated)]
```

### 2. Button Component - Secondary Variant (`frontend/src/main/components/ui/Button/Button.tsx`)

**Lines 32-35**: Update secondary variant colors for dark mode support

```diff
secondary: `
-   bg-[var(--color-neutral-100)] text-[var(--color-text-primary)]
-   hover:bg-[var(--color-neutral-200)]
-   active:bg-[var(--color-neutral-300)]
+   bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]
+   hover:bg-[var(--color-border)]
+   active:bg-[var(--color-border-strong)]
    border border-[var(--color-border)]
`,
```

### 3. TransactionsScreen (`frontend/src/main/features/transactions/TransactionsScreen.tsx`)

**Line 317**: Replace header background
```diff
- <div className="p-6 bg-white border-b border-[var(--color-neutral-200)]">
+ <div className="p-6 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
```

**Lines 340, 346, 352**: Update summary card label colors
```diff
- <p className="text-sm text-[var(--color-neutral-600)] mb-1">Income</p>
+ <p className="text-sm text-[var(--color-text-secondary)] mb-1">Income</p>
```

**Line 262, 399**: Replace list container background
```diff
- <div className="bg-white">
+ <div className="bg-[var(--color-surface)]">
```

**Line 323**: Update transaction count color
```diff
- <p data-testid="transactions-count" className="text-[var(--color-neutral-500)]">
+ <p data-testid="transactions-count" className="text-[var(--color-text-secondary)]">
```

### 4. Additional Files to Audit

Check for `bg-white` or hardcoded neutral colors in:
- `TransactionRow.tsx`
- `FilterBar.tsx`
- `GroupModal.tsx`
- `GroupsScreen.tsx`
- `DashboardScreen.tsx`
- All modal components

## Validation Criteria

1. All 17 tests in `theme-contrast.spec.ts` must pass
2. Visual inspection in dark mode:
   - Modal backgrounds should be dark
   - All text should be clearly readable
   - Buttons should have visible borders/backgrounds
3. WCAG AA compliance: 4.5:1 contrast ratio for normal text

## How to Test

```bash
# Run the E2E theme contrast tests
cd e2e
npm run test -- tests/m11-polish/theme-contrast.spec.ts --project=m11-polish

# Run in headed mode to visually verify
npm run test:headed -- tests/m11-polish/theme-contrast.spec.ts --project=m11-polish
```

## Related Context

- Design system CSS variables defined in: `frontend/src/main/styles/globals.css`
- Dark mode uses `@media (prefers-color-scheme: dark)` media query
- Key color variables for dark mode:
  - `--color-background`: neutral-950
  - `--color-surface`: neutral-900
  - `--color-surface-elevated`: neutral-800
  - `--color-text-primary`: neutral-100
  - `--color-text-secondary`: neutral-400

## Estimated Scope

- Files to modify: 5-10
- Lines of code: ~30-50 line changes
- Testing: Re-run all M11 E2E tests

---

*Created by E2E theme contrast analysis - November 2025*
