# E2E Scenarios: Email Notifications

**Feature Code:** M14-email-notifications
**Last Updated:** 2025-12-06

---

## 1. Overview

### 1.1 Test Scope
These E2E tests verify that email notifications are properly queued when triggered by user actions. Since we can't verify actual email delivery in E2E tests, we verify:
1. Email jobs are created in the database
2. Correct template and data are used
3. Integration with Resend doesn't break the user flow

### 1.2 Test File Location
```
e2e/tests/M14-email-notifications/email-notifications.spec.ts
```

### 1.3 Prerequisites
- Backend running with email worker
- Database accessible for queue verification
- Test user accounts

---

## 2. Test Configuration

### 2.1 Test Helpers

```typescript
// e2e/tests/M14-email-notifications/helpers.ts

import { Page } from '@playwright/test';

export async function getEmailQueueEntries(email: string): Promise<EmailQueueEntry[]> {
    // Query the database for emails sent to this recipient
    const response = await fetch(`${process.env.API_URL}/test/email-queue?email=${email}`);
    return response.json();
}

export async function clearEmailQueue(): Promise<void> {
    await fetch(`${process.env.API_URL}/test/email-queue`, { method: 'DELETE' });
}

export interface EmailQueueEntry {
    id: string;
    template_type: string;
    recipient_email: string;
    subject: string;
    template_data: Record<string, unknown>;
    status: 'pending' | 'processing' | 'sent' | 'failed';
    created_at: string;
}
```

### 2.2 Test Fixtures

```typescript
// e2e/tests/M14-email-notifications/fixtures.ts

export const testUsers = {
    existingUser: {
        email: 'existing@test.com',
        password: 'TestPassword123!',
        name: 'Existing User',
    },
    inviter: {
        email: 'inviter@test.com',
        password: 'TestPassword123!',
        name: 'Inviter User',
    },
};

export const testGroup = {
    name: 'Test Family Budget',
    description: 'A test group for E2E',
};
```

---

## 3. E2E Test Scenarios

### 3.1 Password Reset Email

#### E2E-EMAIL-001: Password Reset Email is Queued

```gherkin
Scenario: User requests password reset and email is queued
  Given I am on the login page
  And a user exists with email "user@test.com"
  When I click "Forgot password?"
  And I enter "user@test.com" in the email field
  And I click "Send reset link"
  Then I should see "Email enviado com sucesso"
  And an email should be queued with:
    | template_type | password_reset |
    | recipient     | user@test.com  |
    | status        | pending or sent |
  And the template data should contain a reset_url
```

```typescript
// e2e/tests/M14-email-notifications/password-reset.spec.ts

import { test, expect } from '@playwright/test';
import { getEmailQueueEntries, clearEmailQueue } from './helpers';
import { testUsers } from './fixtures';

test.describe('Password Reset Email', () => {
    test.beforeEach(async () => {
        await clearEmailQueue();
    });

    test('E2E-EMAIL-001: Password reset email is queued', async ({ page }) => {
        // Navigate to forgot password
        await page.goto('/login');
        await page.click('[data-testid="forgot-password-link"]');

        // Fill email and submit
        await page.fill('[data-testid="email-input"]', testUsers.existingUser.email);
        await page.click('[data-testid="send-reset-btn"]');

        // Verify success message
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Email enviado');

        // Verify email was queued
        const emails = await getEmailQueueEntries(testUsers.existingUser.email);
        expect(emails).toHaveLength(1);

        const email = emails[0];
        expect(email.template_type).toBe('password_reset');
        expect(email.recipient_email).toBe(testUsers.existingUser.email);
        expect(email.subject).toContain('Redefinir sua senha');
        expect(email.template_data).toHaveProperty('reset_url');
        expect(email.template_data).toHaveProperty('user_name');
        expect(['pending', 'sent']).toContain(email.status);
    });

    test('E2E-EMAIL-002: No email queued for non-existent user', async ({ page }) => {
        await page.goto('/login');
        await page.click('[data-testid="forgot-password-link"]');

        await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
        await page.click('[data-testid="send-reset-btn"]');

        // Still shows success (security - don't reveal if email exists)
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

        // But no email was actually queued
        const emails = await getEmailQueueEntries('nonexistent@test.com');
        expect(emails).toHaveLength(0);
    });
});
```

