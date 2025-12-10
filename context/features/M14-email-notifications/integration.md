# Integration Specification: Email Notifications

**Feature Code:** M14-email-notifications
**Last Updated:** 2025-12-06

---

## 1. Overview

### 1.1 Integration Summary
Email notifications are processed asynchronously via a background queue. When a trigger event occurs (password reset request, group invitation), an email job is added to the queue. A background worker processes the queue and sends emails via the Resend API.

### 1.2 Architecture Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Use Case  │────▶│ Email Queue │────▶│   Worker    │────▶│   Resend    │
│  (trigger)  │     │  (database) │     │ (processor) │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Retry on   │
                    │   failure   │
                    └─────────────┘
```

---

## 2. Email Queue System

### 2.1 Queue Table Schema

```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email content
    template_type VARCHAR(50) NOT NULL,  -- 'password_reset', 'group_invitation'
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    template_data JSONB NOT NULL,        -- Template variables

    -- Processing state
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, sent, failed
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,

    -- Resend tracking
    resend_id VARCHAR(100),              -- Resend email ID for tracking

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- When to send
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at);
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient_email);
```

### 2.2 Queue States

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be processed |
| `processing` | Currently being sent |
| `sent` | Successfully delivered to Resend |
| `failed` | All retry attempts exhausted |

### 2.3 Retry Strategy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |

After 3 failed attempts, email is marked as `failed` and logged for investigation.

---

## 3. Email Service Interface

### 3.1 Adapter Interface

```go
// Location: backend/internal/application/adapter/email_service.go

package adapter

import "context"

type EmailService interface {
    // Queue an email for async sending
    QueueEmail(ctx context.Context, input QueueEmailInput) error

    // Send email immediately (used by worker)
    SendEmail(ctx context.Context, input SendEmailInput) (*SendEmailResult, error)
}

type QueueEmailInput struct {
    TemplateType   string                 // "password_reset", "group_invitation"
    RecipientEmail string
    RecipientName  string
    Subject        string
    TemplateData   map[string]interface{}
    ScheduledAt    *time.Time             // nil = send immediately
}

type SendEmailInput struct {
    To       string
    Subject  string
    Html     string
    Text     string
    ReplyTo  string
}

type SendEmailResult struct {
    ResendID string
}
```

### 3.2 Template Data Structures

#### Password Reset Template Data
```go
type PasswordResetData struct {
    UserName  string `json:"user_name"`
    ResetURL  string `json:"reset_url"`
    ExpiresIn string `json:"expires_in"`  // "1 hora"
}
```

#### Group Invitation Template Data
```go
type GroupInvitationData struct {
    InviterName  string `json:"inviter_name"`
    InviterEmail string `json:"inviter_email"`
    GroupName    string `json:"group_name"`
    InviteURL    string `json:"invite_url"`
    ExpiresIn    string `json:"expires_in"`  // "7 dias"
}
```

---

## 4. Integration Points

### 4.1 Password Reset Flow

**File:** `backend/internal/application/usecase/auth/forgot_password.go`

**Current Code (line 72):**
```go
// In a real implementation, we would send an email here
slog.Info("Password reset token generated", "userID", user.ID, "email", user.Email)
```

**Updated Code:**
```go
// Queue password reset email
resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.config.BaseURL, token)
err = s.emailService.QueueEmail(ctx, adapter.QueueEmailInput{
    TemplateType:   "password_reset",
    RecipientEmail: user.Email,
    RecipientName:  user.Name,
    Subject:        "Redefinir sua senha - Finance Tracker",
    TemplateData: map[string]interface{}{
        "user_name":  user.Name,
        "reset_url":  resetURL,
        "expires_in": "1 hora",
    },
})
if err != nil {
    slog.Error("Failed to queue password reset email", "error", err)
    // Don't fail the request - token is saved, user can retry
}
```

### 4.2 Group Invitation Flow

**File:** `backend/internal/application/usecase/group/invite_member.go`

**After invite is saved (around line 145):**
```go
// Queue invitation email
inviteURL := fmt.Sprintf("%s/groups/join?token=%s", s.config.BaseURL, invite.Token)
err = s.emailService.QueueEmail(ctx, adapter.QueueEmailInput{
    TemplateType:   "group_invitation",
    RecipientEmail: input.Email,
    RecipientName:  "", // We don't know the recipient's name yet
    Subject:        fmt.Sprintf("%s convidou voce para %s - Finance Tracker", inviter.Name, group.Name),
    TemplateData: map[string]interface{}{
        "inviter_name":  inviter.Name,
        "inviter_email": inviter.Email,
        "group_name":    group.Name,
        "invite_url":    inviteURL,
        "expires_in":    "7 dias",
    },
})
if err != nil {
    slog.Error("Failed to queue invitation email", "error", err)
    // Don't fail - invite is saved, we can retry sending
}
```

---

## 5. Resend API Integration

### 5.1 API Configuration

```go
// Location: backend/internal/infra/email/resend_client.go

