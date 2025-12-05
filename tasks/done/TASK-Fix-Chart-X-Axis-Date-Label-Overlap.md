# Task: Fix Chart X-Axis Date Label Overlap

## Overview

The "Evolucao Financeira" (Financial Evolution) chart on the dashboard displays overlapping and unreadable X-axis date labels. When there are many data points spanning multiple months, the date labels like "3/nov.", "7/nov.", "10/nov." etc. all merge together into an unreadable mess.

**Goal:** Make the X-axis date labels readable and properly spaced regardless of the number of data points.

---

## Current State Analysis

### What Exists
- **File:** `frontend/src/main/features/dashboard/components/TrendsChart.tsx`
- Custom SVG-based chart (no external charting library)
- Three-tier date formatting based on date range:
  - Same month: day only (e.g., "1", "5", "10")
  - Same year: day/month (e.g., "5/out", "10/nov.")
  - Multiple years: month abbreviation (e.g., "out", "nov")
- Label display logic in `shouldShowLabel()` function (lines 45-50):
  ```typescript
  const shouldShowLabel = (index: number, totalPoints: number): boolean => {
      if (totalPoints <= 7) return true
      if (totalPoints <= 14) return index % 2 === 0
      if (totalPoints <= 31) return index % 3 === 0 || index === totalPoints - 1
      return index % 5 === 0 || index === totalPoints - 1
  }
  ```
- SVG viewBox: `0 0 300 180` (small width for text labels)
- Chart width: 300px, padding: 20px, effective label area: ~260px

### What's Missing/Broken

1. **Label density is too high**: Even showing every 3rd label with 30+ points results in ~10 labels in 260px = ~26px per label. Date labels like "10/nov." need ~50px minimum.

2. **No consideration for label width**: The `shouldShowLabel` function only considers data point count, not the actual text width of the labels.

3. **Portuguese month abbreviations include period**: "nov." with the period makes labels slightly wider.

4. **Fixed intervals don't adapt to viewport**: The chart is responsive (`className="w-full"`), but label spacing is calculated on fixed 300px viewBox.

---

## Execution Plan

### Phase 1: Fix Label Display Logic
Update `shouldShowLabel()` to be more aggressive about hiding labels when there are many data points.

### Phase 2: Rotate Labels (Optional Enhancement)
Consider rotating labels 45 degrees for better fit, though this adds complexity.

### Phase 3: Improve Label Formatting
Shorten date labels when many points exist (e.g., remove period from month abbreviations).

### Phase 4: Verification
Visual verification that labels no longer overlap in various scenarios.

---

## Detailed Specifications

### Solution 1: More Aggressive Label Filtering (Recommended)

Update the `shouldShowLabel` function to show fewer labels:

```typescript
const shouldShowLabel = (index: number, totalPoints: number): boolean => {
    // Always show first and last labels for context
    if (index === 0 || index === totalPoints - 1) return true

    // Calculate maximum labels that fit (assuming ~50px per label in 260px usable space)
    const maxLabels = 5

    if (totalPoints <= maxLabels) return true

    // Calculate step to show approximately maxLabels evenly distributed
    const step = Math.ceil(totalPoints / (maxLabels - 1))
    return index % step === 0
}
```

### Solution 2: Dynamic Label Width Calculation (More Robust)

```typescript
const calculateVisibleLabels = (data: TrendDataPoint[], dateRange: DateRange): Set<number> => {
    const chartWidth = 260 // usable width (300 - 2*20 padding)
    const estimatedLabelWidth = dateRange.sameMonth ? 15 : 45 // day-only vs day/month
    const maxLabels = Math.floor(chartWidth / estimatedLabelWidth)

    const visibleIndices = new Set<number>()

    // Always show first and last
    visibleIndices.add(0)
    visibleIndices.add(data.length - 1)

    if (data.length <= maxLabels) {
        // Show all
        data.forEach((_, i) => visibleIndices.add(i))
    } else {
        // Distribute evenly
        const step = (data.length - 1) / (maxLabels - 1)
        for (let i = 0; i < maxLabels; i++) {
            visibleIndices.add(Math.round(i * step))
        }
    }

    return visibleIndices
}
```

