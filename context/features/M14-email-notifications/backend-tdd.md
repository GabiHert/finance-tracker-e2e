# Backend TDD: Email Notifications

**Feature Code:** M14-email-notifications
**Last Updated:** 2025-12-06

---

## 1. Overview

### 1.1 Domain Description
The email notification system provides reliable, asynchronous email delivery for critical user flows. It uses a database-backed queue with retry logic and integrates with Resend for email delivery.

### 1.2 Bounded Context
- **Email Queue:** Stores pending emails with metadata
- **Email Worker:** Processes queue and sends via Resend
- **Email Templates:** Renders HTML/text content
- **Email Service:** Adapter for queueing and sending

---

## 2. Database Schema

### 2.1 Table: email_queue

```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email content
    template_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    template_data JSONB NOT NULL,

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
    CONSTRAINT email_queue_valid_template CHECK (template_type IN ('password_reset', 'group_invitation'))
);

CREATE INDEX idx_email_queue_pending ON email_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_recipient ON email_queue(recipient_email);
```

---

## 3. Domain Entities

### 3.1 EmailJob Entity

```go
// Location: backend/internal/domain/entity/email_job.go

package entity

import (
    "encoding/json"
    "time"

    "github.com/google/uuid"
)

type EmailStatus string

const (
    EmailStatusPending    EmailStatus = "pending"
    EmailStatusProcessing EmailStatus = "processing"
    EmailStatusSent       EmailStatus = "sent"
    EmailStatusFailed     EmailStatus = "failed"
)

type EmailTemplateType string

const (
    TemplatePasswordReset    EmailTemplateType = "password_reset"
    TemplateGroupInvitation  EmailTemplateType = "group_invitation"
)

type EmailJob struct {
    ID             uuid.UUID
    TemplateType   EmailTemplateType
    RecipientEmail string
    RecipientName  string
    Subject        string
    TemplateData   map[string]interface{}
    Status         EmailStatus
    Attempts       int
    MaxAttempts    int
    LastError      string
    ResendID       string
    CreatedAt      time.Time
    ScheduledAt    time.Time
    ProcessedAt    *time.Time
}

func NewEmailJob(templateType EmailTemplateType, recipientEmail, recipientName, subject string, data map[string]interface{}) *EmailJob {
    return &EmailJob{
        ID:             uuid.New(),
        TemplateType:   templateType,
        RecipientEmail: recipientEmail,
        RecipientName:  recipientName,
        Subject:        subject,
        TemplateData:   data,
        Status:         EmailStatusPending,
        Attempts:       0,
        MaxAttempts:    3,
        CreatedAt:      time.Now(),
        ScheduledAt:    time.Now(),
    }
}

func (e *EmailJob) MarkProcessing() {
    e.Status = EmailStatusProcessing
}

func (e *EmailJob) MarkSent(resendID string) {
    e.Status = EmailStatusSent
    e.ResendID = resendID
    now := time.Now()
    e.ProcessedAt = &now
}

func (e *EmailJob) MarkFailed(err error) {
    e.Attempts++
    e.LastError = err.Error()
    if e.Attempts >= e.MaxAttempts {
        e.Status = EmailStatusFailed
    } else {
        e.Status = EmailStatusPending
        e.ScheduledAt = e.calculateNextRetry()
    }
}

func (e *EmailJob) calculateNextRetry() time.Time {
    delays := []time.Duration{0, 1 * time.Minute, 5 * time.Minute}
    if e.Attempts < len(delays) {
        return time.Now().Add(delays[e.Attempts])
    }
    return time.Now().Add(5 * time.Minute)
}
```

---

## 4. Repository Interface

```go
// Location: backend/internal/application/adapter/email_queue_repository.go

package adapter

import (
    "context"

    "github.com/google/uuid"
    "finance-tracker/internal/domain/entity"
)

type EmailQueueRepository interface {
    // Create adds a new email job to the queue
    Create(ctx context.Context, job *entity.EmailJob) error

    // GetPendingJobs retrieves jobs ready to be processed
    GetPendingJobs(ctx context.Context, limit int) ([]*entity.EmailJob, error)

    // Update saves changes to an email job
    Update(ctx context.Context, job *entity.EmailJob) error

    // GetByID retrieves a specific job
    GetByID(ctx context.Context, id uuid.UUID) (*entity.EmailJob, error)

    // GetByRecipient retrieves jobs for a specific email (for testing)
    GetByRecipient(ctx context.Context, email string) ([]*entity.EmailJob, error)
}
```

---

## 5. Email Service

### 5.1 Service Interface

