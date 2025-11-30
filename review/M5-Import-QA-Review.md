# M5: Transaction Import - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M5 - CSV/OFX Import |
| **Screens Covered** | ImportWizard, FileDropZone, ColumnMapping |
| **Priority** | High |
| **Test Files** | `e2e/tests/m5-import/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Import Wizard (`ImportWizard.tsx`)

**Location:** `frontend/src/main/features/import/ImportWizard.tsx`

**Components:**
- Step indicator (Step 1: Upload, Step 2: Categorize & Confirm)
- Bank format selector dropdown
- File drop zone with drag-and-drop
- Column mapping UI (for custom format)
- Preview table with parsed transactions
- Duplicate detection indicators
- "Ignore duplicates" checkbox
- Category selector for each transaction
- Import confirmation button
- Cancel button

**Features:**
- Multi-step wizard flow
- Bank format auto-detection
- Custom column mapping
- CSV/OFX file parsing
- Duplicate transaction detection
- Per-transaction skip option
- Bulk category assignment
- Progress indicator during upload

---

## E2E Test Scenarios

### Import Flow Tests (`import.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M5-E2E-001 | Display import button on transactions page | Tests import button visibility | Implemented |
| M5-E2E-002 | Open import wizard modal when clicking import | Tests modal and title | Implemented |
| M5-E2E-003 | Display bank format selector in import wizard | Tests selector options | Implemented |
| M5-E2E-004 | Show drag-drop zone with browse button | Tests drop zone UI | Implemented |
| M5-E2E-005 | Accept CSV file upload and show preview | Tests file upload and parsing | Implemented |
| M5-E2E-006 | Display step indicator in import wizard | Tests step UI | Implemented |
| M5-E2E-007 | Detect and highlight duplicate transactions | Tests duplicate detection | Implemented |
| M5-E2E-008 | Allow skipping individual transactions | Tests checkbox deselection | Implemented |
| M5-E2E-009 | Show "Ignorar duplicadas" checkbox | Tests ignore duplicates option | Implemented |
| M5-E2E-010 | Navigate to Step 2 (Categorize & Confirm) | Tests wizard navigation | Implemented |
| M5-E2E-011 | Allow category selection for transactions | Tests category dropdown | Implemented |
| M5-E2E-012 | Complete import and show success | Tests full import flow | Implemented |
| M5-E2E-013 | Close modal via cancel button | Tests modal dismissal | Implemented |
| M5-E2E-014 | Show progress bar during upload | Tests progress indicator | Implemented |
| M5-E2E-015 | Validate file type (reject invalid files) | Tests file validation | Implemented |

### Custom Column Mapping Tests (`custom-column-mapping.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M5-E2E-06a | Display bank format selector with Custom option | Tests custom option visibility | Implemented |
| M5-E2E-06b | Allow selecting Custom bank format | Tests custom selection | Implemented |
| M5-E2E-06c | Show column mapping UI when Custom is selected | Tests mapping UI | Implemented |
| M5-E2E-06d | Handle CSV with standard column names | Tests auto-detection | Implemented |
| M5-E2E-06e | Require all fields mapped before Next enabled | Tests validation | Implemented |
| M5-E2E-06f | Display all bank format options | Tests all bank options | Implemented |
| M5-E2E-06g | Auto detect should be default bank format | Tests default selection | Implemented |
| M5-E2E-06h | Switch bank formats and retain file | Tests format switching | Implemented |
| M5-E2E-06i | Show success when all required fields mapped | Tests success message | Implemented |
| M5-E2E-06j | Show preview after mapping columns | Tests preview generation | Implemented |
| M5-E2E-06k | Disable already-mapped options in other dropdowns | Tests option exclusivity | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| File Upload | 3 | 5 | 167% |
| Format Selection | 2 | 4 | 200% |
| Duplicate Detection | 2 | 2 | 100% |
| Column Mapping | 3 | 11 | 367% |
| Import Completion | 2 | 2 | 100% |
| **Total** | **12** | **26** | **217%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Import button | Yes | On transactions page |
| Import modal | Yes | Wizard UI |
| Step indicator | Yes | Step 1 and 2 |
| Bank format selector | Yes | All options tested |
| File drop zone | Yes | Drag-drop and browse |
| Preview table | Yes | Parsed transactions |
| Duplicate indicators | Yes | Warning icons |
| Category selector | Yes | Per-transaction |
| Column mapping | Yes | Custom format |
| Progress bar | Yes | Upload progress |

---

## Missing Test Scenarios

### 1. OFX File Import (High Priority)
**Description:** Import from OFX bank file format.

```gherkin
Scenario: Import transactions from OFX file
  Given I am in the import wizard
  When I upload a valid OFX file
  Then transactions should be parsed correctly
  And the preview should show transaction details
```

### 2. Bank-Specific Format (Medium Priority)
**Description:** Import using specific bank format (e.g., Nubank, Inter).

```gherkin
Scenario: Import using Nubank format
  Given I am in the import wizard
  When I select "Nubank" as bank format
  And I upload a Nubank CSV export
  Then transactions should be parsed with correct columns
```

### 3. Large File Import (Medium Priority)
**Description:** Import file with many transactions.

```gherkin
Scenario: Import large CSV file with 500+ transactions
  Given I have a CSV with 500 transactions
  When I upload the file
  Then progress should be shown during parsing
  And all transactions should appear in preview
  And pagination should be available
```

### 4. Auto-Apply Categories via Rules (High Priority)
**Description:** Rules should auto-categorize imported transactions.

```gherkin
Scenario: Auto-categorize using existing rules
  Given I have a rule matching "UBER" to "Transport" category
  When I import transactions containing "UBER" descriptions
  Then those transactions should be pre-categorized as "Transport"
```

### 5. Import Error Handling (Medium Priority)
**Description:** Handle malformed or corrupt files.

```gherkin
Scenario: Handle malformed CSV file
  Given I have a CSV with missing columns
  When I upload the file
  Then an error message should appear
  And the user should be able to try again
```

### 6. Bulk Category Assignment (Low Priority)
**Description:** Assign same category to multiple transactions at once.

```gherkin
Scenario: Bulk assign category to all transactions
  Given I am on Step 2 of the import wizard
  When I select "Apply to all" checkbox
  And I select category "Food"
  Then all transactions should be assigned "Food" category
```

### 7. Date Format Detection (Low Priority)
**Description:** Auto-detect and parse various date formats.

```gherkin
Scenario: Parse different date formats
  Given I have a CSV with dates in DD/MM/YYYY format
  When I upload the file
  Then dates should be correctly parsed and displayed
```

---

## Recommendations

1. **OFX Support:** Add comprehensive OFX parsing tests.

2. **Rule Integration:** Test automatic categorization via rules.

3. **Error Recovery:** Add tests for file parsing errors.

4. **Large File Performance:** Test with large datasets.

5. **Date Format Handling:** Test various international date formats.

6. **Amount Format Handling:** Test different number formats (1.234,56 vs 1,234.56).

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
