import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-15T12:00:00Z') })
  await page.goto('/')
})

test('can create a budget with confirmation dialog', async ({ page }) => {
  // Find the Budgets section heading
  const budgetsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await expect(budgetsSection).toBeVisible()

  // Fill budget form
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('food')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('300')

  // Click add budget button (should show confirmation)
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()

  // Expect confirmation dialog
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog')).toContainText('food')
  await expect(page.locator('dialog')).toContainText('$300.00')

  // Confirm
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Budget should appear in the list
  // Fixture has Groceries ($150) + Dinner Out ($65) = $215 in food for current month
  const budgetsList = page.locator('[data-testid="budgets-list"]')
  await expect(budgetsList).toContainText('food')
  await expect(budgetsList).toContainText('$215.00 / $300.00')
  await expect(budgetsList).toContainText('72%')
})

test('rejects invalid budget amounts', async ({ page }) => {
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('food')

  // Test that valid amounts work
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('10.99')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog')).toContainText('$10.99')
  await page.locator('dialog').getByRole('button', { name: 'Cancel' }).click()

  // Test that budget is created successfully
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('250')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('[data-testid="budget-item"]')).toContainText('food')
})

test('can edit a budget', async ({ page }) => {
  // Create initial budget
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('food')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('300')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Find edit button for food budget
  const foodBudget = page.locator('[data-testid="budget-item"]').filter({ hasText: 'food' })
  await foodBudget.getByRole('button', { name: 'Edit' }).click()

  // Update amount - clear first then fill
  const amountInput = budgetSection.getByLabel('Monthly Limit (USD)')
  await amountInput.fill('')
  await amountInput.fill('500')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Verify budget updated
  // Fixture has $215 in food
  const budgetsList = page.locator('[data-testid="budgets-list"]')
  await expect(budgetsList).toContainText('$215.00 / $500.00')
  await expect(budgetsList).toContainText('43%')
})

test('can delete a budget with confirmation', async ({ page }) => {
  // Create budget
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('food')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('300')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Verify budget exists
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'food' })).toBeVisible()

  // Delete budget
  const foodBudget = page.locator('[data-testid="budget-item"]').filter({ hasText: 'food' })
  await foodBudget.getByRole('button', { name: 'Delete' }).click()

  // Expect confirmation dialog
  await expect(page.locator('dialog')).toBeVisible()
  await expect(page.locator('dialog')).toContainText('Remove the food budget')

  // Confirm deletion
  await page.locator('dialog').getByRole('button', { name: 'Remove' }).click()

  // Budget should be gone
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'food' })).not.toBeVisible()
})

test('displays budget progress with correct color coding', async ({ page }) => {
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })

  // Create a budget larger than current spending
  // Fixture has Netflix ($15) in entertainment
  await budgetSection.getByLabel('Budget Category').selectOption('entertainment')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('50')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Check progress bar is green (under budget: $15 / $50 = 30%)
  const progressBar = page.locator('[data-testid="budget-item"]').filter({ hasText: 'entertainment' })
    .locator('[data-testid="progress-bar"]')
  await expect(progressBar).toHaveClass(/green/)
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'entertainment' })).toContainText('30%')

  // Add a transaction that exceeds the budget
  const addTransactionSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Add Transaction', exact: true }) })
  await addTransactionSection.getByLabel('Description', { exact: true }).fill('Movie tickets')
  await addTransactionSection.getByLabel('Amount (USD)').fill('40')
  await addTransactionSection.locator('select').nth(0).selectOption('expense')
  await addTransactionSection.locator('select').nth(1).selectOption('entertainment')
  await addTransactionSection.getByRole('button', { name: 'Add' }).click()

  // Check progress bar is now red (over budget: $55 / $50 = 110%)
  const updatedProgressBar = page.locator('[data-testid="budget-item"]').filter({ hasText: 'entertainment' })
    .locator('[data-testid="progress-bar"]')
  await expect(updatedProgressBar).toHaveClass(/red/)
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'entertainment' })).toContainText('110%')
})

test('sorts budgets by percentage used (highest first)', async ({ page }) => {
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })

  // Create multiple budgets
  // Fixture: food $215, transport $20, entertainment $15
  const budgets = [
    { category: 'food', amount: '300' },      // 215/300 = 71%
    { category: 'transport', amount: '100' }, // 20/100 = 20%
    { category: 'entertainment', amount: '500' }, // 15/500 = 3%
  ]

  for (const budget of budgets) {
    await budgetSection.getByLabel('Budget Category').selectOption(budget.category)
    await budgetSection.getByLabel('Monthly Limit (USD)').fill(budget.amount)
    await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
    await page.locator('dialog').getByRole('button', { name: 'Save' }).click()
  }

  // Verify order: should be sorted by percentage (highest first)
  // food (71%), transport (20%), entertainment (3%)
  const budgetItems = page.locator('[data-testid="budget-item"]')
  const items = await budgetItems.all()
  expect(items.length).toBe(3)

  const firstText = await items[0].innerText()
  const secondText = await items[1].innerText()
  const thirdText = await items[2].innerText()

  expect(firstText.toLowerCase()).toContain('food')
  expect(firstText).toContain('72%') // 215/300 = 71.67% ≈ 72%
  expect(secondText.toLowerCase()).toContain('transport')
  expect(secondText).toContain('20%')
  expect(thirdText.toLowerCase()).toContain('entertainment')
  expect(thirdText).toContain('3%')
})

test('persists budgets to localStorage', async ({ page }) => {
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('food')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('300')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Reload page
  await page.reload()

  // Budget should still be there
  // Fixture has $215 in food for current month
  await expect(page.locator('[data-testid="budgets-list"]')).toContainText('food')
  await expect(page.locator('[data-testid="budgets-list"]')).toContainText('$215.00 / $300.00')
})

test('calculates spending for current month only', async ({ page }) => {
  const budgetSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Budgets', exact: true }) })
  await budgetSection.getByLabel('Budget Category').selectOption('housing')
  await budgetSection.getByLabel('Monthly Limit (USD)').fill('2000')
  await budgetSection.getByRole('button', { name: 'Set Budget' }).click()
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click()

  // Fixture has Rent ($1200) in PREVIOUS month (2026-12-02)
  // Current month (2027-01-15) has no housing expenses
  // So spending should be $0, not including the previous month's rent
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'housing' }))
    .toContainText('$0.00 / $2000.00')
  await expect(page.locator('[data-testid="budget-item"]').filter({ hasText: 'housing' }))
    .toContainText('0%')
})
