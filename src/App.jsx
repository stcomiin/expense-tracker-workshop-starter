import { useState, useEffect } from 'react'
import './App.css'

function createInitialTransactions() {
  const now = new Date()
  const date = (monthOffset, day) => new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day,
  )).toISOString().slice(0, 10)

  return [
    { id: 1, description: 'Salary', amount: 5000, type: 'income', category: 'salary', date: date(0, 1) },
    { id: 2, description: 'Rent', amount: 1200, type: 'expense', category: 'housing', date: date(-1, 2) },
    { id: 3, description: 'Groceries', amount: 150, type: 'expense', category: 'food', date: date(0, 3) },
    { id: 4, description: 'Freelance Work', amount: 800, type: 'income', category: 'salary', date: date(-1, 5) },
    { id: 5, description: 'Electric Bill', amount: 95, type: 'expense', category: 'utilities', date: date(-1, 6) },
    { id: 6, description: 'Dinner Out', amount: 65, type: 'expense', category: 'food', date: date(0, 7) },
    { id: 7, description: 'Gas', amount: 20, type: 'expense', category: 'transport', date: date(0, 8) },
    { id: 8, description: 'Netflix', amount: 15, type: 'expense', category: 'entertainment', date: date(0, 10) },
  ]
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

const sumCents = items => items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0)
const formatMoney = cents => `$${(cents / 100).toFixed(2)}`

