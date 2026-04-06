use std::str::FromStr;

use async_trait::async_trait;
use numen_core::{Account, AccountType, DomainError, Money, Posting, Transaction};
use rust_decimal::Decimal;
use sqlx::{
    Row, SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use thiserror::Error;
use time::{Date, macros::format_description};
use uuid::Uuid;

use crate::dto::account_type_label;

const DATE_FORMAT: &[time::format_description::FormatItem<'static>] =
    format_description!("[year]-[month]-[day]");

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("account `{0}` already exists")]
    DuplicateAccountName(String),
    #[error("account `{0}` was not found")]
    AccountNotFound(String),
    #[error(transparent)]
    Domain(#[from] DomainError),
    #[error("{0}")]
    InvalidStoredData(String),
    #[error(transparent)]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}

#[async_trait]
pub trait LedgerRepository: Send + Sync {
    async fn create_account(&self, account: &Account) -> Result<Account, RepositoryError>;
    async fn list_accounts(&self) -> Result<Vec<Account>, RepositoryError>;
    async fn create_transaction(&self, transaction: &Transaction) -> Result<(), RepositoryError>;
    async fn list_transactions(&self) -> Result<Vec<Transaction>, RepositoryError>;
    async fn account_balance(&self, account_name: &str) -> Result<Money, RepositoryError>;
}

#[derive(Debug, Clone)]
pub struct SqliteLedgerRepository {
    pool: SqlitePool,
}

impl SqliteLedgerRepository {
    pub async fn connect(database_url: &str) -> Result<Self, RepositoryError> {
        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;
        let repository = Self { pool };

        repository.migrate().await?;

        Ok(repository)
    }

    #[cfg(test)]
    pub async fn connect_in_memory() -> Result<Self, RepositoryError> {
        let options = SqliteConnectOptions::from_str("sqlite::memory:")?.foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;
        let repository = Self { pool };

        repository.migrate().await?;

        Ok(repository)
    }

    async fn migrate(&self) -> Result<(), RepositoryError> {
        MIGRATOR.run(&self.pool).await?;
        Ok(())
    }
}

#[async_trait]
impl LedgerRepository for SqliteLedgerRepository {
    async fn create_account(&self, account: &Account) -> Result<Account, RepositoryError> {
        let result = sqlx::query("INSERT INTO accounts (id, name, type) VALUES (?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind(account.name())
            .bind(account_type_label(account.account_type()))
            .execute(&self.pool)
            .await;

        match result {
            Ok(_) => Ok(account.clone()),
            Err(error) if is_unique_account_name_error(&error) => Err(
                RepositoryError::DuplicateAccountName(account.name().to_owned()),
            ),
            Err(error) => Err(RepositoryError::Database(error)),
        }
    }

    async fn list_accounts(&self) -> Result<Vec<Account>, RepositoryError> {
        let rows = sqlx::query("SELECT name, type FROM accounts ORDER BY name")
            .fetch_all(&self.pool)
            .await?;

        rows.into_iter()
            .map(|row| {
                let name: String = row.get("name");
                let account_type: String = row.get("type");
                let account_type = parse_account_type(&account_type)?;

                Account::new(name, account_type).map_err(RepositoryError::from)
            })
            .collect()
    }

    async fn create_transaction(&self, transaction: &Transaction) -> Result<(), RepositoryError> {
        let mut db_transaction = self.pool.begin().await?;
        let transaction_id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO transactions (id, date, title, payee, primary_category) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&transaction_id)
        .bind(format_date(transaction.date()))
        .bind(transaction.title())
        .bind(transaction.payee())
        .bind(transaction.primary_category())
        .execute(&mut *db_transaction)
        .await?;

        for (position, posting) in transaction.postings().iter().enumerate() {
            let account_id =
                sqlx::query_scalar::<_, String>("SELECT id FROM accounts WHERE name = ?")
                    .bind(posting.account())
                    .fetch_optional(&mut *db_transaction)
                    .await?
                    .ok_or_else(|| {
                        RepositoryError::AccountNotFound(posting.account().to_owned())
                    })?;

            sqlx::query(
                "INSERT INTO postings (transaction_id, position, account_id, amount) VALUES (?, ?, ?, ?)",
            )
            .bind(&transaction_id)
            .bind(position as i64)
            .bind(account_id)
            .bind(posting.amount().value().to_string())
            .execute(&mut *db_transaction)
            .await?;
        }

        for (position, tag) in transaction.tags().iter().enumerate() {
            sqlx::query(
                "INSERT INTO transaction_tags (transaction_id, position, tag) VALUES (?, ?, ?)",
            )
            .bind(&transaction_id)
            .bind(position as i64)
            .bind(tag)
            .execute(&mut *db_transaction)
            .await?;
        }

        db_transaction.commit().await?;

        Ok(())
    }

    async fn list_transactions(&self) -> Result<Vec<Transaction>, RepositoryError> {
        let rows = sqlx::query(
            "SELECT id, date, title, payee, primary_category
             FROM transactions
             ORDER BY date DESC, rowid DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        let mut transactions = Vec::with_capacity(rows.len());

        for row in rows {
            let transaction_id: String = row.get("id");
            let date: String = row.get("date");
            let title: String = row.get("title");
            let payee: Option<String> = row.get("payee");
            let primary_category: Option<String> = row.get("primary_category");
            let tags = sqlx::query(
                "SELECT tag FROM transaction_tags WHERE transaction_id = ? ORDER BY position",
            )
            .bind(&transaction_id)
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(|tag_row| tag_row.get("tag"))
            .collect::<Vec<String>>();
            let postings = sqlx::query(
                "SELECT accounts.name AS account_name, postings.amount AS amount
                 FROM postings
                 JOIN accounts ON accounts.id = postings.account_id
                 WHERE postings.transaction_id = ?
                 ORDER BY postings.position",
            )
            .bind(&transaction_id)
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(|posting_row| {
                let account_name: String = posting_row.get("account_name");
                let amount: String = posting_row.get("amount");
                let amount = parse_money(&amount)?;

                Posting::new(account_name, amount).map_err(RepositoryError::from)
            })
            .collect::<Result<Vec<_>, _>>()?;
            let date = Date::parse(&date, DATE_FORMAT)
                .map_err(|error| RepositoryError::InvalidStoredData(error.to_string()))?;

            transactions.push(Transaction::new(
                Some(date),
                title,
                payee,
                primary_category,
                tags,
                postings,
            )?);
        }

        Ok(transactions)
    }

    async fn account_balance(&self, account_name: &str) -> Result<Money, RepositoryError> {
        let exists = sqlx::query_scalar::<_, String>("SELECT id FROM accounts WHERE name = ?")
            .bind(account_name)
            .fetch_optional(&self.pool)
            .await?;

        if exists.is_none() {
            return Err(RepositoryError::AccountNotFound(account_name.to_owned()));
        }

        let rows = sqlx::query(
            "SELECT postings.amount AS amount
             FROM postings
             JOIN accounts ON accounts.id = postings.account_id
             WHERE accounts.name = ?",
        )
        .bind(account_name)
        .fetch_all(&self.pool)
        .await?;
        let mut total = Money::zero();

        for row in rows {
            let amount: String = row.get("amount");
            total += parse_money(&amount)?;
        }

        Ok(total)
    }
}

fn format_date(date: Date) -> String {
    date.format(DATE_FORMAT)
        .expect("ISO date formatting should always succeed")
}

fn parse_account_type(value: &str) -> Result<AccountType, RepositoryError> {
    match value {
        "Assets" => Ok(AccountType::Assets),
        "Liabilities" => Ok(AccountType::Liabilities),
        "Equity" => Ok(AccountType::Equity),
        "Income" => Ok(AccountType::Income),
        "Expenses" => Ok(AccountType::Expenses),
        _ => Err(RepositoryError::InvalidStoredData(format!(
            "unsupported stored account type `{value}`"
        ))),
    }
}

fn parse_money(value: &str) -> Result<Money, RepositoryError> {
    Decimal::from_str(value)
        .map(Money::new)
        .map_err(|error| RepositoryError::InvalidStoredData(error.to_string()))
}

fn is_unique_account_name_error(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .is_some_and(|database_error| database_error.is_unique_violation())
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;
    use time::macros::date;

    use super::{LedgerRepository, RepositoryError, SqliteLedgerRepository};
    use numen_core::{Account, AccountType, Money, Posting, Transaction};

    #[tokio::test]
    async fn repository_round_trips_accounts() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        let account = Account::new("  Assets:Checking  ", AccountType::Assets).expect("account");

        repository
            .create_account(&account)
            .await
            .expect("create account");

        let accounts = repository.list_accounts().await.expect("list accounts");

        assert_eq!(
            accounts,
            vec![Account::new("Assets:Checking", AccountType::Assets).expect("account")]
        );
    }

    #[tokio::test]
    async fn repository_round_trips_transactions() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        seed_accounts(&repository).await;
        let transaction = sample_transaction();

        repository
            .create_transaction(&transaction)
            .await
            .expect("create transaction");

        let transactions = repository
            .list_transactions()
            .await
            .expect("list transactions");

        assert_eq!(transactions, vec![transaction]);
    }

    #[tokio::test]
    async fn list_transactions_returns_newest_first() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        seed_accounts(&repository).await;
        let older = sample_transaction();
        let newer = Transaction::new(
            Some(date!(2026 - 03 - 26)),
            "Dinner",
            Some("Bistro".to_owned()),
            Some("Dining".to_owned()),
            vec!["evening".to_owned()],
            vec![
                Posting::new("Assets:Checking", Money::new(Decimal::new(-4200, 2)))
                    .expect("posting"),
                Posting::new("Expenses:Groceries", Money::new(Decimal::new(4200, 2)))
                    .expect("posting"),
            ],
        )
        .expect("transaction");

        repository
            .create_transaction(&older)
            .await
            .expect("older transaction");
        repository
            .create_transaction(&newer)
            .await
            .expect("newer transaction");

        let transactions = repository
            .list_transactions()
            .await
            .expect("list transactions");

        assert_eq!(transactions, vec![newer, older]);
    }

    #[tokio::test]
    async fn list_transactions_keeps_same_day_insertion_order_newest_first() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        seed_accounts(&repository).await;
        let older = sample_transaction();
        let newer = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Dinner",
            Some("Bistro".to_owned()),
            Some("Dining".to_owned()),
            vec!["evening".to_owned()],
            vec![
                Posting::new("Assets:Checking", Money::new(Decimal::new(-4200, 2)))
                    .expect("posting"),
                Posting::new("Expenses:Groceries", Money::new(Decimal::new(4200, 2)))
                    .expect("posting"),
            ],
        )
        .expect("transaction");

        repository
            .create_transaction(&older)
            .await
            .expect("older transaction");
        repository
            .create_transaction(&newer)
            .await
            .expect("newer transaction");

        let transactions = repository
            .list_transactions()
            .await
            .expect("list transactions");

        assert_eq!(transactions, vec![newer, older]);
    }

    #[tokio::test]
    async fn account_balances_remain_correct_after_multiple_transactions() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        seed_accounts(&repository).await;

        repository
            .create_transaction(&sample_transaction())
            .await
            .expect("first transaction");
        repository
            .create_transaction(
                &Transaction::new(
                    Some(date!(2026 - 03 - 26)),
                    "Coffee",
                    Some("Cafe".to_owned()),
                    Some("Coffee".to_owned()),
                    vec!["weekday".to_owned()],
                    vec![
                        Posting::new("Assets:Checking", Money::new(Decimal::new(-450, 2)))
                            .expect("posting"),
                        Posting::new("Expenses:Groceries", Money::new(Decimal::new(450, 2)))
                            .expect("posting"),
                    ],
                )
                .expect("transaction"),
            )
            .await
            .expect("second transaction");

        let checking = repository
            .account_balance("Assets:Checking")
            .await
            .expect("checking balance");
        let groceries = repository
            .account_balance("Expenses:Groceries")
            .await
            .expect("groceries balance");

        assert_eq!(checking, Money::new(Decimal::new(-1700, 2)));
        assert_eq!(groceries, Money::new(Decimal::new(1700, 2)));
    }

    #[tokio::test]
    async fn transaction_write_fails_when_posting_account_is_missing() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        repository
            .create_account(&Account::new("Assets:Checking", AccountType::Assets).expect("account"))
            .await
            .expect("create account");

        let error = repository
            .create_transaction(&sample_transaction())
            .await
            .expect_err("missing expense account should fail");

        assert!(matches!(
            error,
            RepositoryError::AccountNotFound(name) if name == "Expenses:Groceries"
        ));
    }

    #[tokio::test]
    async fn duplicate_account_names_are_rejected() {
        let repository = SqliteLedgerRepository::connect_in_memory()
            .await
            .expect("repository");
        let account = Account::new("Assets:Checking", AccountType::Assets).expect("account");

        repository
            .create_account(&account)
            .await
            .expect("first create");
        let error = repository
            .create_account(&account)
            .await
            .expect_err("duplicate name rejected");

        assert!(matches!(
            error,
            RepositoryError::DuplicateAccountName(name) if name == "Assets:Checking"
        ));
    }

    async fn seed_accounts(repository: &SqliteLedgerRepository) {
        for account in [
            Account::new("Assets:Checking", AccountType::Assets).expect("account"),
            Account::new("Expenses:Groceries", AccountType::Expenses).expect("account"),
        ] {
            repository
                .create_account(&account)
                .await
                .expect("seed account");
        }
    }

    fn sample_transaction() -> Transaction {
        Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Groceries",
            Some("Market".to_owned()),
            Some("Groceries".to_owned()),
            vec!["food".to_owned(), "home".to_owned()],
            vec![
                Posting::new("Assets:Checking", Money::new(Decimal::new(-1250, 2)))
                    .expect("posting"),
                Posting::new("Expenses:Groceries", Money::new(Decimal::new(1250, 2)))
                    .expect("posting"),
            ],
        )
        .expect("transaction")
    }
}
