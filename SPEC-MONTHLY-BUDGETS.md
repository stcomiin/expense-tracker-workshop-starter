# Monthly Budget Feature Specification

## Problem Statement

Users currently have no way to control or monitor their spending within expense categories on a monthly basis. They see their total expenses only after the fact and cannot set spending limits or track progress toward financial goals. This makes it difficult to plan and manage monthly cash flow, especially for variable categories like food, entertainment, or transport.

## Solution

Add a per-category monthly budget feature that allows users to:
- Set a spending limit for each expense category that resets on the 1st of each month
- View budget progress for all categories in a dedicated "Budgets" section
- Receive warnings when a transaction would exceed a category's budget (but still allow it)
- Sort budgets by usage percentage to see which categories are closest to their limits
- Delete budgets to return a category to unlimited spending

Budgets persist locally via localStorage and apply only to the current calendar month. Each category can have its own independent budget or no budget at all (unlimited).

## User Stories

1. As a user, I want to set a monthly food budget, so that I can control my food spending.
2. As a user, I want to see all my category budgets in one place, so that I can review my financial plan at a glance.
3. As a user, I want to see how much I've spent vs. my budget for each category, so that I know if I'm on track.
4. As a user, I want budgets to reset on the 1st of each month, so that I can start fresh each month.
5. As a user, I want to set different budgets for different categories, so that I can allocate my spending based on priorities.
6. As a user, I want to be warned when adding a transaction that would exceed a category's budget, so that I know I'm overspending.
7. As a user, I want to still be able to add a transaction even if it exceeds the budget, so that I have flexibility for emergencies.
8. As a user, I want to delete a budget for a category, so that I can stop tracking that category if I no longer need to.
9. As a user, I want budgets to persist across browser reloads, so that I don't lose my budget settings.
10. As a user, I want to see the percentage of my budget used for each category, so that I can quickly assess my spending ratio.
11. As a user, I want budgets sorted by percentage used (highest first), so that I can focus on the categories where I'm closest to my limit.
12. As a user, I want to edit a budget after I've set it, so that I can adjust it if my circumstances change during the month.
13. As a user, I want to confirm before deleting a budget, so that I don't accidentally lose my budget settings.
14. As a user, I want to confirm when saving a new budget, so that I don't accidentally create a budget with incorrect values.
15. As a user, I want to see budget information when filtering transactions by category, so that I'm reminded of my limit while viewing spending.
16. As a user, I want budgets to apply only to expense transactions, so that income and transfers don't count against my budget.
17. As a user, I want to set budgets from $0.01 to $1,000,000 with up to 2 decimal places, so that I can budget for any amount.
18. As a user, I want an error message if I try to set an invalid budget amount, so that I understand what went wrong.
19. As a user, I want to see my budget overage amount in the warning, so that I know by how much I'm exceeding the limit.
20. As a user, I want categories without a budget to remain unlimited, so that I only track categories I care about.
21. As a user, I want a dedicated section for budgets in the app UI, so that budget management doesn't clutter the transaction view.
22. As a user, I want to set budgets using a form similar to adding transactions, so that the workflow feels consistent.
23. As a user, I want the app to show "$X / $Y (Z%)" for each budget, so that I can quickly see spending progress.
24. As a user, I want visual feedback (color) that indicates when I'm approaching or over budget, so that I can see at a glance which categories need attention.
25. As a user, I want to be able to access the budget feature without internet, so that my budget settings work offline.

## Implementation Decisions

### Data Model

**Budget Structure:**
- A budget is defined per category per month
- Each budget stores: `{ category: string, amount: number (in dollars), createdAt: string (ISO date), updatedAt: string (ISO date) }`
- Budgets are stored in localStorage under the key `"budgets"` as a JSON array
- Only active budgets are stored; deleting a budget removes it from localStorage
- No historical budget data is retained

**Month Calculation:**
- "Current month" is determined by the system date (Date.now() or provided clock)
- Month boundary: Calendar month (Jan 1–31, Feb 1–28/29, etc.)
- On the 1st of each month at UTC midnight, budgets logically reset but retain their configured values
- No data migration or reset operation is needed; the month is determined at read time