function App() {
  const [transactions, setTransactions] = useState(createInitialTransactions)
  const [budgets, setBudgets] = useState(() => {
    const stored = localStorage.getItem('app-budgets')
    return stored ? JSON.parse(stored) : []
  })
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetCategory, setBudgetCategory] = useState('food')
  const [budgetError, setBudgetError] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('food')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [error, setError] = useState('')

  const categories = ['food', 'housing', 'utilities', 'transport', 'entertainment', 'salary', 'other']
  const expenseCategories = categories.filter(c => c !== 'salary')

  useEffect(() => {
    localStorage.setItem('app-budgets', JSON.stringify(budgets))
  }, [budgets])

  const totalIncomeCents = sumCents(transactions.filter(t => t.type === 'income'))
  const totalExpensesCents = sumCents(transactions.filter(t => t.type === 'expense'))
  const balanceCents = totalIncomeCents - totalExpensesCents

  const getCurrentMonthSpending = (cat) => {
    const currentMonth = getCurrentMonth()
    return sumCents(transactions.filter(t =>
      t.type === 'expense' && t.category === cat && t.date.slice(0, 7) === currentMonth
    ))
  }

  const getBudgetWithProgress = (budget) => {
    const spent = getCurrentMonthSpending(budget.category)
    const budgetCents = Math.round(budget.amount * 100)
    const percentage = Math.round((spent / budgetCents) * 100)
    return {
      ...budget,
      spentCents: spent,
      budgetCents,
      percentage,
      isOver: spent > budgetCents
    }
  }

  const sortedBudgets = budgets
    .map(getBudgetWithProgress)
    .sort((a, b) => b.percentage - a.percentage)

  const handleBudgetSubmit = e => {
    e.preventDefault()
    const value = Number(budgetAmount)
    if (!/^(?:\d+|\d*\.\d{1,2})$/.test(budgetAmount) ||
        !Number.isFinite(value) || value <= 0 || value > 1_000_000) {
      setBudgetError('Enter an amount from $0.01 to $1000000.00, with at most two decimal places.')
      return
    }

    setConfirmDialog({
      type: 'save',
      category: budgetCategory,
      amount: value,
    })
  }

  const confirmBudget = () => {
    if (confirmDialog.type === 'save') {
      const existing = budgets.find(b => b.category === budgetCategory)
      if (existing) {
        setBudgets(budgets.map(b =>
          b.category === budgetCategory
            ? { ...b, amount: confirmDialog.amount, updatedAt: new Date().toISOString() }
            : b
        ))
      } else {
        setBudgets([...budgets, {
          category: budgetCategory,
          amount: confirmDialog.amount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }])
      }
      setBudgetAmount('')
      setBudgetError('')
      setBudgetCategory('food')
    } else if (confirmDialog.type === 'delete') {
      setBudgets(budgets.filter(b => b.category !== confirmDialog.category))
    }
    setConfirmDialog(null)
  }

  const handleDeleteBudget = (cat) => {
    setConfirmDialog({ type: 'delete', category: cat })
  }

  const handleEditBudget = (cat) => {
    const budget = budgets.find(b => b.category === cat)
    if (budget) {
      setBudgetCategory(cat)
      setBudgetAmount(budget.amount.toString())
    }
  }

  let filteredTransactions = transactions
  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.type === filterType)
  }
  if (filterCategory !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.category === filterCategory)
  }

  const handleSubmit = e => {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim() || description.trim().length > 120 ||
        !/^(?:\d+|\d*\.\d{1,2})$/.test(amount) ||
        !Number.isFinite(value) || value <= 0 || value > 1_000_000) {
      setError('Enter a description and an amount from $0.01 to $1000000.00, with at most two decimal places.')
      return
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: value,
      type,
      category,
      date: new Date().toISOString().slice(0, 10),
    }
    setTransactions(previous => [...previous, newTransaction])
    setDescription('')
    setAmount('')
    setType('expense')
    setCategory('food')
    setError('')
  }

  return (
    <main className="app">
      <h1>Expense Tracker</h1>
      <p className="subtitle">Synthetic workshop data. Dates use UTC; reloading resets changes.</p>

      <section className="summary" aria-label="Account summary">
        <div className="summary-card">
          <h2>Income</h2>
          <p className="income-amount">{formatMoney(totalIncomeCents)}</p>
        </div>
        <div className="summary-card">
          <h2>Expenses</h2>
          <p className="expense-amount">{formatMoney(totalExpensesCents)}</p>
        </div>
        <div className="summary-card">
          <h2>Balance</h2>
          <p className="balance-amount">{formatMoney(balanceCents)}</p>
        </div>
      </section>

      <section className="add-transaction" aria-labelledby="add-heading">
        <h2 id="add-heading">Add Transaction</h2>
        <form onSubmit={handleSubmit} onChange={() => setError('')}>
          <label className="description-field" htmlFor="description">
            Description
            <input id="description" name="description" type="text" placeholder="Description"
              required maxLength={120} value={description}
              aria-describedby={error ? 'transaction-error' : undefined}
              onChange={e => setDescription(e.target.value)} />
          </label>
          <label htmlFor="amount">
            Amount (USD)
            <input id="amount" name="amount" type="number" placeholder="Amount"
              required min="0.01" max="1000000" step="0.01" value={amount}
              aria-describedby={error ? 'transaction-error' : undefined}
              onChange={e => setAmount(e.target.value)} />
          </label>
          <label htmlFor="type">
            Transaction type
            <select id="type" name="type" value={type} onChange={e => setType(e.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label htmlFor="category">
            Category
            <select id="category" name="category" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <button type="submit">Add</button>
          {error && <p className="error" id="transaction-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="transactions" aria-labelledby="transactions-heading">
        <h2 id="transactions-heading">Transactions</h2>
        <div className="filters">
          <label htmlFor="filter-type">
            Filter type
            <select id="filter-type" name="filter-type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label htmlFor="filter-category">
            Filter category
            <select id="filter-category" name="filter-category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
        </div>
        <p className="subtitle">Filters affect table rows only. Account totals include all transactions.</p>
        <p className="table-hint">Scroll the table horizontally to see every column.</p>
        <div className="table-scroll" role="region" aria-label="Transaction table" tabIndex={0}>
          <table aria-labelledby="transactions-heading">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>{t.category}</td>
                  <td className={t.type === 'income' ? 'income-amount' : 'expense-amount'}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(Math.round(t.amount * 100))}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr><td colSpan={4}>No transactions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="budgets" aria-labelledby="budgets-heading">
        <h2 id="budgets-heading">Budgets</h2>
        <form className="budget-form" onSubmit={handleBudgetSubmit}>
          <label htmlFor="budget-category">
            Budget Category
            <select id="budget-category" name="budget-category" value={budgetCategory}
              onChange={e => setBudgetCategory(e.target.value)}>
              {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <label htmlFor="budget-amount">
            Monthly Limit (USD)
            <input id="budget-amount" name="budget-amount" type="number" placeholder="Monthly limit"
              required min="0.01" max="1000000" step="0.01" value={budgetAmount}
              aria-describedby={budgetError ? 'budget-error' : undefined}
              onChange={e => setBudgetAmount(e.target.value)} />
          </label>
          <button type="submit">Set Budget</button>
          {budgetError && <p className="error" id="budget-error" role="alert">{budgetError}</p>}
        </form>

        {sortedBudgets.length > 0 && (
          <div data-testid="budgets-list" className="budgets-list">
            {sortedBudgets.map(budget => (
              <div key={budget.category} data-testid="budget-item" className="budget-item">
                <div className="budget-header">
                  <h3>{budget.category}</h3>
                  <div className="budget-actions">
                    <button onClick={() => handleEditBudget(budget.category)}>Edit</button>
                    <button onClick={() => handleDeleteBudget(budget.category)}>Delete</button>
                  </div>
                </div>
                <div className="budget-progress">
                  <p className="budget-amount">
                    {formatMoney(budget.spentCents)} / {formatMoney(budget.budgetCents)} ({budget.percentage}%)
                  </p>
                  <div data-testid="progress-bar" className={`progress-bar ${budget.isOver ? 'red' : 'green'}`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmDialog && (
        <dialog open>
          <div className="dialog-content">
            {confirmDialog.type === 'save' ? (
              <>
                <h3>Confirm Budget</h3>
                <p>Set {confirmDialog.category} budget to {formatMoney(Math.round(confirmDialog.amount * 100))}?</p>
                <div className="dialog-actions">
                  <button onClick={() => setConfirmDialog(null)}>Cancel</button>
                  <button onClick={confirmBudget}>Save</button>
                </div>
              </>
            ) : (
              <>
                <h3>Remove Budget</h3>
                <p>Remove the {confirmDialog.category} budget? It will return to unlimited.</p>
                <div className="dialog-actions">
                  <button onClick={() => setConfirmDialog(null)}>Cancel</button>
                  <button onClick={confirmBudget}>Remove</button>
                </div>
              </>
            )}
          </div>
        </dialog>
      )}
    </main>
  )
}

export default App
