use rust_decimal::Decimal;
use thiserror::Error;
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, NumenError>;

#[derive(Debug, Error)]
pub enum NumenError {
    #[error("account `{0}` already exists")]
    AccountAlreadyExists(String),
    #[error("account `{0}` was not found")]
    AccountNotFound(String),
    #[error("category `{0}` was not found")]
    CategoryNotFound(String),
    #[error("budget for category `{0}` was not found")]
    BudgetNotFound(String),
    #[error("currency mismatch: expected `{expected}`, found `{found}`")]
    CurrencyMismatch { expected: String, found: String },
    #[error("transaction `{transaction}` is imbalanced by {difference} {currency}")]
    TransactionImbalance {
        transaction: Uuid,
        difference: Decimal,
        currency: String,
    },
    #[error("transaction `{transaction}` has postings with mixed currencies")]
    MixedCurrencies { transaction: Uuid },
    #[error("transaction `{transaction}` is invalid: {message}")]
    InvalidTransaction { transaction: Uuid, message: String },
    #[error("import error: {0}")]
    ImportError(String),
    #[error("failed to parse date `{date}`")]
    InvalidDate { date: String },
    #[error("unexpected error: {0}")]
    Other(String),
}

impl NumenError {
    pub(crate) fn invalid_transaction(transaction: Uuid, message: impl Into<String>) -> Self {
        Self::InvalidTransaction {
            transaction,
            message: message.into(),
        }
    }

    pub(crate) fn import_error(message: impl Into<String>) -> Self {
        Self::ImportError(message.into())
    }

    pub(crate) fn invalid_date(date: impl Into<String>) -> Self {
        Self::InvalidDate { date: date.into() }
    }

    pub fn transaction_imbalance(
        transaction: Uuid,
        difference: Decimal,
        currency: impl Into<String>,
    ) -> Self {
        Self::TransactionImbalance {
            transaction,
            difference,
            currency: currency.into(),
        }
    }

    pub fn mixed_currencies(transaction: Uuid) -> Self {
        Self::MixedCurrencies { transaction }
    }

    pub fn account_not_found(account: impl Into<String>) -> Self {
        Self::AccountNotFound(account.into())
    }

    pub fn account_exists(account: impl Into<String>) -> Self {
        Self::AccountAlreadyExists(account.into())
    }

    pub fn currency_mismatch(expected: impl Into<String>, found: impl Into<String>) -> Self {
        Self::CurrencyMismatch {
            expected: expected.into(),
            found: found.into(),
        }
    }

    pub fn category_not_found(category: impl Into<String>) -> Self {
        Self::CategoryNotFound(category.into())
    }

    pub fn budget_not_found(category: impl Into<String>) -> Self {
        Self::BudgetNotFound(category.into())
    }

    pub fn other(message: impl Into<String>) -> Self {
        Self::Other(message.into())
    }
}
