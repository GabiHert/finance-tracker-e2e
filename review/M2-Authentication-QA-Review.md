# M2: Authentication System - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M2 - Authentication System |
| **Screens Covered** | Login, Register, Forgot Password, Reset Password |
| **Priority** | Critical |
| **Test Files** | `e2e/tests/m2-auth/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Login Screen (`LoginScreen.tsx`, `LoginForm.tsx`)

**Location:** `frontend/src/main/features/auth/components/LoginScreen.tsx`

**Components:**
- Logo with Finance Tracker branding
- Welcome heading ("Bem-vindo de volta")
- Subtitle ("Entre na sua conta")
- Card container with login form

**Form Elements:**
- Email input with envelope icon, validation
- Password input with lock icon, visibility toggle
- "Lembrar de mim" checkbox
- "Esqueceu a senha?" link
- "Entrar" submit button with loading state
- "Criar conta" registration link

### 2. Register Screen (`RegisterScreen.tsx`, `RegisterForm.tsx`)

**Location:** `frontend/src/main/features/auth/components/RegisterScreen.tsx`

**Components:**
- Logo with Finance Tracker branding
- Heading ("Criar Conta")
- Subtitle ("Comece a controlar suas financas")
- Card container with registration form

**Form Elements:**
- Full name input with person icon
- Email input with envelope icon
- Password input with visibility toggle
- Confirm password input
- Terms acceptance checkbox
- "Criar conta" submit button with loading state
- "Ja tem uma conta? Entrar" login link

### 3. Forgot Password Screen (`ForgotPasswordScreen.tsx`)

**Location:** `frontend/src/main/features/auth/components/ForgotPasswordScreen.tsx`

**Components:**
- Heading ("Esqueceu a senha?")
- Description text
- Email input field
- "Enviar link" submit button
- "Voltar para o login" link
- Success state with email icon and confirmation message

### 4. Reset Password Screen (`ResetPasswordScreen.tsx`)

**Location:** `frontend/src/main/features/auth/components/ResetPasswordScreen.tsx`

**Components:**
- Token validation (shows error if missing/invalid)
- Heading ("Redefinir senha")
- New password input with visibility toggle
- Confirm password input
- "Redefinir senha" submit button
- Success state with redirect to login
- "Solicitar novo link" for expired tokens

---

## E2E Test Scenarios

### Login Tests (`login.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-001 | Display login form elements | Verifies heading, email input, password input, and login button are visible | Implemented |
| M2-E2E-002 | Validation errors for invalid input | Submits empty form and verifies validation error messages | Implemented |
| M2-E2E-003 | Error for invalid credentials | Tests login with wrong credentials and verifies error message | Implemented |
| M2-E2E-004 | Successful login with valid credentials | Tests successful login flow and dashboard redirect | Implemented |
| M2-E2E-005 | Session persistence after login | Verifies auth tokens are stored after successful login | Implemented |

### Registration Tests (`register.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-006 | Display registration form elements | Verifies all form fields are visible | Implemented |
| M2-E2E-007 | Validate email format | Tests email validation with invalid format | Implemented |
| M2-E2E-008 | Validate password strength | Tests password validation with weak password | Implemented |
| M2-E2E-009 | Successfully register new user | Tests complete registration flow | Implemented |
| M2-E2E-010 | Prevent duplicate email registration | Tests error handling for existing email | Implemented |

### Remember Me Tests (`remember-me.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-05a | Display Remember Me checkbox | Verifies checkbox and label visibility | Implemented |
| M2-E2E-05b | Checkbox unchecked by default | Verifies default state | Implemented |
| M2-E2E-05c | Toggle checkbox | Tests checkbox toggle functionality | Implemented |
| M2-E2E-05d | Login with Remember Me checked | Tests successful login with checkbox | Implemented |
| M2-E2E-05e | Login without Remember Me | Tests successful login without checkbox | Implemented |
| M2-E2E-05f | Send remember_me flag true in request | Verifies API request includes remember_me: true | Implemented |
| M2-E2E-05g | Send remember_me flag false in request | Verifies API request includes remember_me: false | Implemented |

