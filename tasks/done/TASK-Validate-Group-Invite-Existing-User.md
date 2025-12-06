# Task: Validate Group Invite Requires Existing User or Platform Invitation

## Overview

Currently, when inviting someone to a group, the system allows inviting any email address - even if the person is not a Finance Tracker user. The backend should validate that the email belongs to an existing user. If the email doesn't belong to a registered user, the frontend should prompt: "This person is not a Finance Tracker user. Would you like to send them an invitation to join the platform?"

**Goal:** Prevent accidental invites to non-users and provide a clear flow for inviting new people to both the platform AND the group.

---

## Current State Analysis

### What Exists

**Backend** (`backend/internal/application/usecase/group/invite_member.go`):
- Lines 113-127: Already checks if email exists via `userRepo.FindByEmail()`
- If user exists → checks if already a member
- If user doesn't exist → proceeds with invitation anyway (current behavior)
- Sends invitation email with group join token

**Frontend** (`frontend/src/main/features/groups/InviteModal.tsx`):
- Simple modal with email input
- Basic email validation
- Calls `onSend(email)` on submit
- No confirmation step for non-users

**API Response** (`backend/internal/integration/entrypoint/controller/group.go`):
- Returns 201 Created on success
- Returns 409 Conflict if user already member or invite exists
- No distinction between "user exists" vs "user doesn't exist"

### What's Missing/Broken

1. **Backend**: No response indicating whether the invited email is a registered user
2. **Frontend**: No confirmation dialog for inviting non-users
3. **API**: Need a new field or endpoint to check user existence before inviting
4. **Flow**: No "invite to platform" vs "invite to group" distinction

---

## Execution Plan

### Phase 1: Backend - Add User Existence Check to Response

Modify the invite endpoint to return whether the user exists, or create a pre-check endpoint.

**Option A (Recommended)**: Two-step flow with pre-check endpoint
- `POST /groups/:id/invite/check` - Returns user status (exists/not_exists)
- `POST /groups/:id/invite` - Existing endpoint, add `confirmNonUser: true` flag

**Option B**: Single endpoint with response field
- Modify existing endpoint to return `{ userExists: boolean }` or require `confirmNonUser` param

### Phase 2: Frontend - Add Confirmation Modal

Add a confirmation step when the user doesn't exist:
1. Call check endpoint first
2. If user doesn't exist → show confirmation dialog
3. On confirm → proceed with invitation

### Phase 3: E2E Tests

Verify the new flow works correctly.

---

## Detailed Specifications

### API Changes

#### New Endpoint: Check Invite Eligibility

```
POST /api/v1/groups/:id/invite/check
```

**Request:**
```json
{
  "email": "newuser@example.com"
}
```

**Response (User Exists):**
```json
{
  "canInvite": true,
  "userExists": true,
  "userName": "John Doe",
  "isAlreadyMember": false
}
```

**Response (User Doesn't Exist):**
```json
{
  "canInvite": true,
  "userExists": false,
  "userName": null,
  "isAlreadyMember": false,
  "requiresConfirmation": true,
  "confirmationMessage": "Este email nao pertence a um usuario do Finance Tracker. Deseja enviar um convite para a plataforma?"
}
```

**Response (Already Member):**
```json
{
  "canInvite": false,
  "userExists": true,
  "userName": "John Doe",
  "isAlreadyMember": true,
  "errorMessage": "Este usuario ja e membro do grupo"
}
```

#### Modified Invite Endpoint

```
POST /api/v1/groups/:id/invite
```

**Request (Existing User):**
```json
{
  "email": "existinguser@example.com"
}
```

**Request (Non-User with Confirmation):**
```json
{
  "email": "newuser@example.com",
  "confirmNonUser": true
}
```

**Error Response (Non-User without Confirmation):**
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Este email nao pertence a um usuario do Finance Tracker",
    "requiresConfirmation": true
  }
}
```
Status: `422 Unprocessable Entity`

### Frontend Changes

#### InviteModal.tsx - Add Two-Step Flow

```typescript
// New state
const [checkResult, setCheckResult] = useState<InviteCheckResult | null>(null)
const [showConfirmation, setShowConfirmation] = useState(false)

// Step 1: Check email
const handleCheckEmail = async () => {
  const result = await checkInviteEligibility(groupId, email)
  setCheckResult(result)

  if (!result.canInvite) {
    setError(result.errorMessage)
    return
  }

  if (!result.userExists) {
    setShowConfirmation(true)
    return
  }

  // User exists, proceed directly
  await handleSendInvite(false)
}

// Step 2: Send invite (with or without confirmation)
const handleSendInvite = async (confirmNonUser: boolean) => {
  await inviteMember(groupId, email, confirmNonUser)
  onClose()
}
```

#### New Confirmation Dialog Content

```
┌─────────────────────────────────────────────────────────┐
│  Usuario nao encontrado                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  O email "newuser@example.com" nao pertence a um        │
│  usuario do Finance Tracker.                            │
│                                                         │
│  Deseja enviar um convite para esta pessoa se           │
│  cadastrar na plataforma e entrar no grupo?             │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────────┐   │
│  │   Cancelar  │  │  Sim, Enviar Convite            │   │
│  └─────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### Backend Files

