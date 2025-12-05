# Task: Add Rules Navigation Link to Sidebar and Bottom Nav

## Overview

The Category Rules feature (M6) is fully implemented but completely hidden from users because there is no navigation link in the sidebar or bottom navigation menus. Users cannot discover or access the Rules feature without manually typing `/rules` in the URL.

**Goal:** Add "Regras" (Rules) navigation item to both Sidebar and BottomNav components so users can access the fully-implemented Rules feature.

---

## Current State Analysis

### What Exists

**Rules Feature (Fully Implemented):**
- Route `/rules` is configured in `App.tsx` (line 43)
- `RulesScreen.tsx` - Complete CRUD, drag-and-drop, pattern testing
- Backend API endpoints all working (`/category-rules/*`)
- Frontend API client (`rules/api/rules.ts`)

**Navigation Components:**
- `Sidebar.tsx` - Desktop navigation with 6 items (lines 94-101)
- `BottomNav.tsx` - Mobile navigation with 5 items (lines 56-62)

### What's Missing

1. **RulesIcon** - SVG icon component for the Rules nav item
2. **Sidebar navItems entry** - Rules item in the navigation array
3. **BottomNav bottomNavItems entry** - Rules item in the mobile nav array

---

## Execution Plan

### Phase 1: Add RulesIcon Component
Create an SVG icon that represents "rules" - a filter/funnel or regex pattern icon

### Phase 2: Update Sidebar Navigation
Add Rules item to `navItems` array between Categories and Goals

### Phase 3: Update Bottom Navigation
Add Rules item to `bottomNavItems` array (may need to consider space constraints)

### Phase 4: Verification
Test navigation on desktop and mobile views

---

## Detailed Specifications

### RulesIcon Component (for both files)

```tsx
function RulesIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
		</svg>
	)
}
```

This is a filter/funnel icon which visually represents "rules" that filter/categorize transactions.

### Sidebar.tsx Changes

**Add icon function** (after `GoalsIcon`, around line 46):
```tsx
function RulesIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
		</svg>
	)
}
```

**Update navItems array** (line 94-101) - Add Rules between Categories and Goals:
```tsx
const navItems: NavItem[] = [
	{ path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, testId: 'dashboard' },
	{ path: '/transactions', label: 'Transacoes', icon: <TransactionsIcon />, testId: 'transactions' },
	{ path: '/categories', label: 'Categorias', icon: <CategoriesIcon />, testId: 'categories' },
	{ path: '/rules', label: 'Regras', icon: <RulesIcon />, testId: 'rules' },
	{ path: '/goals', label: 'Metas', icon: <GoalsIcon />, testId: 'goals' },
	{ path: '/groups', label: 'Grupos', icon: <GroupsIcon />, testId: 'groups' },
	{ path: '/settings', label: 'Configuracoes', icon: <SettingsIcon />, testId: 'settings' },
]
```

### BottomNav.tsx Changes

**Add icon function** (after `GoalsIcon`, around line 45):
```tsx
function RulesIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
		</svg>
	)
}
```

**Update bottomNavItems array** (line 56-62) - Add Rules, keep 5 most important items:

Option A - Replace Groups (not in bottom nav currently):
```tsx
const bottomNavItems: BottomNavItem[] = [
	{ path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, testId: 'dashboard' },
	{ path: '/transactions', label: 'Transacoes', icon: <TransactionsIcon />, testId: 'transactions' },
	{ path: '/categories', label: 'Categorias', icon: <CategoriesIcon />, testId: 'categories' },
	{ path: '/rules', label: 'Regras', icon: <RulesIcon />, testId: 'rules' },
	{ path: '/settings', label: 'Config', icon: <SettingsIcon />, testId: 'settings' },
]
```

Option B - Add as 6th item (may be crowded on small screens):
```tsx
const bottomNavItems: BottomNavItem[] = [
	{ path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, testId: 'dashboard' },
	{ path: '/transactions', label: 'Transacoes', icon: <TransactionsIcon />, testId: 'transactions' },
	{ path: '/categories', label: 'Categorias', icon: <CategoriesIcon />, testId: 'categories' },
	{ path: '/rules', label: 'Regras', icon: <RulesIcon />, testId: 'rules' },
	{ path: '/goals', label: 'Metas', icon: <GoalsIcon />, testId: 'goals' },
	{ path: '/settings', label: 'Config', icon: <SettingsIcon />, testId: 'settings' },
]
```

**Recommendation:** Use Option A (keep 5 items) for better mobile UX. Goals can be accessed via sidebar on desktop.

---

## Files to Create/Modify

### Modified Files:
- `frontend/src/main/components/layout/Sidebar.tsx`
  - Add `RulesIcon` function
  - Add Rules item to `navItems` array
- `frontend/src/main/components/layout/BottomNav.tsx`
  - Add `RulesIcon` function
  - Add Rules item to `bottomNavItems` array

---

## Step-by-Step Execution Instructions

### Step 1: Update Sidebar.tsx

1. Open `frontend/src/main/components/layout/Sidebar.tsx`
2. Add `RulesIcon` function after `GoalsIcon` (around line 46):
```tsx
function RulesIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
		</svg>
	)
}
```

3. Update `navItems` array (line 94-101) to include Rules:
```tsx
{ path: '/rules', label: 'Regras', icon: <RulesIcon />, testId: 'rules' },
```

### Step 2: Update BottomNav.tsx

1. Open `frontend/src/main/components/layout/BottomNav.tsx`
2. Add `RulesIcon` function after `GoalsIcon` (around line 45):
```tsx
function RulesIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
			<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
		</svg>
	)
}
```

3. Update `bottomNavItems` array (line 56-62) to include Rules

### Step 3: Verify

1. Run the frontend: `cd frontend && npm run dev`
2. Check desktop view - sidebar should show "Regras" with filter icon
3. Check mobile view - bottom nav should show "Regras"
4. Click on "Regras" - should navigate to `/rules` and show the Rules screen

---

## Acceptance Criteria

- [ ] RulesIcon component exists in both Sidebar.tsx and BottomNav.tsx
- [ ] Sidebar shows "Regras" navigation item with filter icon
- [ ] Bottom navigation shows "Regras" on mobile
- [ ] Clicking "Regras" navigates to `/rules`
- [ ] Rules screen displays correctly after navigation
- [ ] Active state styling works when on `/rules` page
- [ ] No TypeScript errors
- [ ] Frontend builds successfully

---

## Related Documentation

- **Rules Feature:** `frontend/src/main/features/rules/` - The implemented Rules screen
- **Route Config:** `frontend/src/main/app/App.tsx:43` - Route definition

---

## Commands to Run

```bash
# Build check
cd frontend && npm run build

# Run frontend for manual testing
cd frontend && npm run dev

# Run E2E tests to check for regressions
cd e2e && npx playwright test
```

---

## Visual Reference

**Expected Sidebar (Desktop):**
```
Dashboard
Transacoes
Categorias
Regras      <-- NEW (with filter icon)
Metas
Grupos
Configuracoes
```

**Expected Bottom Nav (Mobile):**
```
Dashboard | Transacoes | Categorias | Regras | Config
```
