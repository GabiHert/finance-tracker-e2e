# Task: Fix Mobile UI Overlaps on Transactions Page

## Overview

The Transactions page has several UI element overlaps when viewed on mobile devices. Based on the screenshot provided, the following issues are visible:

1. **Header section**: "Transactions" title, "Import" button, and "+ Add Transaction" button are crowded
2. **Summary cards**: The 3-column grid (Income/Expense/Net) causes text to be cut off on mobile
3. **Transaction row**: The date badge ("2025") overlaps with the transaction amount (-R$ 44,90)
4. **CC Badge overlap**: The CreditCardBadge component overlaps with the amount column

**Goal:** Make the Transactions page fully responsive on mobile devices with no element overlaps.

---

## Current State Analysis

### What Exists

**TransactionsScreen.tsx** (lines 568-616):
- Header uses `flex items-center justify-between` with no mobile breakpoint
- Summary grid uses `grid grid-cols-3 gap-4` - fixed 3 columns on all screen sizes
- No responsive adjustments for mobile header buttons

**TransactionRow.tsx** (lines 102-241):
- Row uses `flex items-center gap-4 p-4` - no mobile responsive adjustments
- Category icon is `w-10 h-10` - may be too large for mobile
- Transaction info container uses `flex items-center gap-2` for description + category + badges
- CreditCardBadge is inline with description, causing horizontal overflow
- Amount is `text-lg font-semibold` - takes fixed space

**FilterBar.tsx** (lines 38-112):
- Has mobile breakpoint: `flex flex-col sm:flex-row gap-4`
- Date range has fixed widths: `w-40` per date picker
- Category filter: `w-48`, Type filter: `w-40` - these don't shrink on mobile

**CreditCardBadge.tsx**:
- Uses `flex items-center gap-1.5 flex-wrap` - can wrap but still causes issues when inline

### What's Missing/Broken

1. **Header**: No `flex-wrap` or stacking for mobile
2. **Summary grid**: Needs `grid-cols-1 sm:grid-cols-3` or similar
3. **TransactionRow**:
   - Description/category/badges should stack vertically on mobile
   - Amount should be on its own line or have proper min-width
   - Badge positioning causes overlap with amount
4. **FilterBar**: Fixed widths cause horizontal scroll on mobile

---

## Execution Plan

### Phase 1: Fix Header Layout (Mobile Stacking)
Make header buttons wrap below the title on mobile.

### Phase 2: Fix Summary Cards Grid
Make summary cards stack vertically on mobile (1 column) and side-by-side on tablet+ (3 columns).

### Phase 3: Fix Transaction Row Layout
The main issue - restructure the row to prevent badge/amount overlap on mobile.

### Phase 4: Fix Filter Bar Widths
Make filter inputs responsive instead of fixed width.

### Phase 5: Verification
Test on mobile viewport sizes to ensure no overlaps.

---

## Detailed Specifications

### 1. Header Layout Fix

**File:** `frontend/src/main/features/transactions/TransactionsScreen.tsx`

**Current (line 573):**
```tsx
<div className="flex items-center justify-between mb-4">
```

**Change to:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
```

Also update the buttons container (line 582-589):
```tsx
<div className="flex gap-2 w-full sm:w-auto">
  <Button variant="outline" onClick={handleImport} data-testid="import-transactions-btn" className="flex-1 sm:flex-none">
    Import
  </Button>
  <Button onClick={handleAddTransaction} data-testid="add-transaction-btn" className="flex-1 sm:flex-none">
    + Add Transaction
  </Button>
</div>
```

### 2. Summary Cards Grid Fix

**File:** `frontend/src/main/features/transactions/TransactionsScreen.tsx`

**Current (line 593):**
```tsx
<div data-testid="total-summary" className="grid grid-cols-3 gap-4 mt-4">
```

**Change to:**
```tsx
<div data-testid="total-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
```

Also update each summary card to be more compact on mobile:
```tsx
<div className="p-3 sm:p-4 bg-[var(--color-success-50)] rounded-lg">
  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mb-0.5 sm:mb-1">Income</p>
  <p data-testid="income-total" className="text-lg sm:text-xl font-bold text-[var(--color-success)]">
    {formatCurrency(summary.income)}
  </p>
</div>
```

### 3. Transaction Row Layout Fix (Most Critical)

**File:** `frontend/src/main/features/transactions/components/TransactionRow.tsx`

The main layout needs restructuring for mobile. Current structure causes badge/amount overlap.

**Current (simplified):**
```
[checkbox] [icon] [info container: desc + category + badge] [amount] [actions]
```

**New mobile structure:**
```
[checkbox] [icon] [info: desc + category]  [amount]
                  [date + notes + badge]   [actions visible]
