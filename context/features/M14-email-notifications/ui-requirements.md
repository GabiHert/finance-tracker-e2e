# UI Requirements: Email Notifications

**Feature Code:** M14-email-notifications
**Last Updated:** 2025-12-06

---

## 1. Overview

### 1.1 Feature Purpose
Define professional HTML email templates for password reset and group invitation emails. These templates should match the Finance Tracker brand and provide clear calls-to-action.

### 1.2 Email Types (Phase 1)

| Email | Subject | Purpose |
|-------|---------|---------|
| Password Reset | "Redefinir sua senha - Finance Tracker" | Send reset link |
| Group Invitation | "{InviterName} convidou voce para {GroupName}" | Send invite link |

---

## 2. Email Template Specifications

### 2.1 Password Reset Email

#### Subject Line
```
Redefinir sua senha - Finance Tracker
```

#### Content Structure
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Finance Tracker                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Ola, {userName}                                    │
│                                                     │
│  Recebemos uma solicitacao para redefinir a senha   │
│  da sua conta no Finance Tracker.                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         [Redefinir Senha]                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Este link expira em 1 hora.                        │
│                                                     │
│  Se voce nao solicitou esta alteracao, ignore       │
│  este email. Sua senha permanecera a mesma.         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Finance Tracker - Controle suas financas           │
│  Este email foi enviado automaticamente.            │
└─────────────────────────────────────────────────────┘
```

#### Design Tokens

| Element | Style |
|---------|-------|
| Background | #F3F4F6 (gray-100) |
| Card Background | #FFFFFF |
| Primary Button | #3B82F6 (blue-500) |
| Button Text | #FFFFFF |
| Heading | #111827 (gray-900), 24px, bold |
| Body Text | #374151 (gray-700), 16px |
| Secondary Text | #6B7280 (gray-500), 14px |
| Footer | #9CA3AF (gray-400), 12px |

#### Button Specs
- Background: #3B82F6
- Text: White, 16px, bold
- Padding: 16px 32px
- Border Radius: 8px
- Link: `{baseUrl}/reset-password?token={token}`

### 2.2 Group Invitation Email

#### Subject Line
```
{inviterName} convidou voce para {groupName} - Finance Tracker
```

#### Content Structure
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Finance Tracker                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Voce foi convidado!                                │
│                                                     │
│  {inviterName} ({inviterEmail}) convidou voce       │
│  para participar do grupo "{groupName}" no          │
│  Finance Tracker.                                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         [Aceitar Convite]                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Este convite expira em 7 dias.                     │
│                                                     │
│  Se voce nao conhece {inviterName}, pode ignorar    │
│  este email com seguranca.                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Finance Tracker - Controle suas financas           │
│  Este email foi enviado automaticamente.            │
└─────────────────────────────────────────────────────┘
```

#### Button Specs
- Background: #10B981 (green-500)
- Text: White, 16px, bold
- Padding: 16px 32px
- Border Radius: 8px
- Link: `{baseUrl}/groups/join?token={inviteToken}`

---

## 3. HTML Template Structure

### 3.1 Base Template

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{.Subject}}</title>
  <style>
    /* Inline styles for email client compatibility */
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: #3B82F6; padding: 24px; text-align: center;">
              <span style="color: white; font-size: 24px; font-weight: bold;">Finance Tracker</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              {{.Content}}
            </td>
          </tr>
          <tr>
            <td style="background: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                Finance Tracker - Controle suas financas<br>
                Este email foi enviado automaticamente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 3.2 Button Component

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
  <tr>
    <td style="background: {{.ButtonColor}}; border-radius: 8px;">
      <a href="{{.ButtonUrl}}" style="display: inline-block; padding: 16px 32px; color: white; text-decoration: none; font-weight: bold; font-size: 16px;">
        {{.ButtonText}}
      </a>
    </td>
  </tr>
</table>
```

---

## 4. Responsive Considerations

### Email Client Compatibility

| Client | Support Level |
|--------|---------------|
| Gmail (Web) | Full |
| Gmail (App) | Full |
| Apple Mail | Full |
| Outlook (Web) | Full |
| Outlook (Desktop) | Partial (table-based layout required) |

### Mobile Optimization
- Max width: 600px (standard for email)
- Button min-width: 200px for touch targets
- Font size: 16px minimum for body text
- Padding: 20px on mobile, 40px on desktop

---

## 5. Localization

### Language
All emails in Brazilian Portuguese (pt-BR) to match the app.

### Date/Time Format
- Expiration: "Este link expira em X hora(s)"
- Use relative time when possible

---

## 6. Plain Text Fallback

### Password Reset (Plain Text)
```
Finance Tracker - Redefinir Senha

Ola, {userName}

Recebemos uma solicitacao para redefinir a senha da sua conta.

Para redefinir sua senha, acesse o link abaixo:
{resetUrl}

Este link expira em 1 hora.

Se voce nao solicitou esta alteracao, ignore este email.

--
Finance Tracker
```

### Group Invitation (Plain Text)
```
Finance Tracker - Convite para Grupo

Voce foi convidado!

{inviterName} ({inviterEmail}) convidou voce para participar do grupo "{groupName}".

Para aceitar o convite, acesse:
{inviteUrl}

Este convite expira em 7 dias.

--
Finance Tracker
```

---

## 7. Error States

### Invalid/Expired Token Page

When user clicks an expired link, show a page with:
- Heading: "Link expirado"
- Message: "Este link nao e mais valido. Solicite um novo."
- CTA: Button to request new link

---

## Related Documentation

- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