```go
// Location: backend/internal/application/adapter/email_service.go

package adapter

import "context"

type EmailSender interface {
    // Send sends an email immediately via Resend
    Send(ctx context.Context, input SendEmailInput) (*SendEmailResult, error)
}

type SendEmailInput struct {
    To      string
    Subject string
    Html    string
    Text    string
}

type SendEmailResult struct {
    ResendID string
}
```

### 5.2 Email Service Implementation

```go
// Location: backend/internal/infra/email/service.go

package email

import (
    "context"

    "finance-tracker/internal/application/adapter"
    "finance-tracker/internal/domain/entity"
)

type Service struct {
    queue    adapter.EmailQueueRepository
    sender   adapter.EmailSender
    renderer *TemplateRenderer
}

func NewService(queue adapter.EmailQueueRepository, sender adapter.EmailSender, renderer *TemplateRenderer) *Service {
    return &Service{
        queue:    queue,
        sender:   sender,
        renderer: renderer,
    }
}

func (s *Service) QueueEmail(ctx context.Context, input QueueEmailInput) error {
    job := entity.NewEmailJob(
        entity.EmailTemplateType(input.TemplateType),
        input.RecipientEmail,
        input.RecipientName,
        input.Subject,
        input.TemplateData,
    )
    return s.queue.Create(ctx, job)
}

type QueueEmailInput struct {
    TemplateType   string
    RecipientEmail string
    RecipientName  string
    Subject        string
    TemplateData   map[string]interface{}
}
```

---

## 6. Template Renderer

```go
// Location: backend/internal/infra/email/templates/renderer.go

package templates

import (
    "bytes"
    "embed"
    "html/template"
)

//go:embed *.html
var templateFS embed.FS

type TemplateRenderer struct {
    templates *template.Template
}

func NewTemplateRenderer() (*TemplateRenderer, error) {
    tmpl, err := template.ParseFS(templateFS, "*.html")
    if err != nil {
        return nil, err
    }
    return &TemplateRenderer{templates: tmpl}, nil
}

func (r *TemplateRenderer) Render(templateName string, data interface{}) (html string, text string, err error) {
    var htmlBuf bytes.Buffer
    if err := r.templates.ExecuteTemplate(&htmlBuf, templateName+".html", data); err != nil {
        return "", "", err
    }

    // Generate plain text from template (simplified)
    var textBuf bytes.Buffer
    if err := r.templates.ExecuteTemplate(&textBuf, templateName+".txt", data); err != nil {
        // Fall back to HTML if no text template
        return htmlBuf.String(), "", nil
    }

    return htmlBuf.String(), textBuf.String(), nil
}
```

---

## 7. Background Worker

```go
// Location: backend/internal/infra/email/worker.go

package email

import (
    "context"
    "log/slog"
    "time"

    "finance-tracker/internal/application/adapter"
)

type Worker struct {
    queue        adapter.EmailQueueRepository
    sender       adapter.EmailSender
    renderer     *TemplateRenderer
    pollInterval time.Duration
    batchSize    int
}

func NewWorker(queue adapter.EmailQueueRepository, sender adapter.EmailSender, renderer *TemplateRenderer) *Worker {
    return &Worker{
        queue:        queue,
        sender:       sender,
        renderer:     renderer,
        pollInterval: 5 * time.Second,
        batchSize:    10,
    }
}

func (w *Worker) Start(ctx context.Context) {
    slog.Info("Email worker started", "poll_interval", w.pollInterval)

    ticker := time.NewTicker(w.pollInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            slog.Info("Email worker shutting down")
            return
        case <-ticker.C:
            w.processBatch(ctx)
        }
    }
}

func (w *Worker) processBatch(ctx context.Context) {
    jobs, err := w.queue.GetPendingJobs(ctx, w.batchSize)
    if err != nil {
        slog.Error("Failed to get pending jobs", "error", err)
        return
    }

    for _, job := range jobs {
        w.processJob(ctx, job)
    }
}

func (w *Worker) processJob(ctx context.Context, job *entity.EmailJob) {
    job.MarkProcessing()
    if err := w.queue.Update(ctx, job); err != nil {
        slog.Error("Failed to mark job processing", "job_id", job.ID, "error", err)
        return
    }

    // Render template
    html, text, err := w.renderer.Render(string(job.TemplateType), job.TemplateData)
    if err != nil {
        job.MarkFailed(err)
        w.queue.Update(ctx, job)
        return
    }

    // Send email
    result, err := w.sender.Send(ctx, adapter.SendEmailInput{
        To:      job.RecipientEmail,
        Subject: job.Subject,
        Html:    html,
        Text:    text,
    })

    if err != nil {
        slog.Error("Failed to send email", "job_id", job.ID, "error", err)
        job.MarkFailed(err)
    } else {
        slog.Info("Email sent", "job_id", job.ID, "resend_id", result.ResendID)
        job.MarkSent(result.ResendID)
    }

    w.queue.Update(ctx, job)
}
```