```

**Changes to TransactionRow.tsx:**

1. Make the row wrap on mobile (lines 106-114):
```tsx
<div
  data-testid={isExpandedBill ? 'expanded-bill' : 'transaction-row'}
  data-transaction-type={`transaction-row-${transaction.type}`}
  className={`
    flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4
    border-b border-[var(--color-border)]
    hover:bg-[var(--color-surface)]
    transition-colors duration-150
    cursor-pointer
    ${isSelected ? 'bg-[var(--color-primary-50)]' : ''}
    ${isExpandedBill ? 'bg-[var(--color-surface)] opacity-70' : ''}
  `.replace(/\s+/g, ' ').trim()}
  onClick={handleClick}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
```

2. Reduce icon size on mobile (lines 133-143):
```tsx
<div
  data-testid="category-icon"
  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
  style={{
    backgroundColor: `${transaction.categoryColor}20`,
    color: transaction.categoryColor,
  }}
>
  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
</div>
```

3. Restructure the info section to stack better on mobile (lines 147-188):
```tsx
{/* Transaction Info */}
<div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
  {/* Left side: Description and details */}
  <div className="flex-1 min-w-0">
    {/* Description row */}
    <div className="flex items-center gap-2 flex-wrap">
      <h3
        data-testid="transaction-description"
        className="font-medium text-[var(--color-text)] text-sm sm:text-base truncate max-w-[180px] sm:max-w-none"
      >
        {transaction.description}
      </h3>
      <span
        data-testid="transaction-category"
        className="text-xs sm:text-sm text-[var(--color-text-secondary)] hidden sm:inline"
      >
        {transaction.categoryName}
      </span>
    </div>
    {/* Date/notes row + badges on mobile */}
    <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-secondary)] flex-wrap mt-0.5">
      <span data-testid="transaction-date">{transaction.date}</span>
      {/* Show category on mobile in the second row */}
      <span className="sm:hidden">• {transaction.categoryName}</span>
      {transaction.notes && (
        <>
          <span className="hidden sm:inline">•</span>
          <span
            data-testid="transaction-notes"
            className="truncate hidden sm:inline"
            title={transaction.notes}
          >
            {transaction.notes}
          </span>
        </>
      )}
      {/* CC Badge - move to second row for mobile */}
      {(transaction.billingCycle || transaction.installmentCurrent || transaction.isExpandedBill) && (
        <CreditCardBadge
          billingCycle={transaction.billingCycle}
          hasInstallment={!!transaction.installmentCurrent}
          installmentCurrent={transaction.installmentCurrent}
          installmentTotal={transaction.installmentTotal}
          isExpanded={transaction.isExpandedBill}
          linkedCount={transaction.linkedTransactionCount}
        />
      )}
    </div>
  </div>

  {/* Amount - aligned right */}
  <div
    data-testid="transaction-amount"
    className={`
      text-base sm:text-lg font-semibold whitespace-nowrap
      ${transaction.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}
    `.replace(/\s+/g, ' ').trim()}
  >
    {transaction.type === 'expense' ? '-' : ''}
    {formatCurrency(transaction.amount)}
  </div>
</div>

{/* Action Buttons - always visible on mobile via touch */}
<div
  className={`
    flex items-center gap-1 sm:gap-2
    transition-opacity duration-150
    ${isHovered || isExpandedBill ? 'opacity-100' : 'sm:opacity-0 opacity-100'}
  `.replace(/\s+/g, ' ').trim()}
>
```

### 4. Filter Bar Width Fix

**File:** `frontend/src/main/features/transactions/components/FilterBar.tsx`

**Changes:**

1. Update date range container (lines 54-71):
```tsx
{/* Date Range */}
<div data-testid="filter-date-range" className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
  <div data-testid="filter-start-date" className="flex-1 sm:w-32 md:w-40">
    <DatePicker
      value={filters.startDate}
      onChange={value => onFiltersChange({ ...filters, startDate: value })}
      placeholder="Start date"
      data-testid="filter-start-date"
    />
  </div>
  <div data-testid="filter-end-date" className="flex-1 sm:w-32 md:w-40">
    <DatePicker
      value={filters.endDate}
      onChange={value => onFiltersChange({ ...filters, endDate: value })}
      placeholder="End date"
      data-testid="filter-end-date"
    />
  </div>
