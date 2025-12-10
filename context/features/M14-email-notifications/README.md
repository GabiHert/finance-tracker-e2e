# Feature: Email Notifications with Resend

**Code:** M14-email-notifications
**Milestone:** M14
**Status:** Specification Complete

## Overview

Integrate Resend email service to send real emails for critical user flows. Phase 1 focuses on essential notifications: password reset and group invitations. The system uses a background queue for async email processing with professional HTML templates.

## User Stories

- As a user, I want to receive a password reset email so that I can recover my account
- As a user, I want to receive an email invitation when added to a group so that I can join shared finances
- As a system admin, I want emails to be processed asynchronously so that API responses remain fast

## Dependencies

- **Requires:**
  - M2-auth (user authentication, password reset flow)
  - M9-groups (group invitation system)
- **Enables:**
  - Future: Goal alerts, Weekly reports, Transaction alerts

## Phase 1 Scope (Essential Only)

| Email Type | Trigger | Priority |
|------------|---------|----------|
| Password Reset | User requests password reset | Critical |
| Group Invitation | User invites member to group | Critical |

## Future Phases

| Phase | Email Types |
|-------|-------------|
| Phase 2 | Goal exceeded/warning alerts |
| Phase 3 | Welcome email, Weekly reports |
| Phase 4 | Transaction alerts, Recurring reminders |

## Technical Decisions

- **Email Provider:** Resend (3,000 emails/month free)
- **Domain:** Test domain (onboarding@resend.dev) for development
- **Architecture:** Background queue for async processing
- **Templates:** HTML with professional styling

## Specification Files

| File | Description |
|------|-------------|
| [ui-requirements.md](./ui-requirements.md) | Email template designs |
| [integration.md](./integration.md) | API contracts & queue system |
| [backend-tdd.md](./backend-tdd.md) | Backend implementation specs |
| [infrastructure.md](./infrastructure.md) | Database migrations & Resend setup |
| [e2e-scenarios.md](./e2e-scenarios.md) | End-to-end test scenarios |

## Quick Links

- **Backend Code:** `backend/internal/infra/email/`
- **Email Templates:** `backend/internal/infra/email/templates/`
- **Queue Worker:** `backend/internal/infra/queue/`
- **E2E Tests:** `e2e/tests/M14-email-notifications/`
- **Task File:** `tasks/todo/TASK-M14-Email-Notifications.md`

## Implementation Checklist

- [ ] Infrastructure: Resend SDK integration
- [ ] Infrastructure: Email queue table migration
- [ ] Backend: Email service adapter
- [ ] Backend: Queue worker for async processing
- [ ] Backend: HTML email templates
- [ ] Backend: Password reset email sending
- [ ] Backend: Group invitation email sending
- [ ] E2E: Email delivery verification tests
- [ ] Ready for production
