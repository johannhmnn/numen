# AGENTS.md

## Project Identity

Numen is a local-first personal-finance application built on double-entry bookkeeping. The product is single-user in v1 and prioritizes domain correctness, simple workflows, and incremental delivery.

The repository is still at Feature 0 foundation. The current codebase is a scaffold, not a working ledger:

- `crates/numen-core` contains placeholder readiness code only
- `crates/numen-api` serves a minimal `GET /health` endpoint
- `apps/web` is a static SvelteKit shell with one component test and one Playwright smoke test
- SQLite, ledger primitives, transaction entry, reconciliation, import, and reporting are planned but not implemented here yet

## Working Agreements

- Follow XP practices: TDD, small releases, continuous refactoring, pair-programming mindset.
- Implement one vertical slice at a time. Finish the slice in code, tests, and docs before starting the next.
- Earn behavior with tests before or alongside implementation. Do not add speculative abstractions for future roadmap items.
- Prefer the simplest design that supports the current slice. Refactor when duplication becomes real, not anticipated.
- Keep changes local and incremental. Avoid repo-wide rewrites when a focused patch is enough.

## Testing guidelines

- Follow test-driven development by default.
- Start with a failing test that describes the next behavior change.
- Implement the smallest change that makes the test pass.
- Use the repository's existing test and coverage tooling to keep feedback tight and coverage visible.
- When fixing a bug, add or extend a regression test that fails before the fix and passes after it.
- Do not ship production behavior without automated coverage proving it.
- If a change is hard to test, pause and discuss refactoring options with your collaborator before adding indirection, broad mocks, or untestable code paths.

## Core Product Decisions

- Account types: `Assets`, `Liabilities`, `Equity`, `Income`, `Expenses`
- V1 account fields: `name`, `type`
- V1 transaction fields: `date`, `title`, `payee`, `primary_category`, `tags`, `postings`
- V1 posting fields: `account`, `amount`
- Balances are derived from postings, never entered directly
- Transaction entry is structured, not natural-language based
- Single currency only in v1
- Balance reconciliation uses dated snapshots plus explicit adjustment transactions against `Equity:HistoricalAdjustment`
- Flat accounts in v1. Do not add account hierarchy yet.
- The common transaction-entry path should stay optimized for one funding account, one payee, one primary category, and one amount, while still allowing balanced multi-posting transactions in the model.
- V1 reporting:
  - transactions by category
  - expense pie chart by category
  - expense trends by `daily`, `weekly`, `monthly`
  - account-focused breakdowns by `category` and `payee`

## Current Stack

- Rust workspace with edition `2024`
- `axum` for the local HTTP API
- `tokio` runtime
- `tower-http` for HTTP middleware and static-asset support when needed
- SvelteKit 2 + Svelte 5 runes + strict TypeScript frontend
- Vite for frontend dev/build
- `pnpm` workspace package manager
- ESLint + Prettier for frontend formatting/linting
- Vitest with browser mode for component tests
- Playwright for browser smoke coverage
- Static SPA frontend via `@sveltejs/adapter-static`
- Local HTTP/JSON boundary between frontend and backend

Use the tools already present before adding new ones. Prefer standard-library and framework capabilities over new dependencies.

## Current Workflow

Run commands from the repository root unless a file says otherwise.

- `just dev-api`
- `just dev-web`
- `just test-rust`
- `just test-web`
- `just test-e2e`
- `just lint`
- `just check`
- `just install-playwright`

Equivalent direct commands that exist today:

- `cargo nextest run --workspace`
- `cargo test --workspace`
- `cargo fmt --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `pnpm --dir apps/web check`
- `pnpm --dir apps/web lint`
- `pnpm --dir apps/web test:unit -- --run`
- `pnpm --dir apps/web test:e2e`

Browser-backed frontend tests may fail in restricted sandboxes even when the project is correct. Do not delete or weaken browser coverage to satisfy a sandbox limitation. Note the environment constraint instead.

## Engineering Conventions

- Money must use decimal types, never floats
- Keep the domain crate isolated from HTTP, database, and UI concerns
- Prefer explicit domain types and constructors for validation
- Make balancing and reconciliation logic auditable, never hidden
- Keep import logic deterministic and well covered with fixtures
- Favor readable APIs over clever abstractions
- Keep `numen-core` dependency-light and pure. Do not pull web, database, or UI concerns into it.
- Keep `numen-api` thin. It should orchestrate HTTP, persistence, and static asset serving around the core domain rather than reimplement domain rules.
- Keep the frontend honest about backend state. Do not fake completed product capabilities in the UI.
- Match the existing SvelteKit setup:
  - use runes mode
  - use strict TypeScript
  - keep routes prerenderable unless the feature requires otherwise
- Prefer plain SvelteKit, Svelte, and browser APIs before adding state-management, form, charting, or data-fetching libraries.
- Do not add a database layer, ORM, event bus, plugin system, background job system, or generic repository abstraction before the roadmap slice requires it.
- Do not add desktop packaging, sync, auth, multi-user flows, or cloud dependencies in v1 work.

## Testing Conventions

- Rust:
  - unit tests for invariants and domain rules
  - integration tests for API and persistence behavior
- Frontend:
  - component tests with Vitest browser mode and Testing Library
  - Playwright for one representative acceptance flow per feature
- The current committed baseline is smaller:
  - `numen-core` has a placeholder unit test
  - `numen-api` has a `/health` endpoint test
  - `apps/web` has one component spec and one Playwright smoke test
- Extend tests with each slice. Do not land new behavior without the narrowest useful automated coverage around it.
- Keep fixtures deterministic and small.
- Prefer domain tests first, API tests second, UI tests last.

## Current Repository Reality

- Package manager: `pnpm`
- Root task runner: `just`
- No committed CI workflow files yet
- No committed deployment config beyond the static SvelteKit adapter
- No SQLite schema, migrations, or persistence code committed yet
- No ledger model, reporting engine, CSV import pipeline, or reconciliation flow committed yet

Do not write instructions that assume those pieces already exist. Build them slice by slice.

## Anti-Goals

- Do not implement deferred roadmap items early.
- Do not add natural-language transaction entry.
- Do not add multi-currency, FX, account hierarchy, sync, multi-user behavior, or Tauri packaging in v1.
- Do not add dependencies to save a few lines of code.
- Do not replace explicit domain rules with hidden magic, code generation, or macro-heavy indirection.
- Do not invent CI, deployment, or runtime guarantees that are not committed in the repo.

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

If behavior, commands, workflow, or product scope changes, update the relevant docs in the same change.
If a roadmap item becomes implemented or a listed assumption stops being true, update `AGENTS.md`, `docs/project-plan.md`, `docs/feature-roadmap.md`, and `README.md` together.

## Summary

- Stale: stack and testing language implied SQLite, reporting, import, reconciliation, CI, and broader backend/frontend coverage that are not committed yet.
- Added: current repo reality, verified commands, `just` workflow, Svelte 5 runes constraints, anti-overengineering rules, and documentation-update expectations.
- Removed or corrected: unconditional CI claim, overly advanced implementation assumptions, and generic guidance that did not match the present scaffold.