type ResendConfig struct {
    APIKey   string // RESEND_API_KEY env var
    FromName string // "Finance Tracker"
    FromEmail string // "onboarding@resend.dev" (test) or "noreply@yourdomain.com"
}
```

### 5.2 Resend API Request

```go
// POST https://api.resend.com/emails
{
    "from": "Finance Tracker <onboarding@resend.dev>",
    "to": ["recipient@example.com"],
    "subject": "Redefinir sua senha - Finance Tracker",
    "html": "<html>...</html>",
    "text": "Plain text version..."
}
```

### 5.3 Resend API Response

**Success (200):**
```json
{
    "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

**Error (4xx/5xx):**
```json
{
    "statusCode": 422,
    "message": "Invalid email address",
    "name": "validation_error"
}
```

### 5.4 Error Handling

| Resend Error | Action |
|--------------|--------|
| 401 Unauthorized | Log critical error, don't retry |
| 422 Validation Error | Mark as failed, don't retry |
| 429 Rate Limited | Retry with exponential backoff |
| 500 Server Error | Retry up to max attempts |

---

## 6. Background Worker

### 6.1 Worker Configuration

```go
type WorkerConfig struct {
    PollInterval    time.Duration // How often to check queue (e.g., 5 seconds)
    BatchSize       int           // Emails to process per batch (e.g., 10)
    ShutdownTimeout time.Duration // Graceful shutdown timeout
}
```

### 6.2 Worker Process

```go
func (w *EmailWorker) Process(ctx context.Context) error {
    // 1. Fetch pending emails (status = 'pending', scheduled_at <= now)
    // 2. Mark as 'processing'
    // 3. Render template
    // 4. Send via Resend
    // 5. Mark as 'sent' or increment attempts on failure
    // 6. If attempts >= max_attempts, mark as 'failed'
}
```

### 6.3 Running the Worker

The worker can run:
1. **Same process:** Goroutine in the main API server
2. **Separate process:** Dedicated worker binary (recommended for production)

For Phase 1, run as goroutine in the API server for simplicity.

---

## 7. Environment Variables

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_NAME=Finance Tracker
RESEND_FROM_EMAIL=onboarding@resend.dev

# App Configuration (for email links)
APP_BASE_URL=http://localhost:5173

# Worker Configuration (optional)
EMAIL_WORKER_POLL_INTERVAL=5s
EMAIL_WORKER_BATCH_SIZE=10
```

---

## 8. Monitoring & Logging

### 8.1 Structured Logs

```go
// On queue
slog.Info("Email queued",
    "template", templateType,
    "recipient", recipientEmail,
    "queue_id", queueID,
)

// On send success
slog.Info("Email sent",
    "queue_id", queueID,
    "resend_id", resendID,
    "duration_ms", duration,
)

// On send failure
slog.Error("Email send failed",
    "queue_id", queueID,
    "attempt", attempt,
    "error", err,
)
```

### 8.2 Metrics (Future)

| Metric | Type | Description |
|--------|------|-------------|
| `email_queue_size` | Gauge | Pending emails in queue |
| `email_sent_total` | Counter | Successfully sent emails |
| `email_failed_total` | Counter | Failed emails |
| `email_send_duration_ms` | Histogram | Time to send email |

---

## 9. Testing Strategy

### 9.1 Development Mode

Use Resend's test domain (`onboarding@resend.dev`):
- Only sends to verified emails in your Resend account
- Real API calls but controlled delivery

### 9.2 Test Mode

```go
// Mock email service for tests
type MockEmailService struct {
    QueuedEmails []QueueEmailInput
}

func (m *MockEmailService) QueueEmail(ctx context.Context, input QueueEmailInput) error {
    m.QueuedEmails = append(m.QueuedEmails, input)
    return nil
}
```

### 9.3 E2E Tests

```typescript
// Verify email was queued (check database)
const emailQueue = await queryDatabase(
    `SELECT * FROM email_queue WHERE recipient_email = $1`,
    [testEmail]
);
expect(emailQueue.rows).toHaveLength(1);
expect(emailQueue.rows[0].template_type).toBe('password_reset');
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