### Solution 3: Shortened Date Format for Dense Data

When there are many data points, use shorter labels:

```typescript
const formatDateLabel = (dateString: string, dateRange: DateRange, totalPoints: number): string => {
    const date = new Date(dateString)

    if (dateRange.sameMonth) {
        return date.getDate().toString()
    }

    if (dateRange.sameYear) {
        const day = date.getDate()
        // Use shorter month format when many points
        if (totalPoints > 14) {
            const month = new Intl.DateTimeFormat('pt-BR', { month: 'narrow' }).format(date)
            return `${day}/${month}`
        }
        const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
        // Remove trailing period from month abbreviation
        return `${day}/${month.replace('.', '')}`
    }

    return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}
```

---

## Files to Create/Modify

### Modified Files:
- `frontend/src/main/features/dashboard/components/TrendsChart.tsx` - Update `shouldShowLabel()` and optionally `formatDateLabel()`

---

## Step-by-Step Execution Instructions

### Step 1: Update shouldShowLabel Function

Replace the current `shouldShowLabel` function (lines 45-50) with a more aggressive version:

```typescript
const shouldShowLabel = (index: number, totalPoints: number): boolean => {
    // Always show first and last labels for context
    if (index === 0 || index === totalPoints - 1) return true

    // Target: maximum 5-6 visible labels to prevent overlap
    // Chart usable width ~260px, each label needs ~50px minimum
    if (totalPoints <= 5) return true

    // Calculate step to distribute labels evenly
    const targetLabels = 5
    const step = Math.ceil((totalPoints - 1) / (targetLabels - 1))

    return index % step === 0
}
```

### Step 2: Optionally Shorten Month Abbreviations

Update `formatDateLabel` to remove the period from month abbreviations:

```typescript
const formatDateLabel = (dateString: string, dateRange: DateRange): string => {
    const date = new Date(dateString)

    if (dateRange.sameMonth) {
        return date.getDate().toString()
    }

    if (dateRange.sameYear) {
        const day = date.getDate()
        const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
        // Remove trailing period from Portuguese month abbreviations
        return `${day}/${month.replace('.', '')}`
    }

    return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}
```

### Step 3: Visual Verification

1. Run the frontend development server
2. Navigate to the dashboard
3. Verify the chart with:
   - Few data points (should show all labels)
   - Many data points (should show ~5 evenly distributed labels)
   - Data spanning multiple months

---

## Acceptance Criteria

- [ ] X-axis date labels do not overlap regardless of data point count
- [ ] First and last dates are always visible for context
- [ ] Labels are evenly distributed across the chart
- [ ] Chart remains readable with 7, 14, 30, and 60+ data points
- [ ] Month abbreviations are shortened (no trailing period)
- [ ] No regressions in chart functionality (lines, points, legend still work)
- [ ] Frontend build passes without errors

---

## Related Documentation

- **Component:** `frontend/src/main/features/dashboard/components/TrendsChart.tsx`
- **Types:** `frontend/src/main/features/dashboard/types.ts` - Contains `TrendDataPoint` interface

---

## Commands to Run

```bash
# Verify frontend build passes
cd frontend && npm run build

# Run frontend in development mode to visually verify
cd frontend && npm run dev

# Run any existing tests for the component
cd frontend && npm test -- --grep "TrendsChart"
```

---

## Visual Reference

**Before (Broken):**
```
3/nov.7/nov10/nov13/nov16/no20/no23/no28/nov1/dez.
```

**After (Fixed):**
```
3/nov     13/nov     23/nov     1/dez
```

Labels should be:
- Evenly spaced
- Not overlapping
- Include first and last dates
- Maximum ~5 visible labels
