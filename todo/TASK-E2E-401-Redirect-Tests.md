# AI Prompt: Implement E2E Test for 401 Redirect to Login

## Task Summary
Create a comprehensive E2E test that validates the application correctly redirects users to the login page when receiving a 401 Unauthorized response from the API. **This test is expected to FAIL until the bug is fixed**, as the current implementation does not handle 401 errors properly.

## Bug Description
The Finance Tracker frontend currently has **no centralized 401 error handling**. According to the UI Requirements Document (Section 8.2 API Error Handling), when the API returns a 401 Unauthorized status:
- The user should be **silently redirected to `/login`**
- No error message is needed (unlike 403 which shows "Você não tem permissão")
- Auth tokens should be cleared from localStorage

### Current Problematic Behavior
1. API functions only check `!response.ok` generically - no status code distinction
2. The `refreshToken()` function exists but is never called
3. Route guards only check if token EXISTS, not if it's VALID/expired
4. When an API call returns 401, the app shows a generic error or crashes silently

### Expected Behavior (Per Requirements)
When ANY authenticated API call returns 401:
1. Clear `access_token` and `refresh_token` from localStorage
2. Redirect user to `/login` page
3. Optionally: Attempt token refresh first before redirecting

## Test File Location
Create the test at: `e2e/tests/error-scenarios/401-redirect.spec.ts`

## E2E Project Structure & Configuration

### Playwright Config (Key Points)
```typescript
// e2e/playwright.config.ts
- testDir: './tests'
- baseURL: 'http://localhost:3001' (frontend)
- API_URL: 'http://localhost:8081/api/v1' (backend)
- Uses saved auth state from 'tests/fixtures/.auth/user.json'
- Error scenarios project depends on 'auth-setup'
```

### Test Naming Convention
- Pattern: `ERR-E2E-{number}: Description`
- Use descriptive test names that explain the expected behavior

## Available Test Utilities

### From `../fixtures/test-utils.ts`:
```typescript
export const API_URL = 'http://localhost:8081/api/v1'
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'E2eTestPassword1234',
  name: 'E2E Test User',
}

export async function getAuthToken(page: Page): Promise<string>
export async function loginViaUI(page: Page, maxRetries = 3): Promise<void>
export async function createCategory(page: Page, category: {...}): Promise<TestCategory>
export async function fetchCategories(page: Page): Promise<TestCategory[]>
export async function fetchTransactions(page: Page): Promise<TestTransaction[]>
```

### From `../fixtures/error-mocks.ts`:
```typescript
export async function mockApiError(
  page: Page,
  urlPattern: string,
  statusCode: number,
  errorMessage: string,
  errorCode?: string
): Promise<void>

export async function clearMocks(page: Page): Promise<void>
```

## Test Scenarios to Implement

Create a test file with the following scenarios:

### 1. **ERR-E2E-010: Should redirect to login when API returns 401 on protected route**
- User is on an authenticated page (e.g., `/dashboard`, `/transactions`, `/categories`)
- Mock API to return 401 for ANY subsequent request
- Verify user is redirected to `/login`
- Verify tokens are cleared from localStorage

### 2. **ERR-E2E-011: Should redirect to login when transactions API returns 401**
- Navigate to `/transactions`
- Mock `**/api/v1/transactions**` to return 401
- Trigger a refresh or navigation action
- Verify redirect to `/login`

### 3. **ERR-E2E-012: Should redirect to login when categories API returns 401**
- Navigate to `/categories`
- Mock `**/api/v1/categories**` to return 401
- Reload page or trigger re-fetch
- Verify redirect to `/login`

### 4. **ERR-E2E-013: Should redirect to login when dashboard API returns 401**
- Navigate to `/dashboard`
- Mock `**/api/v1/dashboard/**` to return 401
- Verify redirect to `/login`

### 5. **ERR-E2E-014: Should clear tokens from localStorage on 401 redirect**
- Login and verify tokens exist in localStorage
- Mock API to return 401
- Trigger API call
- Verify `access_token` and `refresh_token` are removed from localStorage
- Verify redirect to `/login`

