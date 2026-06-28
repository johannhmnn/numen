# Numen

Numen is a local-first personal finance app for understanding where, how much,
and when money is spent. The first goal is a reliable manual ledger backed by
double-entry bookkeeping, with enough reporting to make monthly spending visible
by category and account.

The app starts small on purpose. We will follow an XP-like cycle for each
feature: code, test, refactor. Imports, budgets, broader reporting, and stack
expansion come after the first ledger slice proves itself.

## Product goals

- Track spending with reliable double-entry bookkeeping.
- Show payees, categories, accounts, dates, and amounts clearly.
- Support detailed expense reporting over time.
- Keep the interface uncluttered, closer to Apple-like simplicity or a restrained
  shadcn-style theme.
- Stay local-only for now, using BRL as the only currency.

## Core domain decisions

### Accounts

`Account` represents an accounting account, not a bank-only account. Account
types are:

- `Asset`
- `Liability`
- `Equity`
- `Income`
- `Expense`

`Asset` is required for accounts like checking accounts and cash.

Account names cannot be empty.

### Transactions and postings

Use signed postings internally:

- `Transaction` is the balancing envelope.
- `Posting` has one account and one signed amount.
- Each transaction must sum to zero exactly.

Use debit-positive convention:

- Assets and Expenses increase with positive amounts.
- Liabilities, Equity, and Income increase with negative amounts.

Example expense:

- Checking account: `-10000` centavos
- Groceries expense account: `+10000` centavos

The UI can still show this as `R$ 100,00 spent`.

### Money

Store money as signed integer centavos.

The app is BRL-only for v1. Do not introduce multicurrency support yet.

### Balances

Account balances are derived from postings. Do not store or mutate account
balances directly in v1.

### Categories

Keep `Category` separate from `Account`.

Attach one category to each transaction in v1. Split-category transactions are
deferred until there is a real need.

### Payees

Store `payee` as plain text on each transaction.

Do not create a separate payee entity in v1.

### Balance corrections

Use explicit balanced transactions for opening balances and reconciliation
corrections.

Use equity accounts such as:

- `Opening Balances`
- `Balance Adjustments`

Do not edit account balances directly.

## First XP slice

The first vertical slice is manual ledger entry.

Build:

- CRUD for accounts.
- CRUD for categories.
- A simple two-sided transaction form.
- Transaction tables with filtering and sorting.
- Row selection and right-click edit for table/list rows.
- Derived account balances.
- Monthly expense summary by category and account.

The transaction form should collect:

- Date
- Title
- Payee
- Category
- Amount
- Source account
- Destination account

The system generates two signed postings from the simple form and rejects
unbalanced transactions.

## Reporting

The first report is a monthly expense summary.

It should show:

- Total expenses for the selected month.
- Expenses by category.
- Expenses by account.

Daily, weekly, yearly, and comparison reports are deferred until monthly
reporting works.

Pie charts are desired for category and account breakdowns, but they do not need
to precede correct tables and totals.

## Budgets

Budgets are deferred until after the first ledger and reporting slice.

The first budget model should be monthly category budgets.

## CSV imports

CSV import is deferred until after manual ledger entry works.

The first import formats to support are:

### Bank extract

Fields:

- `Data`
- `Valor`
- `Identificador`
- `Descrição`

Mappings:

- `Data` maps to transaction date.
- `Valor` maps to amount.
- `Descrição` maps to title.

`Valor` uses the format `123.45`.

Negative values represent transfers from the checking account. Positive values
represent transfers to the checking account.

### Credit card extract

Fields:

- `date`
- `title`
- `amount`

`amount` uses the format `123.45`.

Negative values represent bill payment. Positive values represent expenses from
the credit card.

### Import behavior

The user must be able to choose source and destination accounts during import.

Category rules should be supported after basic import works. Example: if the
title contains `coffee`, categorize it as `food`.

Account rules can be considered later, but v1 import should prioritize simple
bulk entry followed by manual editing.

## Stack direction

Do not lock the stack before a short spike.

Run a small ADR spike comparing Go and Rust for:

- SQLite integration.
- Domain validation ergonomics.
- Local web app API development.
- Test speed and setup.
- Portfolio and hiring signal.

Current default recommendation: Go for the backend unless the spike shows Rust
has a meaningful advantage for this app.

Reasoning: Go is simple, direct, and legible for backend job-market signaling.
Rust has a strong correctness story, but may add friction for CRUD, reporting,
and local web app iteration.

For the frontend, default to a local web app. If using a JavaScript frontend,
prefer Svelte.

No authentication is needed for v1. The app should bind to localhost only.

## Tests

Every new function should get a test. Bug fixes should get regression tests.

The first slice needs tests for:

- Non-empty account names.
- Non-empty transaction titles.
- Valid account types.
- Exact centavo parsing and formatting.
- Balanced transaction invariant.
- Debit-positive sign convention examples.
- Creating a two-sided expense transaction.
- Rejecting an unbalanced transaction.
- Derived account balances.
- Monthly expenses by category.
- Monthly expenses by account.
- Opening balance and adjustment transactions not appearing as ordinary
  expenses unless explicitly included.

Once the stack is selected, define the single project test command in
`AGENTS.md`.

## Assumptions

- Single-user.
- Local-only.
- BRL-only.
- No multicurrency.
- No auth.
- No split-category transactions in v1.
- No hosted deployment.
- No syncing.
- No mobile app in the first slice.