### 3.2 Group Invitation Email

#### E2E-EMAIL-003: Group Invitation Email is Queued

```gherkin
Scenario: User invites member and invitation email is queued
  Given I am logged in as "inviter@test.com"
  And I have a group "Family Budget"
  When I go to group settings
  And I click "Invite member"
  And I enter "newmember@test.com"
  And I click "Send invitation"
  Then I should see "Convite enviado"
  And an email should be queued with:
    | template_type | group_invitation |
    | recipient     | newmember@test.com |
  And the template data should contain:
    | inviter_name | Inviter User |
    | group_name   | Family Budget |
    | invite_url   | contains /groups/join?token= |
```

```typescript
// e2e/tests/M14-email-notifications/group-invitation.spec.ts

import { test, expect } from '@playwright/test';
import { getEmailQueueEntries, clearEmailQueue } from './helpers';
import { testUsers, testGroup } from './fixtures';
import { loginAs, createGroup } from '../fixtures/test-utils';

test.describe('Group Invitation Email', () => {
    let groupId: string;

    test.beforeEach(async ({ page }) => {
        await clearEmailQueue();
        await loginAs(page, testUsers.inviter);
        groupId = await createGroup(page, testGroup);
    });

    test('E2E-EMAIL-003: Invitation email is queued', async ({ page }) => {
        const inviteeEmail = 'newmember@test.com';

        // Navigate to group settings
        await page.goto(`/groups/${groupId}`);
        await page.click('[data-testid="group-settings-tab"]');

        // Open invite modal
        await page.click('[data-testid="invite-member-btn"]');
        await expect(page.locator('[data-testid="invite-modal"]')).toBeVisible();

        // Enter email and send
        await page.fill('[data-testid="invite-email-input"]', inviteeEmail);
        await page.click('[data-testid="send-invite-btn"]');

        // Verify success
        await expect(page.locator('[data-testid="toast-success"]')).toContainText('Convite enviado');

        // Verify email was queued
        const emails = await getEmailQueueEntries(inviteeEmail);
        expect(emails).toHaveLength(1);

        const email = emails[0];
        expect(email.template_type).toBe('group_invitation');
        expect(email.recipient_email).toBe(inviteeEmail);
        expect(email.subject).toContain(testUsers.inviter.name);
        expect(email.subject).toContain(testGroup.name);

        // Verify template data
        expect(email.template_data.inviter_name).toBe(testUsers.inviter.name);
        expect(email.template_data.inviter_email).toBe(testUsers.inviter.email);
        expect(email.template_data.group_name).toBe(testGroup.name);
        expect(email.template_data.invite_url).toContain('/groups/join?token=');
    });

    test('E2E-EMAIL-004: Duplicate invitation does not queue duplicate email', async ({ page }) => {
        const inviteeEmail = 'already-invited@test.com';

        // First invitation
        await page.goto(`/groups/${groupId}`);
        await page.click('[data-testid="group-settings-tab"]');
        await page.click('[data-testid="invite-member-btn"]');
        await page.fill('[data-testid="invite-email-input"]', inviteeEmail);
        await page.click('[data-testid="send-invite-btn"]');
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

        // Clear queue to test second invitation
        await clearEmailQueue();

        // Try to invite again
        await page.click('[data-testid="invite-member-btn"]');
        await page.fill('[data-testid="invite-email-input"]', inviteeEmail);
        await page.click('[data-testid="send-invite-btn"]');

        // Should show error or warning
        await expect(page.locator('[data-testid="toast-error"]')).toContainText('ja foi convidado');

        // No new email should be queued
        const emails = await getEmailQueueEntries(inviteeEmail);
        expect(emails).toHaveLength(0);
    });
});
```

### 3.3 Email Queue Processing

#### E2E-EMAIL-005: Email Status Updates After Processing

```gherkin
Scenario: Queued email is processed by worker
  Given I triggered a password reset for "user@test.com"
  And an email is queued with status "pending"
  When I wait for the email worker to process
  Then the email status should be "sent"
  And resend_id should be populated
```

