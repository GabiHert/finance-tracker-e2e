# TASK-004: Goals API Integration

## Overview

Replace mock data in the Goals feature with real API calls to the backend.

## Priority: High

## Estimated Tests Affected: 13 tests in m7-goals/

---

## Current State (BROKEN)

### Mock Data File

**File:** `frontend/src/main/features/goals/mock-data.ts`

```typescript
// Known mock values to detect and reject
export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    categoryId: 'cat-1',
    categoryName: 'Alimentacao',
    limitAmount: 2000,      // R$ 2.000,00
    currentAmount: 1500,    // R$ 1.500,00 - 75%
  },
  {
    id: 'goal-2',
    categoryName: 'Transporte',
    limitAmount: 800,       // R$ 800,00
    currentAmount: 450,     // R$ 450,00 - 56%
  },
  {
    id: 'goal-3',
    categoryName: 'Entretenimento',
    limitAmount: 500,       // R$ 500,00
    currentAmount: 650,     // R$ 650,00 - 130% OVER LIMIT
  },
]

export const mockCategories = [
  { id: 'cat-1', name: 'Alimentacao', ... },
  { id: 'cat-2', name: 'Transporte', ... },
  { id: 'cat-3', name: 'Entretenimento', ... },
  { id: 'cat-4', name: 'Saude', ... },
  { id: 'cat-5', name: 'Educacao', ... },
]
```

### Components Using Mock Data

| File              | Lines | Usage                                                     |
| ----------------- | ----- | --------------------------------------------------------- |
| `GoalsScreen.tsx` | 6     | `import { mockGoals, mockCategories } from './mock-data'` |
| `GoalsScreen.tsx` | 10    | `useState<Goal[]>(mockGoals)`                             |
| `GoalsScreen.tsx` | 42    | `mockCategories.find(c => c.id === data.categoryId)`      |
| `GoalModal.tsx`   | 4     | `import { mockCategories } from './mock-data'`            |
| `GoalModal.tsx`   | 34    | `mockCategories.find(c => c.id === categoryId)`           |
| `GoalModal.tsx`   | 127   | `{mockCategories.map((category) => ...)}`                 |

---

## Target State (FIXED)

### Step 1: Create API Service File

**Create:** `frontend/src/main/features/goals/api/goals.ts`

```typescript
import { apiClient } from "@main/lib/api-client";
import type { Goal, CreateGoalInput, UpdateGoalInput } from "../types";

const BASE_URL = "/api/v1/goals";

export async function fetchGoals(): Promise<Goal[]> {
  const response = await apiClient.get(BASE_URL);
  return response.data;
}

export async function fetchGoalById(id: string): Promise<Goal> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);
  return response.data;
}

export async function createGoal(data: CreateGoalInput): Promise<Goal> {
  const response = await apiClient.post(BASE_URL, data);
  return response.data;
}

export async function updateGoal(
  id: string,
  data: UpdateGoalInput
): Promise<Goal> {
  const response = await apiClient.patch(`${BASE_URL}/${id}`, data);
  return response.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}
```

**Create:** `frontend/src/main/features/goals/api/index.ts`

```typescript
export * from "./goals";
```

### Step 2: Update GoalsScreen.tsx

**File:** `frontend/src/main/features/goals/GoalsScreen.tsx`

#### Remove mock imports (Line 6)

```typescript
// DELETE THIS LINE:
import { mockGoals, mockCategories } from "./mock-data";

// ADD THIS:
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "./api";
import { fetchCategories } from "@main/features/categories/api";
```

#### Replace state initialization (Line 10)

