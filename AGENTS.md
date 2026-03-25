# Repository Guidelines

## Project Structure & Module Organization
- `Cargo.toml` at the repo root defines the workspace with the `numen-core` crate.
- `numen-core/src/` contains the Rust source modules: `account.rs`, `budget.rs`, `category.rs`, `money.rs`, `numen.rs` (engine), `transaction.rs`, and `error.rs`.
- `numen-core/tests/numen_core.rs` holds integration tests that exercise the public API.
- `README.md` documents the engine capabilities; update it when adding end-user features.

## Build, Test, and Development Commands
- `cargo fmt` formats all Rust sources using rustfmt.
- `cargo check` performs a fast compile-time validation without producing binaries.
- `cargo test` runs unit and integration tests, including `tests/numen_core.rs`.
- Use `cargo doc --open` to review API documentation during development.

## Coding Style & Naming Conventions
- Follow Rust 2024 edition defaults; run `cargo fmt` before committing.
- Prefer expressive module and type names (`Numen`, `NumenError`, `BudgetOverview`) aligned with accounting terminology.
- Keep code comments focused on intent for complex logic (e.g., recurring detection heuristics).
- New modules should live under `numen-core/src/` and be re-exported via `lib.rs` when part of the public API.

## Testing Guidelines
- Integration tests belong in `numen-core/tests/`; name files after the scenarios they cover (e.g., `analytics.rs` if added).
- Use `cargo test -- --nocapture` when debugging to see printed output.
- When introducing new analytics or import logic, add assertions to existing tests or create focused suites mirroring real ledger flows.

## Commit & Pull Request Guidelines
- Write commits in the present tense with concise scope descriptions (e.g., `Add budget overview weights`).
- Group related changes (logic + tests + docs) in the same commit where practical.
- Pull requests should summarize the feature/fix, list impacted modules, mention testing performed (`cargo test`), and link relevant issues or specs.

## Security & Configuration Tips
- Do not commit real financial data; use anonymized fixtures when expanding tests.
- Keep dependencies updated via `cargo update -p <crate>` as new security advisories appear.