**Integration with Transactions:**
- Transaction data model remains unchanged
- Budget calculation is performed at view time: sum all expenses for a given category in the current month
- No budget data is stored on transactions

### Component Architecture

**High-Level Structure:**
- Single integration point: the App component (main state container)
- New "Budgets" section in the UI alongside existing "Add Transaction" and "Transactions" sections
- Budget state managed alongside transaction state using React hooks

**Components to Add/Modify:**
- New `BudgetForm` component for setting/editing budgets (similar structure to add transaction form)
- New `BudgetsList` component for displaying budget progress
- New `BudgetProgressBar` component for visual representation (progress bar + percentage text)
- Modification to existing Transactions filter section to display budget info next to category dropdown
- Modification to App component to manage budget state and calculation logic

### Budget Calculation Logic

**Current Month Spending:**
- Sum all transactions where: `type === 'expense'` AND `category === targetCategory` AND `date` falls within the current calendar month
- Amount stored as number (dollars), totals calculated in cents to avoid floating-point errors
- Same precision model as existing transaction logic

**Progress Calculation:**
- Percentage used = `(spent / budgetAmount) * 100`, rounded to nearest integer
- Overage amount = `max(0, spent - budgetAmount)`
- Status: "over" if `spent > budgetAmount`, "on-track" otherwise

**Warning Calculation (on transaction submission):**
- When user adds a transaction: calculate the new total for that category if transaction is added
- If new total > budget: display warning message with current spending, budget, and overage
- Proceed with transaction regardless of warning

### Budget Warning Flow

**On Transaction Submission:**
1. Validate transaction amount (existing logic)
2. If category has a budget:
   - Calculate current month spending for that category
   - Calculate new total if this transaction is added
   - If new total exceeds budget: show warning modal/alert before submission
   - Warning message: `"This transaction would put [Category] over budget. Current: $X, Budget: $Y, Overage: $Z"`
3. Allow submission to proceed (user can choose to add despite warning)

### Sorting and Display

**Budget List Sorting:**
- Default sort: By percentage used (descending), so highest usage appears first
- Within same percentage: Stable sort (maintain insertion order or alphabetical as tiebreaker)
- Calculation: `(spent / budgetAmount) * 100`

**Display Format:**
- Per budget: `[Category Name] - $[spent] / $[budget] ([percentage]%) [progress bar]`
- Progress bar: Filled portion proportional to percentage, color-coded (green if under 100%, red if over)

### localStorage Persistence

**Storage Key:** `"app-budgets"`
**Format:** JSON array of budget objects
**Schema:**
```json
[
  {
    "category": "food",
    "amount": 300,
    "createdAt": "2027-01-01T00:00:00Z",
    "updatedAt": "2027-01-01T00:00:00Z"
  }
]
```

**Lifecycle:**
- Read on app load: deserialize from localStorage or initialize as empty array
- Write on every budget change: serialize and save to localStorage
- No validation on read; validation occurs at form submission

### Validation Rules

**Budget Amount:**
- Minimum: $0.01
- Maximum: $1,000,000
- Decimal places: Up to 2 (same as transactions)
- Invalid formats: Reject same as transaction validation (non-numeric, negative, too many decimals)
- Error message: Same pattern as transaction errors

