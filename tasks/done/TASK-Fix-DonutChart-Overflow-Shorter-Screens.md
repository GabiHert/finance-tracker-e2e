# Task: Fix DonutChart Overflow on Shorter/Medium Screens

## Overview

The "Despesas por Categoria" (DonutChart) component has layout issues on medium-width screens (not mobile, but shorter than full desktop). Based on the screenshot:

1. **Total amount overflow**: The "R$ 20.563,27" total is displaying outside the card boundary on the left side
2. **Legend text overlap**: Category names and percentages overlap (e.g., "Uncategorized66.2%" instead of "Uncategorized 66.2%")
3. **Spacing issues**: Numbers run together without proper spacing between name and percentage

**Goal:** Ensure the DonutChart component displays correctly on all screen sizes with no overflow or text overlap.

---

## Current State Analysis

### What Exists

**DonutChart.tsx** (lines 29-80):
- Container: `bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4`
- Main layout: `flex items-center gap-8` (chart + legend side by side)
- Chart container: `relative w-32 h-32` (fixed 128px)
- Legend container: `flex-1 space-y-2` (takes remaining space)
- Legend items: `flex items-center justify-between text-sm`
  - Left side: Color dot + category name
  - Right side: Percentage

**DashboardScreen.tsx** (lines 228-235):
- Grid layout: `grid grid-cols-1 lg:grid-cols-3 gap-4`
- DonutChart is in a single column: `<div><DonutChart /></div>`
- On screens < 1024px (lg breakpoint), it becomes full width

### What's Missing/Broken

1. **Total amount positioning**: The absolute-positioned total (`absolute inset-0`) works when the chart is within its container, but when the container shrinks on medium screens, the formatted currency may not fit
2. **Legend text overflow**: When the card width shrinks, the `justify-between` layout pushes percentage to the right edge, but long category names don't truncate, causing overlap
3. **No minimum width constraint**: The component doesn't have a `min-width` to prevent extreme shrinking
4. **Gap too large**: `gap-8` (32px) between chart and legend may be too much on constrained widths
5. **Fixed chart size**: `w-32 h-32` (128px) doesn't scale down on smaller containers

---

## Execution Plan

### Phase 1: Fix Total Amount Display
Ensure the total amount stays within the donut center on all screen sizes.

### Phase 2: Fix Legend Text Overflow
Add truncation and proper spacing to prevent category name/percentage overlap.

### Phase 3: Add Responsive Adjustments
Make the chart and legend responsive to container width.

### Phase 4: Verification
Test on various viewport widths, especially 768px-1024px range.

---

## Detailed Specifications

### 1. Total Amount Display Fix

**Problem**: The total amount "R$ 20.563,27" is positioned in the center of the donut but overflows outside the card.

**Current (lines 62-64):**
```tsx
<div className="absolute inset-0 flex items-center justify-center">
  <span className="text-sm font-medium text-[var(--color-text)]">{formatCurrency(total)}</span>
</div>
```

**Solution**: Make the text smaller on constrained widths and add text wrapping prevention:
```tsx
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <span className="text-xs sm:text-sm font-medium text-[var(--color-text)] text-center px-2 leading-tight">
    {formatCurrency(total)}
  </span>
</div>
```

### 2. Legend Text Overflow Fix

**Problem**: Category names run into percentages (e.g., "Uncategorized66.2%")

**Current (lines 67-76):**
```tsx
<div data-testid="chart-legend" className="flex-1 space-y-2">
  {data.map((item) => (
    <div key={item.categoryId} className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.categoryColor }} />
        <span className="text-[var(--color-text)]">{item.categoryName}</span>
      </div>
      <span className="text-[var(--color-text-secondary)]">{item.percentage.toFixed(1)}%</span>
    </div>
  ))}
</div>
```

**Solution**: Add minimum gap, truncation, and flex-shrink control:
```tsx
<div data-testid="chart-legend" className="flex-1 space-y-2 min-w-0">
  {data.map((item) => (
    <div key={item.categoryId} className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />
        <span className="text-[var(--color-text)] truncate">{item.categoryName}</span>
      </div>
      <span className="text-[var(--color-text-secondary)] flex-shrink-0 tabular-nums">
        {item.percentage.toFixed(1)}%
      </span>
    </div>
  ))}
</div>
```

**Key changes:**
- Added `min-w-0` to legend container (allows children to shrink below content size)
- Changed from `justify-between` to `gap-3` (consistent spacing)
- Added `min-w-0 flex-1` to name container (allows truncation)
- Added `flex-shrink-0` to color dot (prevents dot from shrinking)
- Added `truncate` to category name (ellipsis for long names)
- Added `flex-shrink-0 tabular-nums` to percentage (prevents shrinking, aligns numbers)

### 3. Responsive Layout Adjustments

**Problem**: Fixed `gap-8` and `w-32 h-32` don't adapt to container constraints.

**Current (lines 36-37):**
```tsx
<div className="flex items-center gap-8">
  <div data-testid="chart-container" className="relative w-32 h-32">
```

**Solution**: Add responsive gap and chart size:
```tsx
<div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
  <div data-testid="chart-container" className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 flex-shrink-0">
```

**Key changes:**
- Responsive gap: `gap-4 sm:gap-6 lg:gap-8` (16px → 24px → 32px)
- Responsive chart size: `w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32` (96px → 112px → 128px)
- Added `flex-shrink-0` to prevent chart from shrinking

