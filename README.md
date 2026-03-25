# Numen Engine

`numen-core` is the accounting engine for Numen. It provides the truth layer that powers CLI, REPL, and web interfaces without forcing a DSL such as Beancount. The crate exposes the fundamental bookkeeping concepts (accounts, postings, transactions) together with analytics, categorisation, and budgeting primitives that the higher-level apps can compose.

## Highlights

- **Double-entry enforcement** – every recorded transaction must balance, with validations for missing accounts and currency mismatches.
- **Account model** – supports the classic Assets, Liabilities, Expenses, Income, and Equity account types with optional hierarchy metadata.
- **Automatic categorisation** – configure substring or regex-based rules that tag expense and income postings; supports manual overrides per posting and integrates with budgets.
- **Budget tracking** – monthly budgets per category, aggregated status reports, and an overview that compares allocation totals with the inferred monthly income baseline.
- **Time-series analytics** – rolling sums and averages of expenses, expense breakdowns by category, and flexible account aggregations at daily, weekly, monthly, or yearly granularity.
- **Recurring transaction insights** – detection utilities that flag recurring series and helper methods to tag the associated transactions.
- **CSV import pipeline** – declarative column mapping, rule-based account/category routing, configurable date formats, and metadata capture for downstream interfaces.

## Crate Layout

```
numen-core/
  src/
    account.rs     # account types and metadata
    money.rs       # decimal amounts + helpers
    transaction.rs # postings and transaction validation
    numen.rs       # main engine, analytics, budgets, recurring detection
    category.rs    # category definitions and rules
    budget.rs      # budgets, allocations, overview structs
    import.rs      # CSV importer plumbing
    error.rs       # error types
    lib.rs         # public surface (re-exports)
  tests/
    numen_core.rs  # integration scenarios covering the main features
```

## Quick Start

Add accounts, categories, and budgets, then record balanced transactions:

```rust
use chrono::NaiveDate;
use numen_core::{Account, AccountType, Money, Numen, Posting, Transaction};
use rust_decimal_macros::dec;

let mut engine = Numen::new("USD");
engine
    .add_account(Account::new("Assets:Bank", AccountType::Assets).with_currency("USD"))
    .unwrap();
engine
    .add_account(Account::new("Expenses:Food", AccountType::Expenses).with_currency("USD"))
    .unwrap();

let postings = vec![
    Posting::new("Assets:Bank", Money::new(dec!(-42.50), "USD")),
    Posting::new("Expenses:Food", Money::new(dec!(42.50), "USD")),
];
let tx = Transaction::new(NaiveDate::from_ymd_opt(2024, 4, 1).unwrap(), "Groceries", postings);
engine.record_transaction(tx).unwrap();
```

Run the test suite to see end-to-end usage of budgets, analytics, and imports:

```
cargo test
```

## CSV Imports

Create a `CsvImportConfig` that maps column names to transaction fields, specifies defaults (asset/expense/income accounts, currency), and attaches optional rules. Rules can route postings to specific accounts and categories using substring or regex matching. The importer returns fully balanced `Transaction` structs that can be fed directly into the Numen engine.

## Extending the Engine

The next milestones are:

1. Wrap the engine in a persistent repository (SQLite or DuckDB) for historical storage.
2. Expose a service layer (axum/Tauri) that powers a Svelte or React front-end with the existing analytics.
3. Build CLI and REPL shells on top of `numen-core` to cover import, query, and budgeting workflows.

The current implementation is intentionally modular: interfaces can share the same validation logic, categorisation rules, and analytics without duplicating financial calculations.
