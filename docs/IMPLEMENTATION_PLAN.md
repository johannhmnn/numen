# Implementation Plan

This document captures the agreed implementation plan for Numen's first
vertical slice. It is intentionally ordered by dependency and scoped to small
XP-style tasks: code, test, refactor.

## Scope

- In scope: project bootstrap, `AGENTS.md`, domain model, account CRUD,
  category CRUD, simple manual transactions, derived balances, and monthly
  expense reporting.
- Out of scope for now: CSV imports, budgets, multi-currency, authentication,
  automatic rules, split categories, and reports beyond the monthly summary.

## Assumption

This plan assumes the target is the first manual ledger slice described in
`docs/IDEA.md`.

## Task 1: Stack Spike and Project Contract

- Objective: confirm the stack for the first slice, bootstrap the project, and
  define the single test command in `AGENTS.md`.
- Affected files: `AGENTS.md`, `README.md` or `docs/adr/0001-stack.md`, stack
  manifest files such as `go.mod` or `Cargo.toml`, initial project structure.
- Risks: choosing a stack that slows down local SQLite CRUD work, or committing
  too early without validating the basic developer workflow.
- Required tests: smoke test for the single test command, initial build check,
  and formatter/lint verification for the selected stack.
- Timebox: up to 2 hours.

## Task 2: Accounting Domain and Invariants

- Objective: implement `Account`, `Category`, `Transaction`, and `Posting`
  with the core bookkeeping rules: non-empty names, valid account types, signed
  postings, and exact zero-sum balancing.
- Affected files: domain modules such as `internal/domain/...` or
  `src/domain/...`, plus unit tests for each invariant.
- Risks: getting the sign convention wrong, conflating `Category` with
  `Account`, or returning vague validation errors.
- Required tests: non-empty account names, valid account types, non-empty
  transaction titles, balanced transaction invariant, rejection of unbalanced
  transactions, and debit-positive convention examples.
- Timebox: up to 2 hours.

## Task 3: Money and Input Validation

- Objective: centralize BRL centavo parsing and formatting so the domain uses
  integer money values only.
- Affected files: money utility module, unit tests, and any request/UI parsing
  helpers that convert user input into centavos.
- Risks: rounding errors, inconsistent parsing between layers, and acceptance
  of ambiguous formats.
- Required tests: exact centavo parsing, BRL formatting, and invalid input
  cases with error messages that include both the offending value and the
  expected shape.
- Timebox: 1 to 2 hours.

## Task 4: Local Persistence and Initial Schema

- Objective: add SQLite schema and repository implementations for accounts,
  categories, transactions, and postings without leaking core invariants into
  ad hoc SQL.
- Affected files: persistence layer, schema/migrations, repository interfaces,
  and database integration tests.
- Risks: storing derived balances directly, scattering business rules across
  SQL, and making schema evolution harder than necessary.
- Required tests: persistence round-trip, two-posting transaction storage,
  derived balances from postings, and isolated temporary-database tests.
- Timebox: up to 2 hours.

## Task 5: Account CRUD

- Objective: support creating, listing, editing, and removing accounts with
  clear accounting semantics.
- Affected files: account handlers/controllers, account views/components,
  routes, and unit/integration tests.
- Risks: UX that suggests accounts are bank-only entities, or deletion rules
  that break when an account is already referenced.
- Required tests: create/edit flows, name/type validation, deletion behavior
  for referenced accounts, and list rendering.
- Timebox: up to 2 hours.

## Task 6: Category CRUD

- Objective: support creating, listing, editing, and removing categories while
  keeping them distinct from accounts.
- Affected files: category modules, routes, views/components, and test files.
- Risks: duplicating account CRUD logic instead of extracting shared structure,
  or allowing invalid removal when a category is already in use.
- Required tests: create/edit/remove flows, name validation, in-use deletion
  behavior, and shared-component coverage where applicable.
- Timebox: 1 to 2 hours.

## Task 7: Simple Two-Sided Transaction Entry

- Objective: collect date, title, payee, category, amount, source account, and
  destination account, then generate the two signed postings automatically.
- Affected files: transaction creation service, form UI, handlers/controllers,
  and integration tests.
- Risks: inverted signs, invalid source/destination handling, and UI rules
  leaking into domain logic.
- Required tests: simple expense creation, correct two-posting generation,
  invalid input rejection, and full transaction persistence.
- Timebox: up to 2 hours.

## Task 8: Ledger Views, Derived Balances, and Monthly Summary

- Objective: show transactions with basic filtering/sorting, compute account
  balances from postings, and generate the monthly expense summary by category
  and account.
- Affected files: read/query models, ledger/reporting views, and integration or
  acceptance tests.
- Risks: mixing adjustment/opening-balance entries into normal expense reports,
  inefficient queries, or incorrect expense semantics.
- Required tests: derived balances, monthly expense totals, category grouping,
  account grouping, and exclusion of opening balance/adjustment transactions
  from ordinary expense reports unless explicitly included.
- Timebox: up to 2 hours.

## Task 9: UX Polish and Hardening

- Objective: finish the slice with predictable row selection/editing, useful
  validation feedback, small refactors, and short supporting documentation.
- Affected files: table/list components, edit handlers, `AGENTS.md`,
  `README.md`.
- Risks: over-investing in polish before behavior is stable, or introducing
  regressions during late refactors.
- Required tests: regression coverage for the main flows, guided manual testing
  of the end-to-end slice, the single test command, and the default formatter
  for the chosen stack.
- Timebox: 1 to 2 hours.
