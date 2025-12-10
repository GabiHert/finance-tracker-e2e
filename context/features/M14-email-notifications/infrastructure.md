# Infrastructure: Email Notifications

**Feature Code:** M14-email-notifications
**Last Updated:** 2025-12-06

---

## 1. Overview

### 1.1 Infrastructure Summary
This feature requires:
- Database table for email queue
- Resend SDK integration
- Background worker for queue processing
- HTML email templates

### 1.2 Dependencies
- **Database:** PostgreSQL (existing)
- **External Services:** Resend API
- **Go Packages:** `github.com/resend/resend-go/v2`

---

## 2. Database Migrations

### 2.1 Migration: Create email_queue Table

**File:** `backend/scripts/migrations/000XXX_create_email_queue.up.sql`

```sql
-- Migration: Create email_queue table
-- Feature: M14-email-notifications

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email content
    template_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}',

    -- Processing state
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,

    -- Resend tracking
    resend_id VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT email_queue_valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    CONSTRAINT email_queue_valid_template CHECK (template_type IN ('password_reset', 'group_invitation')),
    CONSTRAINT email_queue_valid_email CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index for worker to find pending jobs efficiently
CREATE INDEX idx_email_queue_pending ON email_queue(scheduled_at)
    WHERE status = 'pending';

-- Index for looking up emails by recipient (debugging, testing)
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient_email, created_at DESC);

-- Index for monitoring failed emails
CREATE INDEX idx_email_queue_failed ON email_queue(created_at DESC)
    WHERE status = 'failed';

-- Comments
COMMENT ON TABLE email_queue IS 'Queue for outgoing email notifications';
COMMENT ON COLUMN email_queue.template_type IS 'Email template identifier (password_reset, group_invitation)';
COMMENT ON COLUMN email_queue.template_data IS 'JSON data for template rendering';
COMMENT ON COLUMN email_queue.status IS 'pending=waiting, processing=sending, sent=delivered, failed=gave up';
COMMENT ON COLUMN email_queue.resend_id IS 'Resend API email ID for tracking';
```

**Down Migration:** `backend/scripts/migrations/000XXX_create_email_queue.down.sql`

```sql
-- Rollback: Drop email_queue table

DROP INDEX IF EXISTS idx_email_queue_failed;
DROP INDEX IF EXISTS idx_email_queue_recipient;
DROP INDEX IF EXISTS idx_email_queue_pending;
DROP TABLE IF EXISTS email_queue;
```

---

## 3. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│                      users                          │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ email                                               │
│ name                                                │
│ email_notifications (bool)                          │
│ goal_alerts (bool)                                  │
│ recurring_reminders (bool)                          │
└─────────────────────────────────────────────────────┘
         │
         │ (referenced in template_data)
         ▼
┌─────────────────────────────────────────────────────┐
│                   email_queue                       │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ template_type                                       │
│ recipient_email                                     │
│ recipient_name                                      │
│ subject                                             │
│ template_data (JSONB)                               │
│ status                                              │
│ attempts                                            │
│ resend_id                                           │
│ created_at                                          │
│ scheduled_at                                        │
│ processed_at                                        │
└─────────────────────────────────────────────────────┘
```

**Note:** email_queue does not have a foreign key to users because:
1. Group invitations go to emails that may not have accounts yet
2. We want to keep email delivery decoupled from user management

---

## 4. Environment Variables

### 4.1 Required Variables

Add to `.env` files:

```bash
# ===========================================
# Email Configuration (Resend)
# ===========================================

# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sender information
RESEND_FROM_NAME=Finance Tracker
RESEND_FROM_EMAIL=onboarding@resend.dev

# For production with custom domain:
# RESEND_FROM_EMAIL=noreply@yourdomain.com

# ===========================================
# App URL (for email links)
# ===========================================

# Frontend URL for password reset and invite links
APP_BASE_URL=http://localhost:5173