### Password Reset Tests (`password-reset.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-06a | Navigate to forgot password from login | Tests navigation flow | Implemented |
| M2-E2E-06b | Request password reset and show success | Tests email submission and success message | Implemented |
| M2-E2E-06c | Show error for invalid email format | Tests email validation | Implemented |
| M2-E2E-06d | Show error when accessing reset without token | Tests missing token handling | Implemented |
| M2-E2E-06e | Reset password form validates inputs | Tests password validation and matching | Implemented |
| M2-E2E-06f | Request new link navigates to forgot password | Tests navigation from expired token | Implemented |
| M2-E2E-06g | Back to login link works | Tests navigation back to login | Implemented |

### Logout Tests (`logout.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-007 | Logout and redirect to login screen | Tests complete logout flow and session clearing | Implemented |
| M2-E2E-007b | Login again after logout | Tests re-login capability after logout | Implemented |

### Token Refresh Tests (`token-refresh.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M2-E2E-08a | Store access and refresh tokens after login | Verifies token storage | Implemented |
| M2-E2E-08b | Fail refresh with invalid token | Tests invalid token handling | Implemented |
| M2-E2E-08c | Redirect to login when no tokens present | Tests protected route redirect | Implemented |
| M2-E2E-08d | Clear tokens and redirect on logout | Tests token cleanup | Implemented |
| M2-E2E-08e | Use refresh token to get new access token | Tests token refresh API | Implemented |
| M2-E2E-08f | Protected routes work with valid tokens | Tests authenticated access | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| Login Flow | 4 | 5 | 100% |
| Registration Flow | 5 | 5 | 100% |
| Remember Me | 2 | 7 | 100% |
| Password Reset | 3 | 7 | 100% |
| Logout | 2 | 2 | 100% |
| Token Refresh | 2 | 6 | 100% |
| **Total** | **18** | **32** | **100%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Email input | Yes | Validation, icons, placeholder |
| Password input | Yes | Visibility toggle, validation |
| Remember me checkbox | Yes | Default state, toggle, persistence |
| Login button | Yes | States, loading |
| Registration form | Yes | All fields validated |
| Password reset flow | Yes | Complete flow tested |
| Error messages | Yes | All error scenarios |
| Navigation links | Yes | All navigation tested |

---

## Missing Test Scenarios

Based on the E2E Testing Guide and Missing Scenarios document, the following scenarios need attention:

### 1. Token Expiry Duration Verification (Medium Priority)
**Description:** Verify that "Remember Me" actually extends token expiry to 30 days vs 7 days default.

**Current Gap:** Tests verify the flag is sent but don't validate actual token duration.

```gherkin
Scenario: Remember me extends token duration to 30 days
  Given I am on the login screen
  When I log in with "Remember Me" checked
  Then the refresh token should expire in approximately 30 days
  And when I inspect the token expiry
  Then the expiry timestamp should be ~30 days from now
```

### 2. Automatic Token Refresh on Expiry (Medium Priority)
**Description:** Verify that when access token expires, the app automatically refreshes it without user intervention.

```gherkin
Scenario: Access token is automatically refreshed when expired
  Given I am logged in with an access token that expires in 5 seconds
  And I have a valid refresh token
  When I wait for the access token to expire
  And I perform an authenticated action
  Then the request should succeed
  And a new access_token should be stored
```

### 3. Session Expiry Message (Medium Priority)
**Description:** When both tokens expire, user should see appropriate message.

```gherkin
Scenario: User sees session expired message when refresh token expires
  Given I am logged in with an expired access token
  And my refresh token is also expired
  When I perform an authenticated action
  Then I should see a message "Sua sessao expirou. Faca login novamente"
  And I should be redirected to the login screen
```

---

## Recommendations

1. **Token Duration Tests:** Consider adding tests that mock time to verify token expiry durations.

2. **Rate Limiting Tests:** Add tests for login rate limiting (5 attempts/minute per IP).

3. **Password Complexity:** Consider adding tests for password complexity rules beyond minimum length.

4. **Terms Acceptance Validation:** Add explicit test for terms_accepted requirement in registration.

5. **Email Enumeration Prevention:** Verify forgot password always shows same message regardless of email existence.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
