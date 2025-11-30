# E2E Test Specification: Group Creation and Navigation

## Issue Description

When a user creates a new group and then navigates to view it, the application shows "Grupo não encontrado" (Group not found) instead of displaying the group details.

## Root Cause

The `GroupsScreen` and `GroupDetailScreen` use different data sources:
- `GroupsScreen` maintains groups in local React state
- `GroupDetailScreen` looks up groups from the hardcoded `mockGroups` array only
- Newly created groups are never added to the shared data source

## Test Objective

Validate that the complete group creation flow works end-to-end:
1. User can create a new group
2. New group appears in the groups list
3. User can click on the new group to navigate to its detail page
4. Group detail page displays the correct group information (not "Group not found")

---

## Test Scenarios

### Scenario 1: Create Group and View Details

**Given:** User is authenticated and on the Groups page (`/groups`)

**Steps:**
1. Click the "New Group" button (`data-testid="new-group-btn"`)
2. Wait for the create group modal to appear (`data-testid="modal-content"`)
3. Enter a unique group name (e.g., "Test Group E2E")
4. Enter a description (optional)
5. Click the save/create button (`data-testid="save-btn"`)
6. Wait for the modal to close
7. Verify the new group appears in the groups list
8. Click on the newly created group card
9. **Expected Result:** The group detail page loads successfully with:
   - The correct group name displayed
   - The group description (if provided)
   - The dashboard tab shown by default
   - NO "Grupo não encontrado" error message

### Scenario 2: Navigate Directly to New Group URL

**Given:** User creates a group and notes its ID

**Steps:**
1. Create a new group via the modal
2. Capture the group ID from the URL or group card
3. Navigate away from the groups section (e.g., to `/dashboard`)
4. Navigate directly to `/groups/{newGroupId}`
5. **Expected Result:** The group detail page loads successfully (not "Group not found")

### Scenario 3: Group Persists After Page Refresh (Optional - depends on implementation)

**Given:** User has created a new group

**Steps:**
1. Create a new group
2. Navigate to the group detail page
3. Refresh the browser
4. **Expected Result:** Either the group still displays, OR there's a graceful handling (this tests persistence behavior)

---

## Test Data Requirements

- Authenticated user session (use existing auth setup)
- Unique group names for each test run (use timestamps or random suffixes)

## Key Elements to Verify

### On Groups List Page (`/groups`)
- `data-testid="new-group-btn"` - Button to create new group
- `data-testid="group-card"` - Individual group cards in the list
- Group name visible on the card
- Member count visible on the card

### On Create Group Modal
- `data-testid="modal-content"` - Modal container
- `data-testid="modal-title"` - Should show "Novo Grupo" or similar
- Input field for group name
- Input field for description (optional)
- `data-testid="save-btn"` - Save button
- `data-testid="cancel-btn"` - Cancel button

### On Group Detail Page (`/groups/:groupId`)
- `data-testid="group-detail-screen"` - Main container
- `data-testid="group-header"` - Header section with group name
- Group name displayed (h1 element)
- Group description displayed (if provided)
- `data-testid="group-tabs"` - Tab navigation
- `data-testid="group-dashboard-tab"` - Dashboard content
- NO presence of "Grupo não encontrado" text

## Error Conditions to Test

1. **Current Bug:** After creating a group, clicking it shows "Grupo não encontrado"
2. The test should FAIL if "Grupo não encontrado" appears after creating and navigating to a group
3. The test should PASS when the fix is implemented and the group detail page displays correctly

## File Locations

- Groups List Screen: `frontend/src/main/features/groups/GroupsScreen.tsx`
- Group Detail Screen: `frontend/src/main/features/groups/GroupDetailScreen.tsx`
- Group Modal: `frontend/src/main/features/groups/GroupModal.tsx`
- Mock Data: `frontend/src/main/features/groups/mock-data.ts`
- Types: `frontend/src/main/features/groups/types.ts`

## Suggested Test File Location

```
e2e/tests/m9-groups/group-creation-flow.spec.ts
```

## Notes

- This test validates the integration between creating a group and viewing its details
- The fix will likely require implementing shared state management between the two screens
- Test should use unique group names to avoid conflicts with existing mock data
- Consider adding cleanup logic if groups persist to storage