---

## 8. BDD Scenarios

### 8.1 Feature: Queue Password Reset Email

```gherkin
Feature: Queue Password Reset Email

  Background:
    Given a user exists with email "user@example.com" and name "Test User"

  Scenario: Successfully queue password reset email
    When the user requests a password reset
    Then an email job should be queued with:
      | template_type | password_reset |
      | recipient     | user@example.com |
      | status        | pending |
    And the template data should contain:
      | user_name  | Test User |
      | reset_url  | contains /reset-password?token= |
      | expires_in | 1 hora |

  Scenario: Email is processed by worker
    Given a pending password reset email job exists
    When the email worker processes the job
    Then the email should be sent via Resend
    And the job status should be "sent"
    And the resend_id should be recorded
```

### 8.2 Feature: Queue Group Invitation Email

```gherkin
Feature: Queue Group Invitation Email

  Background:
    Given a user "inviter@example.com" named "Inviter Name"
    And a group "Family Budget" exists

  Scenario: Successfully queue invitation email
    When the inviter invites "newmember@example.com" to the group
    Then an email job should be queued with:
      | template_type | group_invitation |
      | recipient     | newmember@example.com |
      | subject       | contains "Inviter Name convidou voce" |
    And the template data should contain:
      | inviter_name  | Inviter Name |
      | inviter_email | inviter@example.com |
      | group_name    | Family Budget |
      | invite_url    | contains /groups/join?token= |

  Scenario: Invitation email is processed
    Given a pending group invitation email job exists
    When the email worker processes the job
    Then the email should be sent via Resend
    And the job status should be "sent"
```

### 8.3 Feature: Email Retry on Failure

```gherkin
Feature: Email Retry on Failure

  Scenario: Email is retried after temporary failure
    Given a pending email job exists
    And Resend API returns a temporary error
    When the worker processes the job
    Then the job status should be "pending"
    And the attempts count should be 1
    And scheduled_at should be in the future

  Scenario: Email marked as failed after max retries
    Given an email job with 2 failed attempts
    And Resend API returns an error
    When the worker processes the job
    Then the job status should be "failed"
    And the last_error should contain the error message

  Scenario: Permanent errors are not retried
    Given a pending email job exists
    And Resend API returns a validation error (422)
    When the worker processes the job
    Then the job status should be "failed"
    And no retry should be scheduled
```

---

## 9. Resend Client

```go
// Location: backend/internal/infra/email/resend_client.go

package email

import (
    "context"

    "github.com/resend/resend-go/v2"
    "finance-tracker/internal/application/adapter"
)

type ResendClient struct {
    client    *resend.Client
    fromName  string
    fromEmail string
}

func NewResendClient(apiKey, fromName, fromEmail string) *ResendClient {
    return &ResendClient{
        client:    resend.NewClient(apiKey),
        fromName:  fromName,
        fromEmail: fromEmail,
    }
}

func (c *ResendClient) Send(ctx context.Context, input adapter.SendEmailInput) (*adapter.SendEmailResult, error) {
    from := c.fromName + " <" + c.fromEmail + ">"

    resp, err := c.client.Emails.Send(&resend.SendEmailRequest{
        From:    from,
        To:      []string{input.To},
        Subject: input.Subject,
        Html:    input.Html,
        Text:    input.Text,
    })

    if err != nil {
        return nil, err
    }

    return &adapter.SendEmailResult{
        ResendID: resp.Id,
    }, nil
}
```

---

## 10. Error Handling

```go
// Location: backend/internal/domain/errors/email_errors.go

package errors

import "errors"

var (
    ErrEmailQueueFailed    = errors.New("failed to queue email")
    ErrEmailSendFailed     = errors.New("failed to send email")
    ErrInvalidTemplate     = errors.New("invalid email template")
    ErrTemplateRenderFailed = errors.New("failed to render email template")
)
```

---

## 11. Testing

### 11.1 BDD Feature File Location
```
backend/test/integration/features/email_notifications.feature
```

### 11.2 Mock Email Sender
```go
// Location: backend/test/mocks/email_sender.go

type MockEmailSender struct {
    SentEmails []adapter.SendEmailInput
    ShouldFail bool
    FailError  error
}

func (m *MockEmailSender) Send(ctx context.Context, input adapter.SendEmailInput) (*adapter.SendEmailResult, error) {
    if m.ShouldFail {
        return nil, m.FailError
    }
    m.SentEmails = append(m.SentEmails, input)
    return &adapter.SendEmailResult{ResendID: "mock-" + uuid.New().String()}, nil
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
