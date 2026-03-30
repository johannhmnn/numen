# Numen

Numen is a local-first personal-finance app built around double-entry bookkeeping. This repository currently contains the Feature 0 foundation: a Rust workspace, a local HTTP API shell, a SvelteKit frontend scaffold, and committed Woodpecker CI coverage for Rust, frontend checks, and one Playwright smoke test.

## Prerequisites

- Rust toolchain with `rustfmt`, `clippy`, and `cargo-nextest`
- `pnpm`
- `just`
- Playwright browsers:
  - `pnpm --dir apps/web exec playwright install`

## Workspace Layout

- `crates/numen-core`: pure Rust domain crate
- `crates/numen-api`: local Rust HTTP API
- `apps/web`: SvelteKit frontend

## Commands

- `just dev-api`: start the local Rust API on `127.0.0.1:3000`
- `just dev-web`: start the SvelteKit frontend on `127.0.0.1:5173`
- `just test-rust`: run Rust unit and integration tests with `cargo nextest run --workspace`
- `just test-web`: run frontend unit/component tests
- `just test-e2e`: run Playwright smoke tests
- `just lint`: run Rust and frontend linting checks
- `just check`: run the core non-E2E verification suite
- `just ci`: run formatting, linting, unit/integration checks, and E2E tests

## CI

Woodpecker workflows live under `.woodpecker/`:

- `rust.yaml`: installs `cargo-nextest` from the official `0.9` release-series installer and runs `fmt`, `clippy`, and `nextest`
- `web.yaml`: runs frontend type checks, linting, and Vitest component coverage
- `e2e.yaml`: runs the Playwright smoke test in the official Playwright container

Local verification uses `just`; Woodpecker runs the equivalent commands inline in each workflow.