### 6. **ERR-E2E-015: Should handle 401 during form submission (create transaction)**
- Navigate to `/transactions`
- Open "Add Transaction" modal
- Fill form with valid data
- Mock POST endpoint to return 401
- Submit form
- Verify redirect to `/login` (not just error toast)

### 7. **ERR-E2E-016: Should handle 401 on any authenticated API call mid-session**
- User is actively using the app (logged in)
- Simulate token expiration by mocking 401 on next API call
- Verify seamless redirect to login without app crash

## Example Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { mockApiError, clearMocks } from '../fixtures/error-mocks'
import { getAuthToken, API_URL } from '../fixtures/test-utils'

/**
 * 401 Unauthorized Redirect Tests
 *
 * These tests validate that the application correctly redirects users
 * to the login page when receiving 401 Unauthorized from the API.
 *
 * EXPECTED: These tests will FAIL until the 401 handling is implemented.
 *
 * Requirements Reference: Frontend UI v3.0 Section 8.2 API Error Handling
 * | Unauthorized | 401 | --- | Redirect to login |
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('Error Scenarios: 401 Unauthorized Redirect', () => {
  test.afterEach(async ({ page }) => {
    await clearMocks(page)
  })

  test('ERR-E2E-010: Should redirect to login when API returns 401', async ({ page }) => {
    // Step 1: Navigate to authenticated page
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Step 2: Verify we're authenticated (tokens exist)
    const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(tokenBefore).toBeTruthy()

    // Step 3: Mock ALL API endpoints to return 401
    await mockApiError(page, '**/api/v1/**', 401, 'Token expired')

    // Step 4: Trigger an API call (e.g., refresh or navigate)
    await page.reload()

    // Step 5: Verify redirect to login
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

    // Step 6: Verify tokens were cleared
    const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(tokenAfter).toBeNull()
  })

  test('ERR-E2E-011: Should redirect to login when transactions API returns 401', async ({ page }) => {
    // Step 1: Navigate to transactions first (to load page structure)
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Step 2: Verify we're authenticated
    const tokenBefore = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(tokenBefore).toBeTruthy()

    // Step 3: Mock 401 error for transactions requests
    await mockApiError(page, '**/api/v1/transactions**', 401, 'Token expired')

    // Step 4: Refresh to trigger error
    await page.reload()

    // Step 5: Should redirect to login
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
  })

  test('ERR-E2E-012: Should redirect to login when categories API returns 401', async ({ page }) => {
    // Step 1: Navigate to categories
    await page.goto('/categories')
    await page.waitForLoadState('domcontentloaded')

    // Step 2: Mock 401 error for categories requests
    await mockApiError(page, '**/api/v1/categories**', 401, 'Token expired')

    // Step 3: Refresh to trigger error
    await page.reload()

    // Step 4: Should redirect to login
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
  })

  test('ERR-E2E-013: Should redirect to login when dashboard API returns 401', async ({ page }) => {
    // Step 1: Mock 401 error for dashboard endpoints BEFORE navigation
    await mockApiError(page, '**/api/v1/dashboard/**', 401, 'Token expired')

    // Step 2: Navigate to dashboard
    await page.goto('/dashboard')

    // Step 3: Should redirect to login
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
  })

  test('ERR-E2E-014: Should clear tokens from localStorage on 401 redirect', async ({ page }) => {
    // Step 1: Navigate to dashboard and verify tokens exist
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'))
    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'))
    expect(accessToken).toBeTruthy()
    // refresh_token may or may not exist depending on login flow

    // Step 2: Mock 401 for any API call
    await mockApiError(page, '**/api/v1/**', 401, 'Token expired')

    // Step 3: Trigger API call
    await page.reload()

    // Step 4: Wait for potential redirect
    await page.waitForTimeout(2000)

    // Step 5: Verify tokens are cleared
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    const accessTokenAfter = await page.evaluate(() => localStorage.getItem('access_token'))
    const refreshTokenAfter = await page.evaluate(() => localStorage.getItem('refresh_token'))

    expect(accessTokenAfter).toBeNull()
    expect(refreshTokenAfter).toBeNull()

    // Step 6: Verify redirect happened
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
  })

  test('ERR-E2E-015: Should handle 401 during form submission', async ({ page }) => {
    // Step 1: Navigate to transactions
    await page.goto('/transactions')
    await expect(page.getByTestId('transactions-header')).toBeVisible()

    // Step 2: Open add transaction modal
    await page.getByTestId('add-transaction-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 3: Fill form with valid data
    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('Test Transaction')
    await modalBody.getByTestId('transaction-amount').fill('100')

    // Step 4: Mock 401 for POST request BEFORE submitting
    await mockApiError(page, '**/api/v1/transactions', 401, 'Token expired')

    // Step 5: Submit form
    await page.getByTestId('modal-save-btn').click()

    // Step 6: Should redirect to login (not just show error toast)
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })
  })

  test('ERR-E2E-016: Should handle 401 mid-session without crashing', async ({ page }) => {
    // Step 1: Navigate to dashboard - fully loaded
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Step 2: Verify app is working (some content visible)
    const dashboardScreen = page.getByTestId('dashboard-screen')
    await expect(dashboardScreen).toBeVisible({ timeout: 10000 })

    // Step 3: Simulate token expiration - mock 401 on next API call
    await mockApiError(page, '**/api/v1/**', 401, 'Token expired')

    // Step 4: Navigate to another page (triggers API call)
    await page.goto('/transactions')

    // Step 5: Should redirect to login seamlessly
    // THIS ASSERTION WILL FAIL UNTIL BUG IS FIXED
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

    // Step 6: App should not have crashed - login page should be functional
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByTestId('input-password')).toBeVisible()
  })
})
```

## Important Implementation Notes

1. **Test Isolation**: These tests use the saved auth state from `auth.setup.ts`. Each test should clean up mocks in `afterEach`.

2. **Timing**: Use `waitForLoadState('networkidle')` or appropriate waits before mocking to ensure page loads first.

3. **Mock Order**: Set up mocks BEFORE triggering actions that will call the API.

4. **Assertions That Will Fail**: The key assertion `expect(page).toHaveURL(/.*login/)` will fail because the current implementation does NOT redirect on 401.

5. **Token Verification**: Check both that redirect happens AND tokens are cleared - both are required behaviors.

6. **Multiple Endpoints**: Test 401 handling on various endpoints (transactions, categories, dashboard, goals) to ensure global handling works.

## Files to Reference

- **UI Requirements**: `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` (Section 8.2)
- **Implementation Guide**: `context/Finance-Tracker-Implementation-Guide-Complete-v1.md`
- **Existing Error Tests**: `e2e/tests/error-scenarios/api-errors.spec.ts`
- **Test Utilities**: `e2e/tests/fixtures/test-utils.ts`
- **Error Mocks**: `e2e/tests/fixtures/error-mocks.ts`
- **Playwright Config**: `e2e/playwright.config.ts`

## Expected Test Output (Before Fix)

When running these tests before the bug is fixed, you should see failures like:
```
Error: expect(page).toHaveURL(expected)
Expected URL: /.*login/
Received URL: "http://localhost:3001/dashboard"
```

This confirms the bug exists and provides a clear target for the fix.

## Deliverables

1. Create `e2e/tests/error-scenarios/401-redirect.spec.ts` with all test scenarios
2. Tests should be well-documented explaining expected behavior
3. Include comments noting these tests are EXPECTED TO FAIL until fix is implemented
4. Follow existing code style and patterns from other E2E tests

## Related Fix Task

After implementing these tests, create a separate task to fix the frontend:
1. Create a centralized `apiClient` wrapper with 401 interceptor
2. Clear tokens on 401 response
3. Redirect to `/login` using React Router
4. Optionally attempt token refresh before redirecting
