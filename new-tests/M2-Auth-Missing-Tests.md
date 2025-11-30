# M2: Authentication - Missing E2E Tests

## Missing Test Scenarios

### 1. Token Expiry Duration Verification
**Priority:** Medium
**File:** `e2e/tests/m2-auth/token-expiry.spec.ts`

```typescript
test.describe('M2: Token Expiry Duration', () => {
  test('M2-NEW-001: Remember me extends token duration to 30 days', async ({ page }) => {
    // Step 1: Navigate to login screen
    await page.goto('/login')

    // Step 2: Fill credentials
    await page.getByTestId('email-input').fill('test@example.com')
    await page.getByTestId('password-input').fill('TestPass123!')

    // Step 3: Check "Remember Me"
    await page.getByTestId('remember-me-checkbox').check()

    // Step 4: Submit and intercept token response
    const tokenResponse = await page.waitForResponse(
      response => response.url().includes('/auth/login')
    )
    const body = await tokenResponse.json()

    // Step 5: Verify token expiry is ~30 days from now
    const expiryDate = new Date(body.refresh_token_expires_at)
    const now = new Date()
    const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    expect(daysDiff).toBeGreaterThanOrEqual(29)
    expect(daysDiff).toBeLessThanOrEqual(31)
  })
})
```

### 2. Automatic Token Refresh on Expiry
**Priority:** Medium
**File:** `e2e/tests/m2-auth/token-refresh.spec.ts`

```typescript
test.describe('M2: Automatic Token Refresh', () => {
  test('M2-NEW-002: Access token is automatically refreshed when expired', async ({ page, context }) => {
    // Step 1: Login normally
    await page.goto('/login')
    await page.getByTestId('email-input').fill('test@example.com')
    await page.getByTestId('password-input').fill('TestPass123!')
    await page.getByTestId('login-btn').click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Step 2: Mock expired access token (manipulate storage)
    await context.addCookies([
      { name: 'access_token', value: 'expired_token', domain: 'localhost', path: '/' }
    ])

    // Step 3: Make authenticated request
    await page.goto('/transactions')

    // Step 4: Verify page loads (token was refreshed)
    await expect(page.getByTestId('transactions-header')).toBeVisible()

    // Step 5: Verify new access token was stored
    const cookies = await context.cookies()
    const accessToken = cookies.find(c => c.name === 'access_token')
    expect(accessToken?.value).not.toBe('expired_token')
  })
})
```

### 3. Session Expiry Message
**Priority:** Medium
**File:** `e2e/tests/m2-auth/session-expiry.spec.ts`

```typescript
test.describe('M2: Session Expiry', () => {
  test('M2-NEW-003: User sees session expired message when refresh token expires', async ({ page, context }) => {
    // Step 1: Clear all tokens to simulate expired session
    await context.clearCookies()

    // Step 2: Try to access protected route
    await page.goto('/dashboard')

    // Step 3: Should redirect to login
    await expect(page).toHaveURL(/\/login/)

    // Step 4: Should show session expired message
    await expect(page.getByTestId('session-expired-message')).toContainText(
      /sessao expirou|session expired/i
    )
  })
})
```

---

## Implementation Notes

- Token expiry tests may require mocking time or using short-lived test tokens
- Session management tests need careful handling of cookies/storage
- Consider using Playwright's request interception for token manipulation

## Related Review Document

See `review/M2-Authentication-QA-Review.md` for full context.