**Category:**
- Must exist in the app's category list (food, housing, utilities, transport, entertainment, salary, other)
- Only expense categories are valid (salary is excluded if it's income-only)

**Duplicate Budget:**
- If a budget for a category already exists, editing replaces it (no duplicate budgets per category)

### Deletion Flow

**Deleting a Budget:**
- Show confirmation dialog: "Are you sure you want to remove the [Category] budget? It will return to unlimited."
- On confirmation: remove budget from localStorage and re-render
- Confirmation required to prevent accidental deletion

### Current Limitations & Assumptions

- Single-user experience (no multi-user account support)
- No budget history or trends
- No notifications/alerts outside the app
- No budget templates or presets
- No goal tracking or savings goals (budgets are spending limits only)
- No currency support beyond USD
- No mobile-specific optimizations (same layout as desktop)

## Testing Decisions

### Testing Philosophy

Good tests for the budget feature should verify external behavior as observed by the user. Tests should focus on:
- Budget creation, deletion, and editing
- Correct calculation of spending progress
- Warning display when exceeding budget
- localStorage persistence
- Budget display and sorting
- Month boundary behavior

Tests should NOT depend on implementation details like:
- Internal component structure or state management
- Specific CSS class names or styling
- Order of React renders
- Exact localStorage key names (mock localStorage instead)

### Test Seams

**Primary seam (E2E via Playwright):**
- User-facing workflows: set budget → add transactions → verify progress display → delete budget
- Warning display: add transaction that exceeds budget → verify warning shown → allow submission
- Month boundary: add transaction on last day of month → verify budget still applies → cross into new month → verify budget resets
- Persistence: set budget → reload page → verify budget still exists
- Sorting: create multiple budgets with different usage levels → verify display order

**Integration seams (if unit tests are added):**
- Budget calculation: given transactions and a budget, verify current month spending is correct
- Progress calculation: given spending amount and budget, verify percentage and overage are correct

### Test Coverage Areas

1. **Creating a Budget**
   - User fills form and submits
   - Budget appears in list with correct amount
   - Invalid amounts show error message

2. **Editing a Budget**
   - User updates existing budget amount
   - Progress recalculates correctly
   - Confirmation dialog shown before saving

3. **Deleting a Budget**
   - Budget removed from list
   - Category returns to unlimited status
   - Confirmation dialog prevents accidental deletion

4. **Budget Progress Display**
   - Spending correctly summed for current month
   - Percentage calculated correctly
   - Color coding (green/red) applied based on overage
   - Sorted by percentage (highest first)

5. **Transaction Warning**
   - Adding transaction under budget → no warning
   - Adding transaction that exceeds budget → warning shown with correct amounts
   - User can proceed despite warning

6. **Month Boundary**
   - Budget applies to current month only
   - On 1st of new month, budgets reset (new month starts from $0 spent)
   - Old month's transactions don't count toward new month's budget

7. **Persistence**
   - Budgets survive page reload
   - localStorage cleared → budgets gone on reload

8. **Category Integration**
   - Budget info shown in transaction filter dropdowns
   - Only expense categories can have budgets
   - Unbudgeted categories show as unlimited

### Test Implementation Strategy

- Use existing Playwright baseline tests as a model
- Add new tests to `tests/` directory following same pattern
- Test user workflows at the highest possible level (E2E)
- Mock or control `Date.now()` to test month boundaries deterministically (Playwright provides `page.clock.install()`)

## Out of Scope

- Backend/API implementation (feature uses localStorage only)
- Multi-user or account-based budgets
- Budget forecasting or predictive analytics
- Historical budget tracking or trends over time
- Budget sharing or collaboration features
- Budget templates or presets
- Mobile-specific UI optimizations
- Internationalization or multi-currency support
- Notifications or alerts outside the app
- Budget goals or savings tracking (this is spending limits only)
- Income budgets or allocation budgets (expense categories only)
- Recurring transaction budgeting
- Subcategory budgets (only top-level categories)
- Budget rollover or carryover between months

## Further Notes

### Month Boundary Behavior

The feature treats month boundaries as calendar months in the user's local timezone. Budget calculations use the date field of transactions (ISO format: `YYYY-MM-DD`), not the time. If the system date changes (e.g., midnight), budgets automatically reset for the new month—no explicit reset logic needed.

### Performance Considerations

Budget calculation is performed at render time (sum expenses for category + month). With typical transaction volumes (<1000 transactions), this is negligible. If transaction volumes grow significantly, consider memoizing budget calculations.

### localStorage Limitations

The feature relies on localStorage, which is per-origin and per-device. Users who clear browser data will lose budgets. Consider documenting this limitation or adding import/export in future iterations.

### Category Consistency

Budget categories must exactly match transaction categories. If categories change in the future, budget records for renamed categories will become orphaned. Consider adding a migration step if category refactoring occurs.

### Design Direction

The Budgets section should maintain visual consistency with the existing App design. Progress bars should use the same color palette as the summary cards (green for on-track, red for over-budget). Typography and spacing should match existing sections.
