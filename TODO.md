# TODO

- [ ] Persistence layer:
  - [ ] Choose backend (SQLite via `sqlx` preferred for portability; DuckDB acceptable for analytics workloads).
  - [ ] Define schema: accounts (name, type, parent, currency, description), categories (name, type, parent, color), category_rules (id, category, account?, contains?, regex?), budgets (category, monthly_limit, currency), transactions (id, date, description, recurring, metadata JSON), postings (tx_id, account, amount, currency, category?, tags, memo).
  - [ ] Add migrations (sqlx/migrate) and a `Repository` abstraction with methods mirroring `Numen` (add_account, add_category, add_budget, record_transaction, list_transactions, balances, budgets_status, etc.).
  - [ ] Implement serde helpers to persist/reload metadata, tags, and Money (Decimal + currency).
  - [ ] Wire `Numen` to load/save from repo, ensuring transactional writes for recording transactions and imports.
  - [ ] Provide import/export commands: dump to JSON/CSV; restore into a fresh database; handle idempotent re-import (dedupe by tx id/hash).
  - [ ] Add integration tests hitting an in-memory SQLite/DuckDB database covering migrations, read/write symmetry, and double-entry invariants at the DB level.
- [ ] Service/API surface: expose `Numen` via Axum/Tauri commands for imports, manual txs, balances/analytics, budgets, recurring detection; consider basic auth if needed.
- [ ] CLI + REPL: create `numen-cli` with commands (`accounts add/list`, `tx add/import`, `balance`, `expenses --period`, `budgets set/status`, `recurring detect/mark`) and an interactive shell.
- [ ] UI/Charts: build `numen-ui` (Svelte/React) consuming the API for dashboards (rolling sum/avg, weekly/monthly/yearly charts, pie by category, budget utilization, recurring flags).
- [ ] Rules & budgets UX: CRUD for category rules and budgets, validate overlaps/rollovers, and surface “over budget vs income” alerts.
- [ ] Imports polish: per-bank mapping presets, rule-testing dry runs, duplicate detection on re-imports.
- [ ] Testing & QA: expand integration tests for persistence/API/CSV edge cases, property-test balance invariants, snapshot analytics outputs.