# For production:
# APP_BASE_URL=https://financetracker.example.com

# ===========================================
# Email Worker Configuration
# ===========================================

# How often to check for pending emails (default: 5s)
EMAIL_WORKER_POLL_INTERVAL=5s

# Emails to process per batch (default: 10)
EMAIL_WORKER_BATCH_SIZE=10

# Enable/disable email worker (default: true)
EMAIL_WORKER_ENABLED=true
```

### 4.2 Configuration Struct

```go
// Location: backend/internal/infra/config/email.go

package config

import (
    "os"
    "time"
)

type EmailConfig struct {
    ResendAPIKey    string
    FromName        string
    FromEmail       string
    AppBaseURL      string
    WorkerEnabled   bool
    PollInterval    time.Duration
    BatchSize       int
}

func LoadEmailConfig() EmailConfig {
    pollInterval, _ := time.ParseDuration(getEnv("EMAIL_WORKER_POLL_INTERVAL", "5s"))
    batchSize := getEnvInt("EMAIL_WORKER_BATCH_SIZE", 10)

    return EmailConfig{
        ResendAPIKey:  os.Getenv("RESEND_API_KEY"),
        FromName:      getEnv("RESEND_FROM_NAME", "Finance Tracker"),
        FromEmail:     getEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
        AppBaseURL:    getEnv("APP_BASE_URL", "http://localhost:5173"),
        WorkerEnabled: getEnv("EMAIL_WORKER_ENABLED", "true") == "true",
        PollInterval:  pollInterval,
        BatchSize:     batchSize,
    }
}
```

---

## 5. Go Dependencies

### 5.1 Install Resend SDK

```bash
cd backend
go get github.com/resend/resend-go/v2
```

### 5.2 Update go.mod

```go
require (
    // ... existing dependencies
    github.com/resend/resend-go/v2 v2.6.0
)
```

---

## 6. File Structure

```
backend/
├── internal/
│   ├── application/
│   │   └── adapter/
│   │       ├── email_service.go          # Email service interface
│   │       └── email_queue_repository.go # Queue repository interface
│   │
│   ├── domain/
│   │   ├── entity/
│   │   │   └── email_job.go              # EmailJob entity
│   │   └── errors/
│   │       └── email_errors.go           # Email-specific errors
│   │
│   ├── infra/
│   │   ├── config/
│   │   │   └── email.go                  # Email configuration
│   │   │
│   │   └── email/
│   │       ├── service.go                # Email service implementation
│   │       ├── worker.go                 # Background queue worker
│   │       ├── resend_client.go          # Resend API client
│   │       └── templates/
│   │           ├── renderer.go           # Template rendering
│   │           ├── base.html             # Base HTML template
│   │           ├── password_reset.html   # Password reset template
│   │           ├── password_reset.txt    # Password reset plain text
│   │           ├── group_invitation.html # Group invite template
│   │           └── group_invitation.txt  # Group invite plain text
│   │
│   └── integration/
│       └── persistence/
│           ├── model/
│           │   └── email_queue.go        # GORM model
│           └── email_queue_repository.go # Repository implementation
│
├── scripts/
│   └── migrations/
│       ├── 000XXX_create_email_queue.up.sql
│       └── 000XXX_create_email_queue.down.sql
│
└── test/
    ├── mocks/
    │   └── email_sender.go               # Mock for testing
    └── integration/
        └── features/
            └── email_notifications.feature
```

---

## 7. Dependency Injection

### 7.1 Update Injector

**File:** `backend/internal/infra/dependency/injector.go`

Add email components to the dependency injector:

```go
// In the Injector struct, add:
type Injector struct {
    // ... existing fields
    EmailService    *email.Service
    EmailWorker     *email.Worker
}

