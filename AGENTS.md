# AGENTS.md

## Project Identity

Numen is a local-first personal-finance application built on double-entry bookkeeping. The product is single-user in v1 and prioritizes domain correctness, simple workflows, and incremental delivery.

## Working Agreements

- Follow Extreme Programming principles:
  - TDD
  - small releases
  - continuous refactoring
  - continuous integration
  - pair-programming mindset in assistant responses
- Implement work feature by feature in vertical slices.
- Each feature must earn its behavior with tests before or alongside implementation.
- Prefer simple designs that can evolve cleanly over premature extensibility.

## Core Product Decisions

- Account types: `Assets`, `Liabilities`, `Equity`, `Income`, `Expenses`
- V1 account fields: `name`, `type`
- V1 transaction fields: `date`, `title`, `payee`, `primary_category`, `tags`, `postings`
- V1 posting fields: `account`, `amount`
- Balances are derived from postings, never entered directly
- Transaction entry is structured, not natural-language based
- Single currency only in v1
- Balance reconciliation uses dated snapshots plus explicit adjustment transactions against `Equity:HistoricalAdjustment`
- V1 reporting:
  - transactions by category
  - expense pie chart by category
  - expense trends by `daily`, `weekly`, `monthly`
  - account-focused breakdowns by `category` and `payee`

## Tech Stack Decisions

- Rust for the bookkeeping core and local backend
- SvelteKit with strict TypeScript for the frontend
- Local-first web app: browser UI + local Rust process
- Static SPA frontend
- Local HTTP/JSON API boundary
- SQLite persistence

## Engineering Conventions

- Money must use decimal types, never floats
- Keep the domain crate isolated from HTTP, database, and UI concerns
- Prefer explicit domain types and constructors for validation
- Make balancing and reconciliation logic auditable, never hidden
- Keep import logic deterministic and well covered with fixtures
- Favor readable APIs over clever abstractions

## Testing Conventions

- Rust:
  - unit tests for invariants and domain rules
  - integration tests for API and persistence behavior
- Frontend:
  - component tests with Vitest and Testing Library
  - Playwright for one representative acceptance flow per feature
- CI should run Rust checks, frontend tests, and E2E coverage

## Roadmap Reference

Current execution order:

1. Repo foundation
2. Ledger primitives and invariants
3. Ledger storage and balance queries
4. Structured transaction entry
5. Balance snapshots and historical adjustment
6. CSV import
7. Category reporting
8. Expense trends
9. Account-focused spending analysis
10. Hardening and first release candidate

Deferred after v1:

- split transactions
- account hierarchy
- multi-currency and FX
- sync or multi-user support
- desktop packaging with Tauri

## Session Memory

When resuming work in a later session, load these first:

- `docs/project-plan.md`
- `docs/feature-roadmap.md`
- `AGENTS.md`

If new decisions change product scope, update those documents before continuing implementation.