```typescript
// DELETE:
const [goals, setGoals] = useState<Goal[]>(mockGoals);

// ADD:
const [goals, setGoals] = useState<Goal[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

#### Add useEffect for data fetching

```typescript
useEffect(() => {
  async function loadData() {
    try {
      setIsLoading(true);
      const [goalsData, categoriesData] = await Promise.all([
        fetchGoals(),
        fetchCategories(),
      ]);
      setGoals(goalsData);
      setCategories(categoriesData);
    } catch (err) {
      setError("Erro ao carregar limites de gastos");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }
  loadData();
}, []);
```

#### Update handleSaveGoal (Line 41-79)

```typescript
const handleSaveGoal = async (data: CreateGoalInput) => {
  try {
    if (selectedGoal) {
      const updated = await updateGoal(selectedGoal.id, {
        categoryId: data.categoryId,
        limitAmount: data.limitAmount,
        alertOnExceed: data.alertOnExceed,
      });
      setGoals(goals.map((g) => (g.id === selectedGoal.id ? updated : g)));
    } else {
      const created = await createGoal(data);
      setGoals([...goals, created]);
    }
    handleCloseModal();
  } catch (err) {
    console.error("Error saving goal:", err);
  }
};
```

#### Update handleConfirmDelete (Line 29-34)

```typescript
const handleConfirmDelete = async () => {
  if (deleteGoal) {
    try {
      await deleteGoal(deleteGoal.id);
      setGoals(goals.filter((g) => g.id !== deleteGoal.id));
      setDeleteGoal(null);
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  }
};
```

### Step 3: Update GoalModal.tsx

**File:** `frontend/src/main/features/goals/GoalModal.tsx`

#### Remove mock import (Line 4)

```typescript
// DELETE:
import { mockCategories } from "./mock-data";
```

#### Add categories prop

```typescript
interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateGoalInput) => void;
  goal: Goal | null;
  categories: Category[]; // ADD THIS PROP
}
```

#### Update category usage (Line 34, 127)

```typescript
// CHANGE mockCategories to categories prop
const selectedCategory = categories.find(c => c.id === categoryId)

// CHANGE in render
{categories.map((category) => (
  // ...
))}
```

### Step 4: Delete Mock Data File

After integration is complete:

```bash
rm frontend/src/main/features/goals/mock-data.ts
```

---

## E2E Test Updates Required

The following tests need to verify real API behavior:

### Tests That Need Data Verification

| Test ID    | File              | Issue                           | Fix                       |
| ---------- | ----------------- | ------------------------------- | ------------------------- |
| M7-E2E-001 | goals.spec.ts:18  | Only checks visibility          | Add API call verification |
| M7-E2E-002 | goals.spec.ts:29  | Creates goal, no API check      | Verify POST /api/v1/goals |
| M7-E2E-003 | goals.spec.ts:62  | Progress check, no value verify | Verify values from API    |
| M7-E2E-005 | goals.spec.ts:114 | Edit, no API check              | Verify PATCH call         |
| M7-E2E-006 | goals.spec.ts:156 | Delete, no API check            | Verify DELETE call        |

### Add Mock Value Detection

Add to test setup:

```typescript
const MOCK_GOAL_VALUES = {
  goal1: { limit: 2000, current: 1500, category: "Alimentacao" },
  goal2: { limit: 800, current: 450, category: "Transporte" },
  goal3: { limit: 500, current: 650, category: "Entretenimento" },
};

// In each test, verify values are NOT mock values
const goalLimit = await parseAmount(
  page.getByTestId("goal-limit").first().textContent()
);
expect(goalLimit).not.toBe(MOCK_GOAL_VALUES.goal1.limit);
expect(goalLimit).not.toBe(MOCK_GOAL_VALUES.goal2.limit);
expect(goalLimit).not.toBe(MOCK_GOAL_VALUES.goal3.limit);
```

---

## Backend Endpoints Required

Verify these endpoints exist in backend:

| Method | Endpoint          | Purpose           |
| ------ | ----------------- | ----------------- |
| GET    | /api/v1/goals     | List user's goals |
| GET    | /api/v1/goals/:id | Get single goal   |
| POST   | /api/v1/goals     | Create goal       |
| PATCH  | /api/v1/goals/:id | Update goal       |
| DELETE | /api/v1/goals/:id | Delete goal       |

Check backend implementation:

```bash
grep -r "goals" backend/internal/integration/http/
```

---

## Validation Commands

### Run Goals E2E Tests

```bash
cd e2e && npx playwright test --project=m7-goals --reporter=list
```

### Run Specific Test

```bash
cd e2e && npx playwright test -g "M7-E2E-002" --reporter=list
```

---

## Definition of Done

- [ ] API service file created: `frontend/src/main/features/goals/api/goals.ts`
- [ ] GoalsScreen.tsx fetches data from API on mount
- [ ] GoalModal.tsx uses categories from props (not mock)
- [ ] Create/Edit/Delete operations call API
- [ ] Loading state displayed during fetch
- [ ] Error state displayed on failure
- [ ] Empty state shown for new users (no goals)
- [ ] mock-data.ts file deleted
- [ ] run /fix-tests
- [ ] All M7-E2E tests pass
- [ ] No mock values (2000, 1500, 800, 450, 500, 650) visible for new users
