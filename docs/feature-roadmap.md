# Numen Feature Roadmap

This roadmap breaks the project into vertical slices so we can implement and verify the system feature by feature with TDD.

## Feature 0: Repo Foundation

Goal: create a clean workspace and delivery pipeline for Rust + SvelteKit development.

Status: baseline delivered, including committed Woodpecker CI workflows for Rust checks, frontend checks, and Playwright smoke coverage.

- Add Cargo workspace and frontend app layout
- Configure Rust formatting, linting, and test commands
- Configure frontend formatting, linting, unit-test, and E2E commands
- Add local dev entrypoints for backend, frontend, and combined development
- Add CI for Rust tests, frontend tests, and Playwright

Definition of done:

- New contributors can install dependencies and run tests from documented commands
- CI runs the core quality gates on every change

## Feature 1: Ledger Primitives And Invariants

Goal: model the core accounting types and protect the bookkeeping rules.

- Implement money representation with decimal arithmetic
- Implement `Account`, `Posting`, and `Transaction`
- Enforce required fields and balanced transactions
- Ensure balances are derived from postings, not stored independently

Tests:

- valid balanced transaction
- invalid empty account name
- invalid missing transaction title/date
- invalid missing posting account/amount
- invalid imbalanced transaction

## Feature 2: Ledger Storage And Balance Queries

Goal: persist the domain model locally and query account balances reliably.

- Add SQLite schema for accounts, transactions, postings, and tags
- Add repository layer for storing and loading ledger data
- Expose balance queries per account
- Serve the first local HTTP endpoints for core ledger operations

Tests:

- repository round-trips domain entities
- account balances remain correct after multiple transactions
- HTTP endpoints return persisted balances correctly

## Feature 3: Structured Transaction Entry

Goal: support the main personal-finance flow for recording transactions.

- Add create/list transaction APIs with `date`, `title`, `payee`, `primary_category`, `tags`, and `postings`
- Build the first UI flow for entering a simple transaction
- Show recorded transactions in a basic list

Tests:

- create transaction through domain and API
- UI form validation for required fields
- one browser-level happy-path flow for entering and viewing a transaction

## Feature 3A: Theme System And Appearance Controls

Goal: add a shared appearance foundation before later frontend slices expand the UI surface area.

- Centralize global design tokens for the existing warm ledger aesthetic and a deliberate dark companion theme
- Add an accessible three-state toggle for `light`, `dark`, and `system`
- Default to `system` and store the preference locally in the browser
- Resolve `system` from `prefers-color-scheme` and react when the OS theme changes
- Apply the resolved theme at the document root before hydration to avoid theme flash on load

Tests:

- defaults to `system` when no preference exists
- saved preference overrides OS preference
- `system` mode updates when the OS preference changes
- toggle exposes correct accessible selected state for all three options
- browser flow covers initial render in light and dark system modes plus override switching

## Feature 3B: PT-BR Localization Foundation

Goal: make the product comfortable to use in Brazilian Portuguese before later frontend slices expand the UI surface area.

- Centralize user-facing copy behind translation keys instead of inline strings
- Add an app locale module with `pt-BR` as the default locale
- Localize the current shell copy, form labels, empty states, status text, and validation messaging
- Standardize PT-BR formatting for dates, decimal amounts, and currency display in the frontend
- Keep `numen-core` and current API/domain rules locale-neutral

Tests:

- current shell components render PT-BR labels, helper text, and status messages
- PT-BR formatters render dates and monetary values correctly
- transaction-entry validation messages stay localized
- browser flow passes against PT-BR UI copy

## Feature 4: Balance Snapshots And Historical Adjustment

Goal: reconcile incomplete transaction history with a known real-world balance.

- Add `BalanceSnapshot`
- Compute balance gaps at a chosen snapshot date
- Generate a balancing transaction against `Equity:HistoricalAdjustment`
- Show snapshot and adjustment results in the UI

Tests:

- asset account snapshot with adjustment required
- liability account snapshot with adjustment required
- snapshot that needs no adjustment
- API and UI flow for declaring a snapshot

## Feature 5: CSV Import

Goal: load bank-account and credit-card transaction history into the ledger.

- Add CSV parsing and validation
- Add import preview before commit
- Persist imported transactions
- Support snapshot reconciliation after import

Tests:

- valid CSV import
- malformed CSV row handling
- missing required import fields
- imported transactions combine with snapshots correctly

## Feature 6: Category Reporting

Goal: make transaction categories useful for everyday review.

- Add transaction filtering/grouping by `primary_category`
- Add aggregated expense totals by category
- Build the first pie chart view for category breakdowns

Tests:

- transactions filtered by category
- category totals are correct
- pie-chart data endpoint matches ledger totals

## Feature 7: Expense Trends

Goal: show how expenses evolve over time.

- Add daily, weekly, and monthly expense trend calculations
- Expose trend data through the API
- Build a line chart UI with period selection

Tests:

- daily trend calculation
- weekly trend calculation
- monthly trend calculation
- UI switches periods and renders the expected dataset

## Feature 8: Account-Focused Spending Analysis

Goal: show where money from a selected account is going.

- Add reporting grouped by `category` and `payee` for a selected account
- Build chart/table views for account-focused breakdowns
- Support simple drill-down from an account into its spend distribution

Tests:

- grouped totals by payee
- grouped totals by category
- selected-account analysis excludes unrelated transactions
- browser flow for viewing an account breakdown

## Feature 9: Hardening And First Release Candidate

Goal: prepare the first stable local-first release.

- Improve error handling and empty states
- Tighten test fixtures and regression coverage
- Validate import/reconciliation/reporting behavior on realistic datasets
- Document local setup, workflows, and release steps
- Sweep remaining user-facing copy to ensure later slices keep using the localization layer

Tests:

- regression coverage around previously fixed bugs
- smoke E2E flow across entry, import, reconciliation, and reporting

## Deferred After V1

- split transactions
- account hierarchy
- multi-currency and FX
- sync or multi-user support
- desktop packaging with Tauri
