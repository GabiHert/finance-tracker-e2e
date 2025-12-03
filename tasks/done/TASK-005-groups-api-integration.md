# TASK-005: Groups API Integration

## Overview

Replace mock data in the Groups feature with real API calls to the backend.

## Priority: High

## Estimated Tests Affected: 14+ tests in m9-groups/

---

## Current State (BROKEN)

### Mock Data File

**File:** `frontend/src/main/features/groups/mock-data.ts`

```typescript
// Known mock values to detect and reject

export const mockCurrentUser: GroupMember = {
  id: "1",
  userId: "user-1",
  name: "Usuario Teste",
  email: "usuario@example.com",
  role: "admin",
};

export const mockMembers: GroupMember[] = [
  mockCurrentUser,
  { id: "2", name: "Maria Silva", email: "maria@example.com", role: "member" },
  { id: "3", name: "Joao Santos", email: "joao@example.com", role: "member" },
];

export const mockGroups: Group[] = [
  {
    id: "group-1",
    name: "Familia Silva", // MOCK GROUP NAME
    description: "Despesas da familia",
    memberCount: 3,
    members: mockMembers,
    currentUserRole: "admin",
  },
];

export const mockGroupCategories: GroupCategory[] = [
  { id: "cat-1", name: "Mercado", transactionCount: 15 },
  { id: "cat-2", name: "Contas", transactionCount: 8 },
  { id: "cat-3", name: "Lazer", transactionCount: 5 },
];

export const mockGroupTransactions: GroupTransaction[] = [
  {
    id: "tx-1",
    description: "Supermercado Extra",
    amount: -350.0,
    memberName: "Usuario Teste",
  },
  {
    id: "tx-2",
    description: "Conta de Luz",
    amount: -180.5,
    memberName: "Maria Silva",
  },
  {
    id: "tx-3",
    description: "Cinema",
    amount: -85.0,
    memberName: "Joao Santos",
  },
];

export const mockGroupSummary: GroupSummary = {
  totalExpenses: 2500.0, // R$ 2.500,00 - ALWAYS SAME
  totalIncome: 0,
  netBalance: -2500.0,
  expensesByMember: [
    { memberName: "Usuario Teste", total: 1200.0 },
    { memberName: "Maria Silva", total: 800.0 },
    { memberName: "Joao Santos", total: 500.0 },
  ],
};
```

### Components Using Mock Data

| File                    | Lines | Usage                                                                     |
| ----------------------- | ----- | ------------------------------------------------------------------------- |
| `groups-store.ts`       | 2     | `import { mockGroups, mockMembers, mockCurrentUser }`                     |
| `groups-store.ts`       | 6     | `let groups = [...initialMockGroups]`                                     |
| `groups-store.ts`       | 24    | `members: [mockCurrentUser]` in addGroup                                  |
| `GroupDetailScreen.tsx` | 12-16 | `import { mockGroupTransactions, mockGroupCategories, mockGroupSummary }` |
| `GroupDetailScreen.tsx` | 79    | `useState(mockGroupCategories)`                                           |
| `GroupDetailScreen.tsx` | 222   | `<GroupDashboardTab summary={mockGroupSummary} />`                        |
| `GroupDetailScreen.tsx` | 228   | `<GroupTransactionsTab transactions={mockGroupTransactions} />`           |
| `GroupsScreen.tsx`      | 6     | `import { getGroups, addGroup, updateGroup }` from store                  |
| `GroupsScreen.tsx`      | 11    | `useState(getGroups)` - gets mock data                                    |

---

## Target State (FIXED)

### Step 1: Create API Service File

**Create:** `frontend/src/main/features/groups/api/groups.ts`

