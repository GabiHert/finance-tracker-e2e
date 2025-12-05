# Task: Fix Dashboard Metric Card Number Overflow at Certain Screen Ratios

## Overview

The dashboard metric cards (Saldo Total, Receitas, Despesas, Economia) display currency values that overflow outside their card boundaries at certain screen ratios, particularly in the 2-column layout (tablet/medium screen sizes). This creates a poor user experience where numbers are cut off or extend beyond their containers.

**Goal:** Make the metric card currency values responsive so they never overflow their containers at any screen ratio, while maintaining readability.

---

## Current State Analysis

### What Exists

**File:** `frontend/src/main/features/dashboard/components/MetricCard.tsx`

The MetricCard component uses:
- Fixed `text-2xl` (24px) font size for currency values - not responsive
- Fixed `p-4` (16px) padding - doesn't adapt to screen size
- No overflow handling (missing `overflow-hidden`, `truncate`, or responsive text classes)
- Brazilian currency format produces long strings like "R$ 19.636,52"

**Current problematic code (lines 103-106):**
```tsx
<span data-testid="metric-value" className={`text-2xl font-bold ${getValueColor()}`}>
    {type === 'expenses' ? '-' : ''}
    {formatCurrency(value, type === 'expenses' || type === 'income')}
</span>
```

**File:** `frontend/src/main/features/dashboard/DashboardScreen.tsx`

Grid layout (line 143):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
```

This creates problematic scenarios:
- At `sm` breakpoint (640px-1023px): 2-column grid with narrow cards
- Cards at this width cannot accommodate fixed `text-2xl` values

### What's Missing/Broken

1. **No responsive font sizing** - Currency values use fixed `text-2xl` regardless of card width
2. **No text overflow prevention** - Long currency values can overflow container
3. **No min-width constraint** - Cards can shrink too small for their content
4. **No auto-sizing text** - Font doesn't adapt based on available space

---

## Execution Plan

### Phase 1: Update MetricCard Component

Implement responsive text sizing and overflow prevention.

### Phase 2: Verify Visual Fix

Test at various screen widths to ensure numbers stay within bounds.

### Phase 3: E2E Test (Verification)

Add visual regression checks if applicable.

---

## Detailed Specifications

### Solution Approach

Apply responsive text sizing using Tailwind classes:

1. **Responsive font size for currency values:**
   - Mobile (xs): `text-lg` (18px)
   - Small screens (sm - 2 columns): `text-xl` (20px)
   - Large screens (lg - 4 columns): `text-2xl` (24px)

2. **Add text overflow prevention:**
   - Add `overflow-hidden` to prevent content from overflowing
   - Add `whitespace-nowrap` to prevent wrapping
   - Consider `truncate` as fallback (shows ellipsis if still too long)

3. **Optional: Dynamic font sizing based on value length:**
   - For values over 10 characters, use smaller font

### MetricCard Component Changes

**File:** `frontend/src/main/features/dashboard/components/MetricCard.tsx`

**Current (line 103-106):**
```tsx
<span data-testid="metric-value" className={`text-2xl font-bold ${getValueColor()}`}>
    {type === 'expenses' ? '-' : ''}
    {formatCurrency(value, type === 'expenses' || type === 'income')}
</span>
```

**Updated:**
```tsx
<span
    data-testid="metric-value"
    className={`text-lg sm:text-xl lg:text-2xl font-bold ${getValueColor()} overflow-hidden whitespace-nowrap`}
>
    {type === 'expenses' ? '-' : ''}
    {formatCurrency(value, type === 'expenses' || type === 'income')}
</span>
```

### Alternative Solution: Container with Min-Width

If responsive text alone is insufficient, add min-width to the card container:

**Current (line 86):**
```tsx
className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 flex flex-col"
```

**Updated:**
```tsx
className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 flex flex-col min-w-0"
```

The `min-w-0` allows flex items to shrink below their content size, enabling text truncation to work.

---

## Files to Create/Modify

### Modified Files:
- `frontend/src/main/features/dashboard/components/MetricCard.tsx` - Add responsive text classes and overflow handling

---

## Step-by-Step Execution Instructions

### Step 1: Update MetricCard currency value styling

Edit `frontend/src/main/features/dashboard/components/MetricCard.tsx`:

Change line 103-106 from:
```tsx
<span data-testid="metric-value" className={`text-2xl font-bold ${getValueColor()}`}>
```

To:
```tsx
<span
    data-testid="metric-value"
    className={`text-lg sm:text-xl lg:text-2xl font-bold ${getValueColor()} overflow-hidden`}
>
```

### Step 2: Add min-w-0 to card container (if needed)

If overflow still occurs, update line 86 to add `min-w-0`:
```tsx
className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 flex flex-col min-w-0"
```

### Step 3: Test at various screen widths

Open browser and test at these widths:
- 360px (mobile)
- 640px (sm breakpoint - 2 columns)
- 768px (tablet)
- 1024px (lg breakpoint - 4 columns)
- 1280px (desktop)

Verify that currency values like "R$ 19.636,52" and "-R$ 20.302,70" stay within card bounds.

### Step 4: Run existing tests

```bash
cd frontend && npm run test
```

### Step 5: Build verification

```bash
cd frontend && npm run build
```

---

## Acceptance Criteria

- [ ] Currency values in metric cards never overflow their container boundaries
- [ ] Text is readable at all breakpoints (mobile, tablet, desktop)
- [ ] Font size adapts responsively:
  - Smaller on mobile/tablet 2-column layout
  - Larger on desktop 4-column layout
- [ ] Visual consistency maintained across all 4 metric cards
- [ ] No truncation with ellipsis for typical currency values (up to R$ 999.999,99)
- [ ] Existing E2E tests pass
- [ ] Build completes without errors

---

## Related Documentation

- **File:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - Metric Card specs (Section 3.3.2)
- **File:** `frontend/src/main/features/dashboard/components/MetricCard.tsx` - Component to modify
- **File:** `frontend/src/main/features/dashboard/DashboardScreen.tsx` - Parent grid layout

---

## Commands to Run

```bash
# Navigate to frontend
cd frontend

# Run unit tests
npm run test

# Build verification
npm run build

# Run E2E tests (from e2e directory)
cd ../e2e && npx playwright test tests/dashboard/

# Visual testing (manual)
npm run dev
# Then resize browser to various widths and verify cards
```

---

## Visual Reference

From the user's screenshot, the issue is visible with:
- "R$ 19.636,52" (Receitas) - number extends beyond card boundary
- "-R$ 20.302,70" (Despesas) - number with minus sign overflows

The fix should ensure these values fit within their card containers at all screen sizes.

---

## Technical Notes

### Tailwind Breakpoints Used:
- `sm:` - 640px and up (tablet, 2-column layout)
- `lg:` - 1024px and up (desktop, 4-column layout)

### Font Size Reference:
- `text-lg` = 1.125rem (18px)
- `text-xl` = 1.25rem (20px)
- `text-2xl` = 1.5rem (24px)

### Brazilian Currency Format:
- Format: "R$ X.XXX,XX"
- Max practical length: "R$ 999.999,99" = 14 characters
- With negative prefix: "-R$ 999.999,99" = 15 characters
