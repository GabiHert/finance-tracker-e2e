# M6: Category Rules Engine - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M6 - Category Rules Engine |
| **Screens Covered** | RulesScreen, RuleModal, PatternHelper |
| **Priority** | High |
| **Test Files** | `e2e/tests/m6-rules/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Rules Screen (`RulesScreen.tsx`)

**Location:** `frontend/src/main/features/rules/RulesScreen.tsx`

**Components:**
- Page header with "Regras" title
- "Nova Regra" button
- Rules list with drag-and-drop ordering
- Rule cards showing pattern, category, priority
- Edit and delete buttons per rule
- Empty state for no rules
- Priority indicators

**Features:**
- Pattern-based rule creation
- Multiple match types (Contains, Starts With, Exact, Custom Regex)
- Pattern testing against existing transactions
- Drag-and-drop priority reordering
- CRUD operations for rules
- Regex preview display

---

## E2E Test Scenarios

### Rules Management Tests (`rules.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M6-E2E-001 | Display rules screen with navigation | Tests screen load and button | Implemented |
| M6-E2E-002 | Open rule creation modal with pattern helper | Tests modal and form elements | Implemented |
| M6-E2E-003 | Create rule with "Contains" match type | Tests contains pattern and regex preview | Implemented |
| M6-E2E-004 | Create rule with "Starts with" match type | Tests starts with pattern | Implemented |
| M6-E2E-005 | Create rule with "Exact" match type | Tests exact match pattern | Implemented |
| M6-E2E-006 | Test pattern against existing transactions | Tests pattern tester | Implemented |
| M6-E2E-007 | Edit an existing rule | Tests edit flow and update | Implemented |
| M6-E2E-008 | Delete a rule | Tests delete with confirmation | Implemented |
| M6-E2E-009 | Display drag handles for priority reordering | Tests drag handles visibility | Implemented |
| M6-E2E-010 | Reorder rules by drag and drop | Tests drag-drop functionality | Implemented |
| M6-E2E-011 | Show priority indicators on rules | Tests priority display | Implemented |
| M6-E2E-012 | Navigate to rules from sidebar/menu | Tests navigation | Implemented |
| M6-E2E-013 | Display empty state when no rules exist | Tests empty state | Implemented |
| M6-E2E-014 | Validate pattern input | Tests required validation | Implemented |
| M6-E2E-015 | Cancel rule creation | Tests cancel button | Implemented |
| M6-E2E-016 | Support custom regex match type | Tests custom regex | Implemented |

### Rule Priority Tests (`rule-priority-conflicts.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M6-E2E-08a | Create multiple rules with overlapping patterns | Tests rule conflict setup | Implemented |
| M6-E2E-08b | Display priority order for rules | Tests priority indicators | Implemented |
| M6-E2E-08c | Allow reordering rules via drag and drop | Tests drag-drop | Implemented |
| M6-E2E-08d | Higher priority rule should be listed first | Tests order verification | Implemented |
| M6-E2E-08e | Maintain priority after page refresh | Tests persistence | Implemented |
| M6-E2E-08f | Priority reordering should update priority numbers | Tests number updates | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| Rule CRUD | 4 | 6 | 150% |
| Pattern Types | 3 | 4 | 133% |
| Pattern Testing | 2 | 1 | 50% |
| Priority Management | 3 | 6 | 200% |
| Navigation | 1 | 2 | 200% |
| **Total** | **13** | **22** | **169%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Rules list | Yes | With drag handles |
| Rule creation modal | Yes | All form elements |
| Match type selector | Yes | All 4 types |
| Pattern input | Yes | Validation tested |
| Regex preview | Yes | Dynamic display |
| Category selector | Yes | In modal |
| Drag handles | Yes | For reordering |
| Priority indicators | Yes | Numbers/position |
| Delete confirmation | Yes | Dialog tested |
| Pattern tester | Yes | Match results |

---

## Missing Test Scenarios

### 1. Rule Auto-Application on Import (High Priority)
**Description:** Rules should auto-categorize transactions during import.

```gherkin
Scenario: Auto-categorize imported transactions using rules
  Given I have a rule matching "UBER" to "Transport"
  When I import transactions containing "UBER TRIP"
  Then the transaction should be pre-categorized as "Transport"
```

### 2. Rule Application on Manual Entry (High Priority)
**Description:** Rules should suggest categories when creating transactions.

```gherkin
Scenario: Suggest category when creating transaction
  Given I have a rule matching "NETFLIX" to "Entertainment"
  When I create a transaction with description "NETFLIX SUBSCRIPTION"
  Then the category should be auto-selected as "Entertainment"
```

### 3. Conflicting Rules Priority (Medium Priority)
**Description:** Higher priority rule wins when multiple rules match.

```gherkin
Scenario: Higher priority rule wins
  Given I have rule 1 (priority 1) matching "UBER" to "Transport"
  And I have rule 2 (priority 2) matching "UBER EATS" to "Food"
  When I categorize transaction "UBER EATS ORDER"
  Then rule 2 should win because it's more specific
```

### 4. Case Sensitivity (Medium Priority)
**Description:** Test case-insensitive matching.

```gherkin
Scenario: Case-insensitive pattern matching
  Given I have a rule matching "uber" to "Transport"
  When I create transaction with description "UBER TRIP"
  Then it should match the rule (case-insensitive)
```

### 5. Special Characters in Pattern (Low Priority)
**Description:** Handle special regex characters in patterns.

```gherkin
Scenario: Pattern with special characters
  Given I create a rule with pattern "R$100.00"
  Then the regex should properly escape special characters
  And it should match "R$100.00" literally
```

### 6. Bulk Apply Rules (Low Priority)
**Description:** Apply rules to existing uncategorized transactions.

```gherkin
Scenario: Apply rules to existing transactions
  Given I have uncategorized transactions
  And I have matching rules
  When I click "Apply Rules" button
  Then matching transactions should be categorized
```

### 7. Rule Validation - Duplicate Pattern (Low Priority)
**Description:** Warn when creating duplicate patterns.

```gherkin
Scenario: Warn on duplicate pattern
  Given I have a rule with pattern "UBER"
  When I try to create another rule with pattern "UBER"
  Then I should see a warning about duplicate pattern
```

---

## Recommendations

1. **Integration Testing:** Add tests for rules applied during import and manual entry.

2. **Edge Cases:** Test special characters, empty patterns, very long patterns.

3. **Performance:** Test with many rules to verify priority ordering performance.

4. **Conflict Resolution:** Document and test rule priority conflict resolution.

5. **Bulk Operations:** Add ability to apply rules to existing transactions.

6. **Rule Templates:** Consider adding common rule templates.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