```typescript
import { apiClient } from "@main/lib/api-client";
import type {
  Group,
  GroupSummary,
  GroupTransaction,
  GroupCategory,
  GroupMember,
  CreateGroupInput,
  UpdateGroupInput,
} from "../types";

const BASE_URL = "/api/v1/groups";

// Group CRUD
export async function fetchGroups(): Promise<Group[]> {
  const response = await apiClient.get(BASE_URL);
  return response.data;
}

export async function fetchGroupById(id: string): Promise<Group> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);
  return response.data;
}

export async function createGroup(data: CreateGroupInput): Promise<Group> {
  const response = await apiClient.post(BASE_URL, data);
  return response.data;
}

export async function updateGroup(
  id: string,
  data: UpdateGroupInput
): Promise<Group> {
  const response = await apiClient.patch(`${BASE_URL}/${id}`, data);
  return response.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}

// Group Dashboard
export async function fetchGroupSummary(
  groupId: string
): Promise<GroupSummary> {
  const response = await apiClient.get(`${BASE_URL}/${groupId}/summary`);
  return response.data;
}

// Group Transactions
export async function fetchGroupTransactions(
  groupId: string
): Promise<GroupTransaction[]> {
  const response = await apiClient.get(`${BASE_URL}/${groupId}/transactions`);
  return response.data;
}

// Group Categories
export async function fetchGroupCategories(
  groupId: string
): Promise<GroupCategory[]> {
  const response = await apiClient.get(`${BASE_URL}/${groupId}/categories`);
  return response.data;
}

export async function createGroupCategory(
  groupId: string,
  data: { name: string; type: "income" | "expense"; color: string }
): Promise<GroupCategory> {
  const response = await apiClient.post(
    `${BASE_URL}/${groupId}/categories`,
    data
  );
  return response.data;
}

// Group Members
export async function fetchGroupMembers(
  groupId: string
): Promise<GroupMember[]> {
  const response = await apiClient.get(`${BASE_URL}/${groupId}/members`);
  return response.data;
}

export async function inviteMember(
  groupId: string,
  email: string
): Promise<void> {
  await apiClient.post(`${BASE_URL}/${groupId}/invites`, { email });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await apiClient.post(`${BASE_URL}/${groupId}/leave`);
}

export async function removeMember(
  groupId: string,
  memberId: string
): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${groupId}/members/${memberId}`);
}

export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member"
): Promise<void> {
  await apiClient.patch(`${BASE_URL}/${groupId}/members/${memberId}`, { role });
}
```

**Create:** `frontend/src/main/features/groups/api/index.ts`

```typescript
export * from "./groups";
```

### Step 2: Delete groups-store.ts

The in-memory store should be replaced entirely with API calls:

```bash
rm frontend/src/main/features/groups/groups-store.ts
```

### Step 3: Update GroupsScreen.tsx

**File:** `frontend/src/main/features/groups/GroupsScreen.tsx`

#### Remove store imports (Line 6)

```typescript
// DELETE:
import { getGroups, addGroup, updateGroup } from "./groups-store";

// ADD:
import { fetchGroups, createGroup, updateGroup } from "./api";
```

#### Add state and loading

```typescript
const [groups, setGroups] = useState<Group[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function loadGroups() {
    try {
      setIsLoading(true);
      const data = await fetchGroups();
      setGroups(data);
    } catch (err) {
      setError("Erro ao carregar grupos");
    } finally {
      setIsLoading(false);
    }
  }
  loadGroups();
}, []);
```

#### Update handleSaveGroup

```typescript
const handleSaveGroup = async (data: {
  name: string;
  description?: string;
}) => {
  try {
    if (selectedGroup) {
      const updated = await updateGroup(selectedGroup.id, data);
      setGroups(groups.map((g) => (g.id === selectedGroup.id ? updated : g)));
    } else {
      const created = await createGroup(data);
      setGroups([...groups, created]);
    }
    handleCloseModal();
  } catch (err) {
    console.error("Error saving group:", err);
  }
};
```

### Step 4: Update GroupDetailScreen.tsx

**File:** `frontend/src/main/features/groups/GroupDetailScreen.tsx`

#### Remove mock imports (Lines 12-16)

```typescript
// DELETE:
import {
  mockGroupTransactions,
  mockGroupCategories,
  mockGroupSummary,
} from "./mock-data";

