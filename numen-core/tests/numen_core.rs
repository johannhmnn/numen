use std::convert::TryInto;

use chrono::NaiveDate;
use numen_core::{
    Account, AccountType, Budget, Category, CategoryRule, CategoryRuleConfig, CsvImportConfig,
    CsvImporter, ImportDefaults, ImportRuleConfig, Money, Numen, Posting, Transaction,
    import::ColumnMapping,
};
use rust_decimal_macros::dec;

fn make_account(name: &str, r#type: AccountType) -> Account {
    Account::new(name, r#type).with_currency("BRL")
}

fn date(year: i32, month: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, day).expect("valid date")
}

#[test]
fn transaction_must_be_balanced() {
    let mut engine = Numen::new("BRL");
    engine
        .add_account(make_account("Assets:Cash", AccountType::Assets))
        .unwrap();
    engine
        .add_account(make_account("Expenses:Food", AccountType::Expenses))
        .unwrap();

    let postings = vec![
        Posting::new("Assets:Cash", Money::new(dec!(100), "BRL")),
        Posting::new("Expenses:Food", Money::new(dec!(-50), "BRL")),
    ];
    let tx = Transaction::new(date(2024, 1, 1), "Imbalanced", postings);

    assert!(engine.record_transaction(tx).is_err());
}

#[test]
fn category_rules_assign_postings() {
    let mut engine = Numen::new("BRL");
    engine
        .add_account(make_account("Assets:Bank", AccountType::Assets))
        .unwrap();
    engine
        .add_account(make_account("Expenses:Groceries", AccountType::Expenses))
        .unwrap();

    engine.add_category(Category::new("Groceries", AccountType::Expenses));
    let rule: CategoryRule = CategoryRuleConfig {
        category: "Groceries".to_string(),
        description_contains: Some("mercado".to_string()),
        description_regex: None,
        account: None,
    }
    .try_into()
    .unwrap();
    engine.set_category_rules(vec![rule]);

    let postings = vec![
        Posting::new("Assets:Bank", Money::new(dec!(-50), "BRL")),
        Posting::new("Expenses:Groceries", Money::new(dec!(50), "BRL")),
    ];
    let tx = Transaction::new(date(2024, 2, 1), "Mercado Central", postings);
    let id = tx.id;
    engine.record_transaction(tx).unwrap();

    let recorded = engine.transaction(&id).expect("transaction stored");
    let groceries_posting = recorded
        .postings
        .iter()
        .find(|posting| posting.account == "Expenses:Groceries")
        .expect("expense posting");

    assert_eq!(groceries_posting.category.as_deref(), Some("Groceries"));
}

#[test]
fn budget_overview_detects_over_budget() {
    let mut engine = Numen::new("BRL");
    engine
        .add_account(make_account("Assets:Bank", AccountType::Assets))
        .unwrap();
    engine
        .add_account(make_account("Expenses:Food", AccountType::Expenses))
        .unwrap();
    engine
        .add_account(make_account("Income:Salary", AccountType::Income))
        .unwrap();

    engine.add_category(Category::new("Food", AccountType::Expenses));
    engine
        .add_budget(Budget::new("Food", Money::new(dec!(5000), "BRL")))
        .unwrap();

    // income transactions for two months
    for month in 1..=2 {
        let postings = vec![
            Posting::new("Assets:Bank", Money::new(dec!(4000), "BRL")),
            Posting::new("Income:Salary", Money::new(dec!(-4000), "BRL")),
        ];
        let tx = Transaction::new(date(2024, month, 1), "Salary", postings);
        engine.record_transaction(tx).unwrap();
    }

    let overview = engine.budget_overview().unwrap();
    assert!(overview.is_over_budget);

    let allocation = overview
        .allocations
        .iter()
        .find(|allocation| allocation.category == "Food")
        .expect("allocation present");
    assert_eq!(allocation.limit.amount, dec!(5000));
    assert!(allocation.weight > dec!(0.9));
    assert!(overview.monthly_income.amount > dec!(0));
    assert!(overview.delta.amount < dec!(0));
}

#[test]
fn rolling_expense_metrics() {
    let mut engine = Numen::new("BRL");
    engine
        .add_account(make_account("Assets:Bank", AccountType::Assets))
        .unwrap();
    engine
        .add_account(make_account("Expenses:Daily", AccountType::Expenses))
        .unwrap();

    let expenses = [
        (date(2024, 1, 1), dec!(50)),
        (date(2024, 1, 5), dec!(25)),
        (date(2024, 1, 10), dec!(100)),
    ];

    for (date, amount) in expenses {
        let postings = vec![
            Posting::new("Assets:Bank", Money::new(-amount, "BRL")),
            Posting::new("Expenses:Daily", Money::new(amount, "BRL")),
        ];
        let tx = Transaction::new(date, "Purchase", postings);
        engine.record_transaction(tx).unwrap();
    }

    let sums = engine.rolling_expense_sum(7).unwrap();
    assert_eq!(sums.len(), 3);
    assert_eq!(sums[0].value.amount, dec!(50));
    assert_eq!(sums[1].value.amount, dec!(75));
    assert_eq!(sums[2].value.amount, dec!(125));

    let averages = engine.rolling_expense_average(7).unwrap();
    assert_eq!(averages.len(), 3);
    assert_eq!(averages[0].value.amount, dec!(50));
    assert_eq!(averages[1].value.amount.round_dp(2), dec!(15.00));
    assert_eq!(averages[2].value.amount.round_dp(2), dec!(20.83));
}

#[test]
fn csv_import_pipeline_creates_transactions() {
    let config = CsvImportConfig {
        columns: ColumnMapping {
            date: "Transaction Date".into(),
            description: "Description".into(),
            amount: "Amount".into(),
            transaction_type: Some("Type".into()),
            currency: None,
            counterparty_account: None,
            category: None,
        },
        defaults: ImportDefaults {
            asset_account: "Assets:Bank".into(),
            expense_account: Some("Expenses:Unknown".into()),
            income_account: Some("Income:Salary".into()),
            currency: Some("BRL".into()),
        },
        rules: vec![ImportRuleConfig {
            description_contains: Some("mercado".into()),
            description_regex: None,
            assign_account: Some("Expenses:Groceries".into()),
            assign_category: Some("groceries".into()),
        }],
        date_format: Some("%Y-%m-%d".into()),
    };

    let importer = CsvImporter::new(config).unwrap();
    let data = r#""Transaction Date","Description","Amount","Type"
"2024-01-01","Mercado Central","-50.00","debit"
"2024-01-03","Salary","5000.00","credit"
"#
    .as_bytes();

    let transactions = importer.import(data).unwrap();
    assert_eq!(transactions.len(), 2);

    let groceries = transactions
        .iter()
        .find(|tx| tx.description.contains("Mercado"))
        .expect("groceries transaction");
    let groceries_posting = groceries
        .postings
        .iter()
        .find(|posting| posting.account == "Expenses:Groceries")
        .expect("expense posting for groceries");
    assert_eq!(groceries_posting.category.as_deref(), Some("groceries"));

    let salary = transactions
        .iter()
        .find(|tx| tx.description == "Salary")
        .expect("salary transaction");
    let income_posting = salary
        .postings
        .iter()
        .find(|posting| posting.account == "Income:Salary")
        .expect("income posting");
    assert!(income_posting.amount.amount < dec!(0));
    assert_eq!(
        salary.metadata.get("Description").map(String::as_str),
        Some("Salary")
    );
}
