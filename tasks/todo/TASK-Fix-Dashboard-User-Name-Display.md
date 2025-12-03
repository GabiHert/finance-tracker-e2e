# Task: Fix Dashboard User Name Display

## Overview

The dashboard always displays "Ola, Usuario" (Hello, User) instead of showing the actual logged-in user's name. This is because user data returned from the login API is not being persisted in the frontend.

**Goal:** Display the actual user's name in the dashboard greeting instead of the hardcoded "Usuario" fallback.

---

## Current State Analysis

### What Exists

**Backend (Working Correctly):**
- Login endpoint returns complete `User` object including `name` field
- `AuthResponse` struct in `backend/internal/integration/entrypoint/dto/auth.go` (lines 52-82):
```go
type AuthResponse struct {
  AccessToken  string       `json:"access_token"`
  RefreshToken string       `json:"refresh_token"`
  User         UserResponse `json:"user"`  // Contains name
}
```

**Frontend (Incomplete):**
- `LoginScreen.tsx` only stores tokens, discards user data:
```tsx
localStorage.setItem('access_token', response.access_token)
localStorage.setItem('refresh_token', response.refresh_token)
// response.user is never saved!
```

- `DashboardScreen.tsx` has hardcoded fallback (line 73-74):
```tsx
const userName = 'Usuario'  // Hardcoded!
```

### What's Missing/Broken

1. **No User Data Persistence**: Login/Register screens don't save `response.user` to localStorage
2. **No User Data Retrieval**: Dashboard doesn't read user data from storage
3. **No Custom Hook**: No reusable hook for accessing user data across components

---

## Execution Plan

### Phase 1: Frontend Implementation

1. Update `LoginScreen.tsx` to store user data after login
2. Update `RegisterScreen.tsx` to store user data after registration
3. Create `useAuthUser` hook for consistent user data access
4. Update `DashboardScreen.tsx` to display actual user name

### Phase 2: Verification

1. Test login flow - verify user data is stored
2. Test dashboard - verify actual name is displayed
3. Test registration flow - verify user data is stored
4. Run E2E tests to ensure no regressions

---

## Detailed Specifications

### Fix 1: Store User Data in LoginScreen

**File:** `frontend/src/main/features/auth/components/LoginScreen.tsx`

Find the login handler (around line 40-45) and add user storage:

```tsx
const response = await login(request)

// Store tokens
localStorage.setItem('access_token', response.access_token)
localStorage.setItem('refresh_token', response.refresh_token)

// ADD THIS: Store user data
localStorage.setItem('user', JSON.stringify(response.user))

// Navigate to dashboard
navigate('/dashboard')
```

### Fix 2: Store User Data in RegisterScreen

**File:** `frontend/src/main/features/auth/components/RegisterScreen.tsx`

Apply the same fix after registration:

```tsx
const response = await register(request)

// Store tokens
localStorage.setItem('access_token', response.access_token)
localStorage.setItem('refresh_token', response.refresh_token)

// ADD THIS: Store user data
localStorage.setItem('user', JSON.stringify(response.user))

// Navigate to dashboard
navigate('/dashboard')
```

### Fix 3: Create useAuthUser Hook

**File:** `frontend/src/main/hooks/useAuthUser.ts` (NEW FILE)

```typescript
import { useEffect, useState } from 'react'
import type { User } from '@main/features/auth/types'

export function useAuthUser() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		try {
			const userJson = localStorage.getItem('user')
			if (userJson) {
				setUser(JSON.parse(userJson))
			}
		} catch (error) {
			console.error('Failed to parse user data:', error)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const updateUser = (updatedUser: User) => {
		localStorage.setItem('user', JSON.stringify(updatedUser))
		setUser(updatedUser)
	}

	const clearUser = () => {
		localStorage.removeItem('user')
		setUser(null)
	}

	return { user, isLoading, updateUser, clearUser }
}
```

### Fix 4: Update DashboardScreen to Display User Name

**File:** `frontend/src/main/features/dashboard/DashboardScreen.tsx`

**Current Code (lines 73-74):**
```tsx
// Get user name (mock for now)
const userName = 'Usuario'
```

**Fixed Code:**
```tsx
// Get user name from localStorage
const getUserName = (): string => {
	try {
		const userJson = localStorage.getItem('user')
		if (userJson) {
			const user = JSON.parse(userJson)
			return user.name || 'Usuario'
		}
	} catch (error) {
		console.error('Failed to parse user data:', error)
	}
	return 'Usuario'
}

const userName = getUserName()
```

**Alternative using the hook:**
```tsx
import { useAuthUser } from '@main/hooks/useAuthUser'

// Inside the component:
const { user } = useAuthUser()
const userName = user?.name || 'Usuario'
```

### Fix 5: Clear User Data on Logout

**File:** Wherever logout logic exists (likely in a header or settings component)

Ensure logout clears user data:
```tsx
const handleLogout = () => {
	localStorage.removeItem('access_token')
	localStorage.removeItem('refresh_token')
	localStorage.removeItem('user')  // ADD THIS
	navigate('/login')
}
```

---

## Files to Create/Modify

### New Files:
- `frontend/src/main/hooks/useAuthUser.ts` - Custom hook for user data access

### Modified Files:
- `frontend/src/main/features/auth/components/LoginScreen.tsx` - Store user data after login
- `frontend/src/main/features/auth/components/RegisterScreen.tsx` - Store user data after registration
- `frontend/src/main/features/dashboard/DashboardScreen.tsx` - Retrieve and display user name
- Any logout handler - Clear user data on logout

---

## Step-by-Step Execution Instructions

### Step 1: Update LoginScreen

Open `frontend/src/main/features/auth/components/LoginScreen.tsx`

Find the login success handler and add:
```tsx
localStorage.setItem('user', JSON.stringify(response.user))
```

### Step 2: Update RegisterScreen

Open `frontend/src/main/features/auth/components/RegisterScreen.tsx`

Find the registration success handler and add:
```tsx
localStorage.setItem('user', JSON.stringify(response.user))
```

### Step 3: Create useAuthUser Hook

Create new file `frontend/src/main/hooks/useAuthUser.ts` with the hook code provided above.

### Step 4: Update DashboardScreen

Open `frontend/src/main/features/dashboard/DashboardScreen.tsx`

Replace the hardcoded `userName` with code that retrieves from localStorage (see detailed spec above).

### Step 5: Update Logout Logic

Find any logout handlers and ensure they clear the `user` from localStorage.

### Step 6: Test Manually

1. Log out if currently logged in
2. Log in with a user that has a name
3. Verify dashboard shows "Ola, [ActualName]"
4. Log out and verify you can log in again

---

## Acceptance Criteria

- [ ] After login, user data is stored in localStorage
- [ ] After registration, user data is stored in localStorage
- [ ] Dashboard displays actual user name (not "Usuario")
- [ ] "Usuario" is only shown as fallback when name is unavailable
- [ ] Logout clears user data from localStorage
- [ ] No TypeScript errors
- [ ] Frontend builds successfully
- [ ] E2E tests pass

---

## Related Documentation

- **Auth Types:** `frontend/src/main/features/auth/types.ts` - User interface definition
- **Backend DTO:** `backend/internal/integration/entrypoint/dto/auth.go` - AuthResponse structure

---

## Commands to Run

```bash
# Build check
cd frontend && npm run build

# Run frontend for manual testing
cd frontend && npm run dev

# Run E2E tests
cd e2e && npx playwright test
```

---

## Visual Reference

**Current (Bug):** "Ola, Usuario"
**Expected:** "Ola, Gabriel" (or whatever the user's actual name is)
