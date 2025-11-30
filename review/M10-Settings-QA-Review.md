# M10: Settings & User Profile - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M10 - Settings & User Profile |
| **Screens Covered** | SettingsScreen |
| **Priority** | Medium |
| **Test Files** | `e2e/tests/m10-settings/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Settings Screen (`SettingsScreen.tsx`)

**Location:** `frontend/src/main/features/settings/SettingsScreen.tsx`

**Components:**
- Page header with "Configuracoes" title
- Profile section with user name and email
- Edit profile button
- Preferences section (date format, number format)
- Notifications section with toggle switches
- Data section with delete account button
- Change password button
- Theme toggle (if implemented)

**Features:**
- Profile editing (name)
- Date format preference
- Number format preference
- Email notification toggle
- Password change with current password verification
- Account deletion with confirmation
- Data export (if implemented)

---

## E2E Test Scenarios

### Settings Tests (`settings.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M10-E2E-001 | Display user profile information | Tests profile section visibility | Implemented |
| M10-E2E-002 | Update user profile name | Tests name edit flow | Implemented |
| M10-E2E-003 | Update date format preference | Tests date format dropdown | Implemented |
| M10-E2E-004 | Update number format preference | Tests number format dropdown | Implemented |
| M10-E2E-005 | Toggle notification preferences | Tests notification toggle | Implemented |
| M10-E2E-006 | Change password successfully | Tests password change flow | Implemented |
| M10-E2E-007 | Show error for wrong current password | Tests password validation | Implemented |
| M10-E2E-008 | Show delete account confirmation flow | Tests delete account modal | Implemented |
| M10-E2E-009 | Display all settings sections | Tests section visibility | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| Profile Display | 1 | 1 | 100% |
| Profile Edit | 1 | 1 | 100% |
| Preferences | 2 | 2 | 100% |
| Notifications | 1 | 1 | 100% |
| Password Change | 2 | 2 | 100% |
| Account Deletion | 1 | 1 | 100% |
| **Total** | **8** | **9** | **113%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Profile section | Yes | Name, email display |
| Edit profile modal | Yes | Name input |
| Date format dropdown | Yes | Format selection |
| Number format dropdown | Yes | Format selection |
| Notification toggles | Yes | Toggle switches |
| Change password modal | Yes | All 3 password fields |
| Delete account modal | Yes | Confirmation required |
| All sections | Yes | 4 sections verified |

---

## Missing Test Scenarios

### 1. Theme Toggle (Dark Mode) (High Priority)
**Description:** Switch between light and dark theme.

```gherkin
Scenario: Toggle dark mode
  Given I am on settings page in light mode
  When I toggle the theme switch
  Then the UI should switch to dark mode
  And the preference should be saved
  And it should persist after page refresh
```

### 2. Email Update (Medium Priority)
**Description:** Change email address with verification.

```gherkin
Scenario: Update email address
  Given I want to change my email
  When I click edit email
  And I enter a new email address
  Then a verification email should be sent
  And I should see pending verification message
```

### 3. Data Export (Medium Priority)
**Description:** Export all user data.

```gherkin
Scenario: Export personal data
  Given I am on the Data section
  When I click "Export My Data"
  Then a download should start
  And it should contain all my transactions, categories, and settings
```

### 4. Password Strength Validation (Medium Priority)
**Description:** New password must meet requirements.

```gherkin
Scenario: Validate new password strength
  Given I am changing my password
  When I enter a weak password "12345"
  Then I should see password requirements
  And the save button should be disabled
```

### 5. Confirm Password Match (Low Priority)
**Description:** Confirm password must match new password.

```gherkin
Scenario: Password confirmation must match
  Given I am changing my password
  When I enter new password "NewPass123!"
  And I enter confirm password "NewPass124!"
  Then I should see "Passwords do not match" error
```

### 6. Currency Preference (Medium Priority)
**Description:** Select preferred currency.

```gherkin
Scenario: Change currency preference
  Given I am on preferences section
  When I change currency to "USD"
  Then all amounts should display in USD format
```

### 7. Language Preference (Low Priority)
**Description:** Change app language.

```gherkin
Scenario: Change language preference
  Given I am on preferences section
  When I change language to "English"
  Then the UI should switch to English
```

### 8. Session Management (Low Priority)
**Description:** View and manage active sessions.

```gherkin
Scenario: View active sessions
  Given I am on the security section
  When I view "Active Sessions"
  Then I should see all logged-in devices
  And I should be able to log out other sessions
```

### 9. Account Deletion Cancel (Low Priority)
**Description:** Cancel account deletion process.

```gherkin
Scenario: Cancel account deletion
  Given I started the delete account flow
  When I click "Cancel"
  Then my account should not be deleted
  And I should return to settings
```

---

## Recommendations

1. **Theme Testing:** Add dark mode toggle tests with persistence.

2. **Password Validation:** Add comprehensive password strength tests.

3. **Data Export:** Implement and test data export functionality.

4. **Email Change:** Add email change with verification flow.

5. **Security Section:** Add session management tests.

6. **Accessibility:** Test settings form accessibility.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
