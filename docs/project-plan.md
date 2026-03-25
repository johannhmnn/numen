# Numen Project Plan

## Product Summary

Numen is a single-user personal-finance application built around double-entry bookkeeping. The first milestone focuses on a rigorous ledger core, structured transaction entry, early CSV import for bank and credit-card history, and dated balance snapshots that reconcile the ledger to a known real-world account balance even when older history is missing.

## Product Decisions

- Use classic account types: `Assets`, `Liabilities`, `Equity`, `Income`, `Expenses`.
- Treat account balances as derived from postings, never manually edited.
- Start with flat accounts in v1 and keep the model extensible for hierarchy later.
- Account fields for v1: `name`, `type`.
- Transaction fields for v1: `date`, `title`, `payee`, `primary_category`, `tags`, `postings`.
- Posting fields for v1: `account`, `amount`.
- Optimize the UX for the common case: one funding account, one payee, one primary category, one amount.
- Keep the ledger capable of handling two or more postings per transaction.
- Use structured transaction entry, not natural-language parsing.
- Use a single ledger currency in v1.
- Support dated balance snapshots per account and create explicit balancing transactions against `Equity:HistoricalAdjustment` when imported history does not reconcile to the known balance.
- Reporting for v1 includes:
  - transactions filtered by category
  - expense pie chart by category
  - expense trends by `daily`, `weekly`, and `monthly`
  - account-focused spending breakdowns by `category` and `payee`

## Tech Stack Decisions

- Core language: `Rust`
- UI: `SvelteKit` with strict `TypeScript`
- App shape: local-first web app with a browser UI backed by a local Rust process
- Frontend runtime: static SPA build
- UI/backend boundary: local `HTTP/JSON` API
- Local persistence: `SQLite`
- Acceptance strategy: domain tests + API tests + one representative E2E browser flow per feature

## Planned Architecture

- `crates/numen-core`
  - bookkeeping domain model
  - import/reconciliation logic
  - reporting calculations
- `crates/numen-api`
  - local HTTP server
  - persistence and migrations
  - static asset serving for the built frontend
- `apps/web`
  - SvelteKit SPA for data entry, import, balances, and charts

## Selected Libraries

- Backend:
  - `axum`
  - `serde`
  - `sqlx` with `SQLite`
  - `rust_decimal`
  - `uuid`
  - `time`
  - `csv`
  - `thiserror`
  - `tower-http`
- Frontend:
  - `SvelteKit`
  - `Vite`
  - `zod`
  - `Apache ECharts`

## Public Interfaces

- `Account`
  - `name`
  - `type`
- `Posting`
  - `account`
  - `amount`
- `Transaction`
  - `date`
  - `title`
  - `payee`
  - `primary_category`
  - `tags`
  - `postings`
- `BalanceSnapshot`
  - `account`
  - `date`
  - `actual_balance`

## Reconciliation Flow

1. Import or enter known transactions for an account.
2. Declare a dated real-world balance snapshot for that account.
3. Compute the ledger balance at that date.
4. If there is a gap, create one balanced adjustment transaction against `Equity:HistoricalAdjustment`.

## Testing And CI

- Rust domain tests for invariants and accounting behavior
- Rust API integration tests against HTTP endpoints and SQLite
- Frontend tests with `Vitest` and `@testing-library/svelte`
- Browser acceptance tests with `Playwright`
- CI checks:
  - `cargo nextest run --workspace`
  - `cargo fmt --check`
  - `cargo clippy --workspace --all-targets -- -D warnings`
  - `pnpm test`
  - `pnpm test:e2e`

## Assumptions

- Single-user only in v1
- Offline/local-first behavior is more important than sync
- Multi-currency and FX are out of scope for the first slice
- Desktop packaging is deferred, but the stack should keep a clean Tauri path later
