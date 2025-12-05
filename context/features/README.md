# Feature Specifications

This directory contains detailed TDD specifications for each feature, organized by feature code.

## Structure

```
features/
├── {feature-code}/
│   ├── README.md              # Feature overview & links
│   ├── ui-requirements.md     # Frontend UI specifications
│   ├── integration.md         # Frontend-Backend API contracts
│   ├── backend-tdd.md         # Backend BDD scenarios & implementation
│   ├── infrastructure.md      # Database migrations & infrastructure
│   └── e2e-scenarios.md       # End-to-end test scenarios
└── README.md                  # This file
```

## Feature Code Convention

Feature codes follow the pattern: `M{milestone}-{name}`

Examples:
- `M2-auth` - Authentication (Milestone 2)
- `M6-rules` - Category Rules Engine (Milestone 6)
- `M7-goals` - Spending Limits/Goals (Milestone 7)
- `M12-recurring` - Recurring Transactions (new feature)

## Creating New Features

Use the slash command:

```
/create-feature {description of the feature}
```

This will:
1. Analyze the description and ask clarifying questions
2. Determine the appropriate feature code
3. Generate all specification files
4. Create a comprehensive, implementation-ready specification

## File Generation Order

Specifications are generated in this order (each builds on the previous):

1. **UI Requirements** - What the user sees and does
2. **Integration** - How frontend and backend communicate (uses UI as reference)
3. **Backend TDD** - How to implement the backend (uses integration as reference)
4. **Infrastructure** - Database migrations, schema, indexes (uses backend TDD as reference)
5. **E2E Scenarios** - How to test everything works together (uses all as reference)

## Relationship to Project Guides

The original project-wide guides remain in `context/`:

- `Finance-Tracker-Frontend-UI-Requirements-v3.md` - Full UI specs
- `finance-tracker-backend-tdd-v6.md` - Full backend specs
- `Finance-Tracker-Integration-TDD-v1.md` - Full integration specs
- `Finance-Tracker-E2E-Testing-Guide-v1.md` - E2E test patterns

Feature-specific files extract and expand on relevant sections from these guides.

## Implementation Workflow

1. **Create Feature Spec:** `/create-feature {description}`
2. **Review:** Check all generated files for completeness
3. **Implement:** `/implement-feature {feature-code}` (coming soon)
4. **Verify:** `/fix-e2e` to ensure all tests pass

## Current Features

| Code | Name | Status |
|------|------|--------|
| M12-cc-import | Credit Card Statement Import | Specification Complete |

*Features will be listed here as they are created.*