</div>
```

2. Update category filter (lines 73-82):
```tsx
{/* Category Filter */}
<div className="w-full sm:w-40 md:w-48" data-testid="filter-category">
```

3. Update type filter (lines 84-92):
```tsx
{/* Type Filter */}
<div className="w-full sm:w-32 md:w-40" data-testid="filter-type">
```

---

## Files to Create/Modify

### Modified Files:

1. **`frontend/src/main/features/transactions/TransactionsScreen.tsx`**
   - Line 573: Add mobile flex stacking to header
   - Line 582-589: Make buttons full-width on mobile
   - Line 593: Change grid to 1 column on mobile
   - Lines 594-614: Add responsive padding/text sizes to summary cards

2. **`frontend/src/main/features/transactions/components/TransactionRow.tsx`**
   - Lines 106-118: Update main flex container for mobile
   - Lines 133-143: Reduce icon size on mobile
   - Lines 147-200: Restructure info section layout
   - Lines 202-240: Make action buttons visible on mobile (touch devices)

3. **`frontend/src/main/features/transactions/components/FilterBar.tsx`**
   - Lines 54-71: Make date pickers responsive width
   - Lines 73-82: Make category filter responsive
   - Lines 84-92: Make type filter responsive

---

## Step-by-Step Execution Instructions

### Step 1: Fix TransactionsScreen.tsx Header and Summary

1. Open `frontend/src/main/features/transactions/TransactionsScreen.tsx`
2. Find line 573 - the header container
3. Change from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`
4. Find lines 582-589 - the buttons container
5. Add `w-full sm:w-auto` to the container, and `flex-1 sm:flex-none` to each button
6. Find line 593 - the summary grid
7. Change from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`
8. Add responsive text sizes to each card

### Step 2: Fix TransactionRow.tsx Layout

1. Open `frontend/src/main/features/transactions/components/TransactionRow.tsx`
2. Update the main container class to use `items-start sm:items-center` and reduce gap on mobile
3. Make the category icon smaller on mobile: `w-8 h-8 sm:w-10 sm:h-10`
4. Restructure the info section to have amount inline on desktop but allow better flow on mobile
5. Move the CC badge to the second line (date/notes row)
6. Make action buttons always visible on mobile (remove opacity-0 for mobile)

### Step 3: Fix FilterBar.tsx Widths

1. Open `frontend/src/main/features/transactions/components/FilterBar.tsx`
2. Change date picker widths from fixed `w-40` to `flex-1 sm:w-32 md:w-40`
3. Change category filter from `w-48` to `w-full sm:w-40 md:w-48`
4. Change type filter from `w-40` to `w-full sm:w-32 md:w-40`

### Step 4: Test on Mobile

1. Run `npm run dev` in frontend
2. Open browser DevTools and use mobile viewport (iPhone 12/13 - 390px width)
3. Navigate to Transactions page
4. Verify:
   - Header buttons stack below title
   - Summary cards stack vertically
   - Transaction rows have no overlap
   - CC badges don't overlap with amount
   - Filter inputs are full-width on mobile

---

## Acceptance Criteria

- [ ] Header "Transactions" title and buttons don't overlap on mobile (< 640px)
- [ ] Summary cards (Income/Expense/Net) stack vertically on mobile
- [ ] Transaction row elements don't overlap (description, category, badge, amount)
- [ ] CC Badge is visible without overlapping the amount column
- [ ] Date badge doesn't overlap with transaction amount
- [ ] Filter inputs are usable on mobile (no horizontal scroll)
- [ ] Action buttons are visible on mobile (touch-friendly)
- [ ] No visual regressions on desktop (> 768px)
- [ ] All existing E2E tests continue to pass

---

## Related Documentation

- **File:** `frontend/CLAUDE.md` - Frontend conventions and Tailwind usage
- **File:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - UI specifications
- **Tests:** `e2e/tests/transactions/` - Transactions E2E tests

---

## Commands to Run

```bash
# Run frontend in development mode
cd frontend && npm run dev

# Run all E2E tests to check for regressions
cd e2e && npx playwright test

# Run only transactions tests
cd e2e && npx playwright test tests/transactions/

# Build check
cd frontend && npm run build
```

---

## Visual Reference

From the screenshot, the specific overlaps are:

1. **Header area**: "Transactions" + "Import" + "+ Add Transaction" all on same line - too cramped
2. **Summary cards row**: "R$ 19.636," "R$ 30.144," "R$ 49.780,95" - values cut off
3. **Transaction row (bottom)**: The purple "2025" badge overlaps with "-R$ 44,90" amount
4. **Uncategorized transaction**: Shows "-R$ 44,90" overlapping with badge elements