### 4. Container Minimum Width

**Add overflow handling to the main container:**

**Current (lines 30-32):**
```tsx
<div
  data-testid="category-donut"
  className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4"
>
```

**Solution**: Add overflow hidden to prevent content from escaping:
```tsx
<div
  data-testid="category-donut"
  className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 overflow-hidden"
>
```

---

## Files to Create/Modify

### Modified Files:

1. **`frontend/src/main/features/dashboard/components/DonutChart.tsx`**
   - Line 32: Add `overflow-hidden` to container
   - Line 36: Add responsive gap classes
   - Line 37: Add responsive chart size and flex-shrink-0
   - Lines 62-64: Adjust total amount text size and padding
   - Lines 67-76: Fix legend layout with truncation and proper spacing

---

## Step-by-Step Execution Instructions

### Step 1: Open DonutChart.tsx

Open the file at:
`frontend/src/main/features/dashboard/components/DonutChart.tsx`

### Step 2: Update Main Container (line 32)

Change:
```tsx
className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4"
```

To:
```tsx
className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 overflow-hidden"
```

### Step 3: Update Flex Container (line 36)

Change:
```tsx
<div className="flex items-center gap-8">
```

To:
```tsx
<div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
```

### Step 4: Update Chart Container (line 37)

Change:
```tsx
<div data-testid="chart-container" className="relative w-32 h-32">
```

To:
```tsx
<div data-testid="chart-container" className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 flex-shrink-0">
```

### Step 5: Update Total Amount Display (lines 62-64)

Change:
```tsx
<div className="absolute inset-0 flex items-center justify-center">
  <span className="text-sm font-medium text-[var(--color-text)]">{formatCurrency(total)}</span>
</div>
```

To:
```tsx
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <span className="text-xs sm:text-sm font-medium text-[var(--color-text)] text-center px-1 leading-tight">
    {formatCurrency(total)}
  </span>
</div>
```

### Step 6: Update Legend Container (line 67)

Change:
```tsx
<div data-testid="chart-legend" className="flex-1 space-y-2">
```

To:
```tsx
<div data-testid="chart-legend" className="flex-1 space-y-2 min-w-0">
```

### Step 7: Update Legend Items (lines 68-75)

Change:
```tsx
{data.map((item) => (
  <div key={item.categoryId} className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.categoryColor }} />
      <span className="text-[var(--color-text)]">{item.categoryName}</span>
    </div>
    <span className="text-[var(--color-text-secondary)]">{item.percentage.toFixed(1)}%</span>
  </div>
))}
```

To:
```tsx
{data.map((item) => (
  <div key={item.categoryId} className="flex items-center gap-3 text-sm">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />
      <span className="text-[var(--color-text)] truncate">{item.categoryName}</span>
    </div>
    <span className="text-[var(--color-text-secondary)] flex-shrink-0 tabular-nums">
      {item.percentage.toFixed(1)}%
    </span>
  </div>
))}
```

---

## Acceptance Criteria

- [ ] Total amount (e.g., "R$ 20.563,27") stays inside the donut chart center on all screen widths
- [ ] Category names truncate with ellipsis when too long
- [ ] Percentages are always visible and properly spaced from category names
- [ ] No text overlap between category name and percentage
- [ ] Chart scales appropriately on medium screens (768px - 1024px)
- [ ] Legend items have consistent spacing
- [ ] No horizontal overflow/scrolling on the card
- [ ] No visual regressions on desktop (> 1024px)
- [ ] All existing E2E tests continue to pass

---

## Related Documentation

- **File:** `frontend/CLAUDE.md` - Frontend conventions and Tailwind usage
- **File:** `frontend/src/main/styles/globals.css` - CSS variables and tokens
- **Tests:** `e2e/tests/dashboard/` - Dashboard E2E tests

---

## Commands to Run

```bash
# Run frontend in development mode
cd frontend && npm run dev

# Test at various viewport widths in browser DevTools:
# - 768px (iPad portrait)
# - 900px (narrow desktop)
# - 1024px (lg breakpoint)
# - 1280px (full desktop)

# Run dashboard E2E tests
cd e2e && npx playwright test tests/dashboard/

# Build check
cd frontend && npm run build
```

---

## Visual Reference

From the screenshot, the specific issues are:

1. **Total amount overflow**: "R$ 20.563,27" appears OUTSIDE the card on the left side, overlapping with content
2. **Legend overlap**:
   - "Uncategorized66.2%" - no space between name and percentage
   - "Limpeza" and "2.0%" properly spaced (but others not)
   - "Comida" and "0.0%" properly spaced

The issue appears to be:
- The total amount is positioned absolutely but the container has no overflow handling
- The legend uses `justify-between` which works when there's enough space, but fails when the category name is too long

---

## Technical Notes

### Why `min-w-0` is needed

In flexbox, children have an implicit `min-width: auto` which prevents them from shrinking below their content size. Adding `min-w-0` overrides this, allowing the text to truncate.

### Why `flex-shrink-0` on percentage

The percentage column should never shrink - it always needs to show the full value. The category name should be the element that truncates.

### Why `tabular-nums`

This Tailwind class applies `font-variant-numeric: tabular-nums` which ensures all digits have the same width, making the percentages align nicely in the legend.