**Modified:**
1. `backend/internal/application/usecase/group/invite_member.go`
   - Add `ConfirmNonUser` field to input
   - Return error if user doesn't exist AND `ConfirmNonUser` is false

2. `backend/internal/integration/entrypoint/controller/group.go`
   - Add new `CheckInvite` handler method
   - Register route `POST /groups/:id/invite/check`
   - Modify `Invite` handler to accept `confirmNonUser` field

3. `backend/internal/integration/entrypoint/dto/group.go`
   - Add `InviteCheckRequest` DTO
   - Add `InviteCheckResponse` DTO
   - Modify `InviteMemberRequest` to include `ConfirmNonUser`

4. `backend/internal/domain/errors/group_errors.go`
   - Add `ErrCodeUserNotRegistered` error code

### Frontend Files

**Modified:**
1. `frontend/src/main/features/groups/InviteModal.tsx`
   - Add check step before sending
   - Add confirmation dialog for non-users

2. `frontend/src/main/features/groups/api/groups.ts`
   - Add `checkInviteEligibility()` API function
   - Modify `inviteMember()` to accept `confirmNonUser` parameter

3. `frontend/src/main/features/groups/types.ts`
   - Add `InviteCheckResult` type

---

## Step-by-Step Execution Instructions

### Step 1: Add Backend Error Code

**File:** `backend/internal/domain/errors/group_errors.go`

Add new error code:
```go
ErrCodeUserNotRegistered = "USER_NOT_REGISTERED"

var ErrUserNotRegistered = errors.New("user is not registered on the platform")
```

### Step 2: Create Check Endpoint DTO

**File:** `backend/internal/integration/entrypoint/dto/group.go`

Add:
```go
type InviteCheckRequest struct {
    Email string `json:"email" binding:"required,email"`
}

type InviteCheckResponse struct {
    CanInvite            bool    `json:"can_invite"`
    UserExists           bool    `json:"user_exists"`
    UserName             *string `json:"user_name,omitempty"`
    IsAlreadyMember      bool    `json:"is_already_member"`
    RequiresConfirmation bool    `json:"requires_confirmation,omitempty"`
    ErrorMessage         *string `json:"error_message,omitempty"`
}
```

Modify `InviteMemberRequest`:
```go
type InviteMemberRequest struct {
    Email          string `json:"email" binding:"required,email"`
    ConfirmNonUser bool   `json:"confirm_non_user"`
}
```

### Step 3: Add Check Handler

**File:** `backend/internal/integration/entrypoint/controller/group.go`

Add new method and register route:
```go
func (c *GroupController) CheckInvite(ctx *gin.Context) {
    // Parse group ID
    // Validate email
    // Check if user exists
    // Check if already member
    // Return appropriate response
}

// In RegisterRoutes:
groups.POST("/:id/invite/check", c.CheckInvite)
```

### Step 4: Modify Invite Use Case

**File:** `backend/internal/application/usecase/group/invite_member.go`

Modify `InviteMemberInput`:
```go
type InviteMemberInput struct {
    GroupID        uuid.UUID
    Email          string
    InviterID      uuid.UUID
    ConfirmNonUser bool  // NEW
}
```

Add validation after existing user check (around line 127):
```go
// If user doesn't exist and not confirmed, return error requiring confirmation
if existingUser == nil && !input.ConfirmNonUser {
    return nil, domainerror.NewGroupError(
        domainerror.ErrCodeUserNotRegistered,
        "user is not registered, confirmation required",
        domainerror.ErrUserNotRegistered,
    )
}
```

### Step 5: Update Frontend API

**File:** `frontend/src/main/features/groups/api/groups.ts`

Add:
```typescript
export interface InviteCheckResult {
    canInvite: boolean
    userExists: boolean
    userName?: string
    isAlreadyMember: boolean
    requiresConfirmation?: boolean
    errorMessage?: string
}

export async function checkInviteEligibility(groupId: string, email: string): Promise<InviteCheckResult> {
    const response = await apiClient.post(`/groups/${groupId}/invite/check`, { email })
    return response.data
}

export async function inviteMember(groupId: string, email: string, confirmNonUser = false): Promise<void> {
    await apiClient.post(`/groups/${groupId}/invite`, { email, confirm_non_user: confirmNonUser })
}
```

### Step 6: Update InviteModal Component

**File:** `frontend/src/main/features/groups/InviteModal.tsx`

Implement the two-step flow with confirmation dialog (see Detailed Specifications section).

---

## Acceptance Criteria

- [ ] Backend returns error when inviting non-registered user without confirmation
- [ ] Backend accepts invitation when `confirmNonUser: true` is provided
- [ ] New `/invite/check` endpoint returns user existence status
- [ ] Frontend shows confirmation dialog when email is not a registered user
- [ ] Frontend proceeds directly when email belongs to existing user
- [ ] Error messages are displayed in Portuguese
- [ ] Existing invite flow for registered users still works
- [ ] All existing E2E tests pass
- [ ] No regressions in group functionality

---

## Related Documentation

- **Feature Spec:** `context/features/M14-email-notifications/` - Email sending integration
- **Tests:** `e2e/tests/m9-groups/` - Group-related E2E tests

---

## Commands to Run

```bash
# Run backend tests
cd backend && make test

# Run group E2E tests
cd e2e && npx playwright test tests/m9-groups/

# Build checks
cd frontend && npm run build
cd backend && go build ./...
```