// In the NewInjector function, add:
func NewInjector(db *gorm.DB, cfg *config.Config) *Injector {
    // ... existing initialization

    // Email infrastructure
    emailQueueRepo := persistence.NewEmailQueueRepository(db)
    resendClient := email.NewResendClient(
        cfg.Email.ResendAPIKey,
        cfg.Email.FromName,
        cfg.Email.FromEmail,
    )
    templateRenderer, err := templates.NewTemplateRenderer()
    if err != nil {
        panic("failed to initialize email templates: " + err.Error())
    }

    emailService := email.NewService(emailQueueRepo, resendClient, templateRenderer)
    emailWorker := email.NewWorker(emailQueueRepo, resendClient, templateRenderer)

    // Inject email service into use cases that need it
    forgotPasswordUseCase := auth.NewForgotPasswordUseCase(
        userRepo,
        emailService,  // Add this parameter
        cfg.Email.AppBaseURL,
    )
    inviteMemberUseCase := group.NewInviteMemberUseCase(
        groupRepo,
        userRepo,
        inviteRepo,
        emailService,  // Add this parameter
        cfg.Email.AppBaseURL,
    )

    return &Injector{
        // ... existing fields
        EmailService: emailService,
        EmailWorker:  emailWorker,
    }
}
```

---

## 8. Start Worker with Server

### 8.1 Update Main

**File:** `backend/cmd/api/main.go`

```go
func main() {
    // ... existing initialization

    // Start email worker in background
    if cfg.Email.WorkerEnabled {
        go injector.EmailWorker.Start(ctx)
    }

    // ... start HTTP server
}
```

---

## 9. Resend Setup Guide

### 9.1 Create Resend Account

1. Go to https://resend.com
2. Sign up (free, no credit card required)
3. Verify your email

### 9.2 Get API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "Finance Tracker Development"
4. Copy the key (starts with `re_`)

### 9.3 Test Domain Limitations

Using `onboarding@resend.dev`:
- Can only send to emails verified in your Resend account
- Add test emails at https://resend.com/audiences

### 9.4 Production Domain Setup (Future)

1. Add your domain at https://resend.com/domains
2. Add DNS records (DKIM, SPF, DMARC)
3. Wait for verification
4. Update `RESEND_FROM_EMAIL` to use your domain

---

## 10. Monitoring

### 10.1 Queue Health Check

```sql
-- Pending emails count
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';

-- Failed emails (last 24h)
SELECT * FROM email_queue
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Processing time stats
SELECT
    template_type,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
    MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
FROM email_queue
WHERE status = 'sent'
GROUP BY template_type;
```

### 10.2 Resend Dashboard

Monitor delivery at https://resend.com/emails:
- Delivery status
- Open/click rates (if tracking enabled)
- Bounce reports

---

## 11. Deployment Checklist

### 11.1 Pre-Deployment

- [ ] Resend account created
- [ ] API key obtained and added to secrets
- [ ] Migration tested locally
- [ ] Email templates tested with real emails
- [ ] Worker tested with queue

### 11.2 Deployment Steps

1. Add environment variables to production
2. Run database migration
3. Deploy backend with email worker
4. Send test email to verify

### 11.3 Post-Deployment

- [ ] Verify emails are being queued
- [ ] Verify worker is processing queue
- [ ] Check Resend dashboard for deliveries
- [ ] Monitor for failed emails

---

## 12. Backup & Recovery

### 12.1 Email Queue Data

- **Retention:** Keep sent emails for 30 days
- **Failed emails:** Keep for 90 days for debugging
- **Cleanup query:**
  ```sql
  DELETE FROM email_queue
  WHERE status = 'sent'
  AND processed_at < NOW() - INTERVAL '30 days';
  ```

### 12.2 Recovery

If emails fail to send:
1. Check `last_error` for details
2. Fix the issue (API key, templates, etc.)
3. Reset failed emails to pending:
   ```sql
   UPDATE email_queue
   SET status = 'pending', attempts = 0, scheduled_at = NOW()
   WHERE status = 'failed'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
