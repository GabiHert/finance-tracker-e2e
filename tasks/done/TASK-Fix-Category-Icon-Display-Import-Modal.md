# Task: Fix Category Icon Display in Import Transactions Modal

## Overview

The category dropdown in the Import Transactions modal displays the icon name as text (e.g., "gamepad Teste") instead of rendering the actual icon. This is a visual bug affecting the user experience during transaction categorization.

**Goal:** Display category icons as actual SVG icons in the Import Transactions category dropdown, not as text strings.

---

## Current State Analysis

### What Exists

The Import Transactions modal (`TransactionsScreen.tsx`) builds `categoryOptions` for the Select component by mapping categories:

```typescript
// TransactionsScreen.tsx lines 149-155
const categoryOptions = useMemo(() => {
	return categories.map(c => ({
		value: c.id,
		label: c.name,
		icon: c.icon,  // ❌ This is a STRING like "gamepad"
	}))
}, [categories])
```

The codebase has a proper icon system using custom SVG icons:
- Icon components are in `IconPicker.tsx`
- `getIconComponent(name)` converts icon name strings to React components
- Other components like `TransactionRow.tsx` correctly use this pattern

### What's Missing/Broken

The `icon` property in `categoryOptions` is being set to a raw string (e.g., "gamepad") instead of a React component. The Select component renders this directly:

```typescript
// Select.tsx line 384
{option.icon && <span className="flex-shrink-0">{option.icon}</span>}
```

This causes the string "gamepad" to render as text instead of rendering the actual gamepad icon component.

---

## Execution Plan

### Phase 1: Fix (Quick Implementation)

This is a straightforward bug fix - no new tests needed as it's a visual rendering issue.

1. Import `getIconComponent` from IconPicker in TransactionsScreen
2. Convert icon names to React components in categoryOptions

### Phase 2: Verification

1. Test the Import Transactions flow manually
2. Verify icons display correctly in the category dropdown
3. Ensure existing functionality is not broken

---

## Detailed Specifications

### The Fix

**File:** `frontend/src/main/features/transactions/TransactionsScreen.tsx`

**Current Code (lines 149-155):**
```typescript
const categoryOptions = useMemo(() => {
	return categories.map(c => ({
		value: c.id,
		label: c.name,
		icon: c.icon,
	}))
}, [categories])
```

**Fixed Code:**
```typescript
const categoryOptions = useMemo(() => {
	return categories.map(c => {
		const IconComponent = getIconComponent(c.icon)
		return {
			value: c.id,
			label: c.name,
			icon: <IconComponent className="w-4 h-4" />,
		}
	})
}, [categories])
```

**Required Import:**
Add to the imports at the top of the file:
```typescript
import { getIconComponent } from '@main/components/ui/IconPicker'
```

---

## Files to Create/Modify

### Modified Files:
- `frontend/src/main/features/transactions/TransactionsScreen.tsx`
  - Add import for `getIconComponent`
  - Update `categoryOptions` useMemo to convert icon names to React components

---

## Step-by-Step Execution Instructions

### Step 1: Add Import

Open `frontend/src/main/features/transactions/TransactionsScreen.tsx` and add the import:

```typescript
import { getIconComponent } from '@main/components/ui/IconPicker'
```

### Step 2: Update categoryOptions

Find the `categoryOptions` useMemo (around line 149) and replace it with:

```typescript
const categoryOptions = useMemo(() => {
	return categories.map(c => {
		const IconComponent = getIconComponent(c.icon)
		return {
			value: c.id,
			label: c.name,
			icon: <IconComponent className="w-4 h-4" />,
		}
	})
}, [categories])
```

### Step 3: Verify

1. Run the frontend: `cd frontend && npm run dev`
2. Navigate to Transactions
3. Click "Import" and upload a CSV file
4. In the Categorize step, open a category dropdown
5. Verify that category icons display as actual icons, not text

---

## Acceptance Criteria

- [ ] Category dropdown in Import modal shows actual icons (not text like "gamepad")
- [ ] Icons are properly sized (w-4 h-4)
- [ ] All existing category functionality works correctly
- [ ] No TypeScript errors
- [ ] Frontend builds successfully

---

## Related Documentation

- **Component:** `frontend/src/main/components/ui/IconPicker/IconPicker.tsx` - Contains `getIconComponent()` function
- **Example Usage:** `frontend/src/main/components/TransactionRow/TransactionRow.tsx` - Shows correct icon rendering pattern

---

## Commands to Run

```bash
# Build check
cd frontend && npm run build

# Run frontend for manual testing
cd frontend && npm run dev
```

---

## Visual Reference

**Current (Bug):** Shows "gamepad Teste" as text
**Expected:** Shows 🎮 icon followed by "Teste"
