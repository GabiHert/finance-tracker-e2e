# M9: Groups & Collaboration - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M9 - Groups & Collaboration |
| **Screens Covered** | GroupsScreen, GroupDetailScreen |
| **Priority** | Medium |
| **Test Files** | `e2e/tests/m9-groups/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Groups Screen (`GroupsScreen.tsx`)

**Location:** `frontend/src/main/features/groups/GroupsScreen.tsx`

**Components:**
- Page header with "Grupos" title
- "Novo Grupo" button
- Groups list with cards
- Group card showing name, member count, admin badge
- Empty state for no groups

### 2. Group Detail Screen (`GroupDetailScreen.tsx`)

**Location:** `frontend/src/main/features/groups/GroupDetailScreen.tsx`

**Components:**
- Group header with name and settings gear
- Member avatars display
- Tab navigation (Dashboard, Transactions, Categories, Members)
- Group Dashboard tab with summary metrics
- Group Transactions tab with transaction list
- Group Categories tab with category cards
- Group Members tab with member list and invite button
- Pending invitations section
- Admin controls

**Features:**
- Group CRUD operations
- Member invitation via email
- Admin role management
- Shared transactions within group
- Shared categories within group
- Group-level dashboard analytics
- Member avatar display

---

## E2E Test Scenarios

### Groups Tests (`groups.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M9-E2E-001 | Create a new group | Tests group creation flow | Implemented |
| M9-E2E-002 | Invite member to group | Tests invitation flow | Implemented |
| M9-E2E-003 | Display group detail with tabs | Tests all 4 tabs visibility | Implemented |
| M9-E2E-004 | View group dashboard | Tests dashboard tab content | Implemented |
| M9-E2E-005 | View group transactions | Tests transactions tab | Implemented |
| M9-E2E-006 | View group members | Tests members tab with admin badge | Implemented |
| M9-E2E-007 | View group categories | Tests categories tab | Implemented |
| M9-E2E-008 | Create group category | Tests category creation in group | Implemented |
| M9-E2E-009 | Display empty state for groups | Tests empty state CTA | Implemented |
| M9-E2E-010 | Display member avatars in group header | Tests avatars UI | Implemented |
| M9-E2E-011 | Admin can access settings gear | Tests admin controls | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| Group CRUD | 2 | 1 | 50% |
| Member Management | 3 | 2 | 67% |
| Group Tabs | 4 | 4 | 100% |
| Group Dashboard | 1 | 1 | 100% |
| Group Categories | 2 | 2 | 100% |
| Admin Controls | 1 | 1 | 100% |
| **Total** | **13** | **11** | **85%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Groups list | Yes | Card layout |
| Group creation modal | Yes | Name input |
| Group detail tabs | Yes | All 4 tabs |
| Member invite modal | Yes | Email input |
| Pending invites | Yes | In members tab |
| Admin badge | Yes | On member cards |
| Settings gear | Yes | Admin only |
| Member avatars | Yes | In header |
| Empty states | Yes | All tabs |

---

## Missing Test Scenarios

### 1. Accept Group Invitation (High Priority)
**Description:** Invited user accepts and joins group.

```gherkin
Scenario: Accept group invitation
  Given I received an invitation to "Family Budget" group
  When I click the accept link in the email
  And I am logged in
  Then I should be added to the group
  And I should see the group in my groups list
```

### 2. Decline Group Invitation (Medium Priority)
**Description:** User declines invitation.

```gherkin
Scenario: Decline group invitation
  Given I have a pending invitation
  When I click "Decline" on the invitation
  Then the invitation should be removed
  And I should not be added to the group
```

### 3. Remove Member from Group (High Priority)
**Description:** Admin removes a member.

```gherkin
Scenario: Admin removes member
  Given I am an admin of a group
  And the group has 3 members
  When I click remove on a non-admin member
  And I confirm the removal
  Then the member should be removed
  And they should no longer see the group
```

### 4. Transfer Admin Role (Medium Priority)
**Description:** Admin transfers admin rights.

```gherkin
Scenario: Transfer admin role
  Given I am the only admin of a group
  When I promote another member to admin
  Then they should have admin badge
  And they should see the settings gear
```

### 5. Leave Group (Medium Priority)
**Description:** Member leaves a group.

```gherkin
Scenario: Member leaves group
  Given I am a member of a group
  When I click "Leave Group" in settings
  And I confirm leaving
  Then I should be removed from the group
  And the group should no longer appear in my list
```

### 6. Edit Group Name (Low Priority)
**Description:** Admin edits group name.

```gherkin
Scenario: Edit group name
  Given I am an admin of "Old Name" group
  When I click settings and edit name to "New Name"
  Then the group should be renamed
  And all members should see the new name
```

### 7. Delete Group (Low Priority)
**Description:** Admin deletes the entire group.

```gherkin
Scenario: Delete group
  Given I am the only admin of a group
  When I click "Delete Group" in settings
  And I confirm deletion
  Then the group should be deleted
  And all members should no longer see it
```

### 8. Shared Transaction Creation (High Priority)
**Description:** Create transaction in group context.

```gherkin
Scenario: Create shared transaction
  Given I am viewing a group's transactions tab
  When I click "Add Transaction"
  And I fill in transaction details
  Then the transaction should be visible to all group members
```

### 9. Revoke Pending Invitation (Low Priority)
**Description:** Admin cancels pending invitation.

```gherkin
Scenario: Revoke pending invitation
  Given I have a pending invitation in my group
  When I click "Cancel Invitation"
  Then the invitation should be revoked
  And the invitee should not be able to join
```

---

## Recommendations

1. **Invitation Flow:** Complete the invitation accept/decline workflow tests.

2. **Member Management:** Add tests for remove, promote, and leave actions.

3. **Permission Testing:** Verify non-admin cannot access admin features.

4. **Shared Data:** Test transaction and category visibility across members.

5. **Email Integration:** Test invitation email delivery (mock or real).

6. **Group Limits:** Test maximum members per group if applicable.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
