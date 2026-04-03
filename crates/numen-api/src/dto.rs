use std::str::FromStr;

use numen_core::{Account, AccountType, Money, Posting, Transaction};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{Date, macros::format_description};

use crate::error::ApiError;

const DATE_FORMAT: &[time::format_description::FormatItem<'static>] =
    format_description!("[year]-[month]-[day]");

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
}

impl CreateAccountRequest {
    pub fn into_domain(self) -> Result<Account, ApiError> {
        let account_type = parse_account_type(&self.account_type)?;

        Account::new(self.name, account_type).map_err(ApiError::from)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AccountResponse {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
}

impl From<Account> for AccountResponse {
    fn from(account: Account) -> Self {
        Self {
            name: account.name().to_owned(),
            account_type: account_type_label(account.account_type()).to_owned(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PostingResponse {
    pub account: String,
    pub amount: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TransactionResponse {
    pub date: String,
    pub title: String,
    pub payee: Option<String>,
    pub primary_category: Option<String>,
    pub tags: Vec<String>,
    pub postings: Vec<PostingResponse>,
}

impl From<Transaction> for TransactionResponse {
    fn from(transaction: Transaction) -> Self {
        Self {
            date: transaction
                .date()
                .format(DATE_FORMAT)
                .expect("ISO date formatting should always succeed"),
            title: transaction.title().to_owned(),
            payee: transaction.payee().map(str::to_owned),
            primary_category: transaction.primary_category().map(str::to_owned),
            tags: transaction.tags().to_vec(),
            postings: transaction
                .postings()
                .iter()
                .map(|posting| PostingResponse {
                    account: posting.account().to_owned(),
                    amount: posting.amount().value().to_string(),
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct CreatePostingRequest {
    pub account: String,
    pub amount: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct CreateTransactionRequest {
    pub date: String,
    pub title: String,
    pub payee: Option<String>,
    pub primary_category: Option<String>,
    pub tags: Vec<String>,
    pub postings: Vec<CreatePostingRequest>,
}

impl CreateTransactionRequest {
    pub fn into_domain(self) -> Result<Transaction, ApiError> {
        let date = Date::parse(&self.date, DATE_FORMAT)
            .map_err(|_| ApiError::BadRequest("date must use YYYY-MM-DD".to_owned()))?;
        let postings = self
            .postings
            .into_iter()
            .map(|posting| posting.into_domain())
            .collect::<Result<Vec<_>, _>>()?;

        Transaction::new(
            Some(date),
            self.title,
            self.payee,
            self.primary_category,
            self.tags,
            postings,
        )
        .map_err(ApiError::from)
    }
}

impl CreatePostingRequest {
    fn into_domain(self) -> Result<Posting, ApiError> {
        let amount = Decimal::from_str(&self.amount)
            .map(Money::new)
            .map_err(|_| {
                ApiError::BadRequest("posting amount must be a valid decimal".to_owned())
            })?;

        Posting::new(self.account, amount).map_err(ApiError::from)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct BalanceResponse {
    pub account: String,
    pub balance: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct StatusResponse {
    pub status: &'static str,
}

pub(crate) fn parse_account_type(input: &str) -> Result<AccountType, ApiError> {
    match input {
        "Assets" => Ok(AccountType::Assets),
        "Liabilities" => Ok(AccountType::Liabilities),
        "Equity" => Ok(AccountType::Equity),
        "Income" => Ok(AccountType::Income),
        "Expenses" => Ok(AccountType::Expenses),
        _ => Err(ApiError::BadRequest(format!(
            "account type must be one of Assets, Liabilities, Equity, Income, Expenses; got `{input}`"
        ))),
    }
}

pub(crate) fn account_type_label(account_type: AccountType) -> &'static str {
    match account_type {
        AccountType::Assets => "Assets",
        AccountType::Liabilities => "Liabilities",
        AccountType::Equity => "Equity",
        AccountType::Income => "Income",
        AccountType::Expenses => "Expenses",
    }
}