// ADD:
import {
  fetchGroupById,
  fetchGroupSummary,
  fetchGroupTransactions,
  fetchGroupCategories,
  createGroupCategory,
  inviteMember,
} from "./api";
```

#### Replace state initialization

```typescript
const [group, setGroup] = useState<Group | null>(null);
const [summary, setSummary] = useState<GroupSummary | null>(null);
const [transactions, setTransactions] = useState<GroupTransaction[]>([]);
const [categories, setCategories] = useState<GroupCategory[]>([]);
const [isLoading, setIsLoading] = useState(true);
```

#### Update useEffect (Lines 84-89)

```typescript
useEffect(() => {
  async function loadGroupData() {
    if (!groupId) return;

    try {
      setIsLoading(true);
      const [groupData, summaryData, transactionsData, categoriesData] =
        await Promise.all([
          fetchGroupById(groupId),
          fetchGroupSummary(groupId),
          fetchGroupTransactions(groupId),
          fetchGroupCategories(groupId),
        ]);

      setGroup(groupData);
      setSummary(summaryData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error loading group:", err);
    } finally {
      setIsLoading(false);
    }
  }
  loadGroupData();
}, [groupId]);
```

#### Update tab rendering (Lines 220-230)

```typescript
{
  activeTab === "dashboard" && summary && (
    <div data-testid="group-dashboard-tab">
      <GroupDashboardTab summary={summary} />
    </div>
  );
}

{
  activeTab === "transactions" && (
    <div data-testid="group-transactions-tab">
      <GroupTransactionsTab transactions={transactions} />
    </div>
  );
}
```

### Step 5: Delete Mock Data File

After integration is complete:

```bash
rm frontend/src/main/features/groups/mock-data.ts
rm frontend/src/main/features/groups/groups-store.ts
```

---

## E2E Test Updates Required

### Tests With expect(true).toBe(true) (CRITICAL)

| Test ID   | File               | Line                      | Issue         |
| --------- | ------------------ | ------------------------- | ------------- |
| E2E-M9-06 | groups.spec.ts:254 | `expect(true).toBe(true)` | ALWAYS PASSES |
| E2E-M9-07 | groups.spec.ts:306 | `expect(true).toBe(true)` | ALWAYS PASSES |
| E2E-M9-08 | groups.spec.ts:354 | `expect(true).toBe(true)` | ALWAYS PASSES |

These MUST be fixed to verify actual behavior.

### Tests With OR Logic (LIKELY TO PASS INCORRECTLY)

| Test ID   | File                   | Lines                                                     | Pattern |
| --------- | ---------------------- | --------------------------------------------------------- | ------- |
| E2E-M9-03 | groups.spec.ts:122,136 | `expect(a \|\| b \|\| c).toBeTruthy()`                    |
| E2E-M9-04 | groups.spec.ts:167     | `expect(hasSummary \|\| hasEmptyState).toBeTruthy()`      |
| E2E-M9-05 | groups.spec.ts:197     | `expect(hasTransactions \|\| hasEmptyState).toBeTruthy()` |

### Add Mock Value Detection

```typescript
const MOCK_GROUP_VALUES = {
  groupName: "Familia Silva",
  totalExpenses: 2500.0,
  members: ["Usuario Teste", "Maria Silva", "Joao Santos"],
  transactions: [
    { description: "Supermercado Extra", amount: -350.0 },
    { description: "Conta de Luz", amount: -180.5 },
    { description: "Cinema", amount: -85.0 },
  ],
};

// In tests, verify NOT mock values
const groupName = await page.getByTestId("group-header").textContent();
expect(groupName).not.toContain(MOCK_GROUP_VALUES.groupName);
```

---

## Backend Endpoints Required

Verify these endpoints exist:

| Method | Endpoint                             | Purpose                |
| ------ | ------------------------------------ | ---------------------- |
| GET    | /api/v1/groups                       | List user's groups     |
| GET    | /api/v1/groups/:id                   | Get single group       |
| POST   | /api/v1/groups                       | Create group           |
| PATCH  | /api/v1/groups/:id                   | Update group           |
| DELETE | /api/v1/groups/:id                   | Delete group           |
| GET    | /api/v1/groups/:id/summary           | Get group summary      |
| GET    | /api/v1/groups/:id/transactions      | Get group transactions |
| GET    | /api/v1/groups/:id/categories        | Get group categories   |
| POST   | /api/v1/groups/:id/categories        | Create group category  |
| GET    | /api/v1/groups/:id/members           | Get group members      |
| POST   | /api/v1/groups/:id/invites           | Invite member          |
| POST   | /api/v1/groups/:id/leave             | Leave group            |
| DELETE | /api/v1/groups/:id/members/:memberId | Remove member          |
| PATCH  | /api/v1/groups/:id/members/:memberId | Update member role     |

Check backend:

```bash
grep -r "groups" backend/internal/integration/http/
ls backend/internal/application/usecase/group/
```

---

## Validation Commands

### Run Groups E2E Tests

```bash
cd e2e && npx playwright test --project=m9-groups --reporter=list
```

### Run Specific Test

```bash
cd e2e && npx playwright test -g "E2E-M9-01" --reporter=list
```

---

## Definition of Done

- [ ] API service file created: `frontend/src/main/features/groups/api/groups.ts`
- [ ] GroupsScreen.tsx fetches groups from API
- [ ] GroupDetailScreen.tsx fetches all data from API
- [ ] groups-store.ts file deleted
- [ ] mock-data.ts file deleted
- [ ] Create/Edit/Delete operations call API
- [ ] Group dashboard shows real summary
- [ ] Group transactions shows real transactions
- [ ] Loading states displayed during fetch
- [ ] Error states displayed on failure
- [ ] Empty state shown for new users (no groups)
- [ ] run /fix-tests
- [ ] All M9-E2E tests pass
- [ ] No mock values visible:
  - Group name "Familia Silva" for new users
  - Total expenses R$ 2.500,00
  - Members "Usuario Teste", "Maria Silva", "Joao Santos"
  - Transactions "Supermercado Extra", "Conta de Luz", "Cinema"