```typescript
// e2e/tests/M14-email-notifications/queue-processing.spec.ts

import { test, expect } from '@playwright/test';
import { getEmailQueueEntries, clearEmailQueue } from './helpers';

test.describe('Email Queue Processing', () => {
    test('E2E-EMAIL-005: Email is processed to sent status', async ({ page }) => {
        await clearEmailQueue();

        // Trigger password reset
        await page.goto('/login');
        await page.click('[data-testid="forgot-password-link"]');
        await page.fill('[data-testid="email-input"]', 'user@test.com');
        await page.click('[data-testid="send-reset-btn"]');

        // Wait for worker to process (poll for up to 30 seconds)
        let email;
        for (let i = 0; i < 6; i++) {
            await page.waitForTimeout(5000); // Wait 5 seconds

            const emails = await getEmailQueueEntries('user@test.com');
            if (emails.length > 0 && emails[0].status === 'sent') {
                email = emails[0];
                break;
            }
        }

        expect(email).toBeDefined();
        expect(email.status).toBe('sent');
        expect(email.resend_id).toBeTruthy();
    });
});
```

---

## 4. Test API Endpoints

For E2E testing, we need test-only endpoints to query the email queue:

### 4.1 Test Endpoints (Development Only)

```go
// Location: backend/internal/integration/handler/test_handler.go
// Only enabled when ENV=development or ENV=test

// GET /test/email-queue?email=xxx
// Returns emails for a specific recipient

// DELETE /test/email-queue
// Clears the email queue (for test setup)
```

### 4.2 Implementation

```go
func (h *TestHandler) GetEmailQueue(c *gin.Context) {
    if !h.isTestEnv() {
        c.JSON(403, gin.H{"error": "Test endpoints disabled"})
        return
    }

    email := c.Query("email")
    jobs, err := h.emailQueueRepo.GetByRecipient(c, email)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, jobs)
}

func (h *TestHandler) ClearEmailQueue(c *gin.Context) {
    if !h.isTestEnv() {
        c.JSON(403, gin.H{"error": "Test endpoints disabled"})
        return
    }

    _, err := h.db.Exec("DELETE FROM email_queue")
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, gin.H{"message": "Queue cleared"})
}
```

---

## 5. Visual Testing

### 5.1 Email Preview Endpoint (Development)

For visual testing of email templates:

```go
// GET /test/email-preview/:template
// Renders email template with sample data

func (h *TestHandler) PreviewEmail(c *gin.Context) {
    template := c.Param("template")

    var data map[string]interface{}
    switch template {
    case "password_reset":
        data = map[string]interface{}{
            "user_name":  "Test User",
            "reset_url":  "http://localhost:5173/reset-password?token=sample-token",
            "expires_in": "1 hora",
        }
    case "group_invitation":
        data = map[string]interface{}{
            "inviter_name":  "John Doe",
            "inviter_email": "john@example.com",
            "group_name":    "Family Budget",
            "invite_url":    "http://localhost:5173/groups/join?token=sample-token",
            "expires_in":    "7 dias",
        }
    default:
        c.JSON(404, gin.H{"error": "Unknown template"})
        return
    }

    html, _, _ := h.renderer.Render(template, data)
    c.Data(200, "text/html", []byte(html))
}
```

Access at:
- http://localhost:8080/test/email-preview/password_reset
- http://localhost:8080/test/email-preview/group_invitation

---

## 6. Test Execution

### Run All Email Tests
```bash
cd e2e && npx playwright test tests/M14-email-notifications/
```

### Run Specific Test
```bash
cd e2e && npx playwright test tests/M14-email-notifications/password-reset.spec.ts
```

### Run with Debug
```bash
cd e2e && npx playwright test tests/M14-email-notifications/ --debug
```

### Run with Trace
```bash
cd e2e && npx playwright test tests/M14-email-notifications/ --trace on
```

---

## 7. CI/CD Considerations

### 7.1 Test Environment

For CI, ensure:
1. Database is available and migrated
2. Backend is running with `EMAIL_WORKER_ENABLED=true`
3. Resend API key is set (can use test mode)

### 7.2 Flaky Test Prevention

- Use polling with timeout instead of fixed waits
- Clear queue before each test
- Use unique email addresses per test run if needed

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
