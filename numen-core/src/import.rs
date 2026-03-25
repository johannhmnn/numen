use std::collections::HashMap;
use std::io::Read;
use std::str::FromStr;

use chrono::NaiveDate;
use csv::StringRecord;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    error::{NumenError, Result},
    money::Money,
    transaction::{Posting, Transaction},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvImportConfig {
    pub columns: ColumnMapping,
    #[serde(default)]
    pub defaults: ImportDefaults,
    #[serde(default)]
    pub rules: Vec<ImportRuleConfig>,
    #[serde(default)]
    pub date_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnMapping {
    pub date: String,
    pub description: String,
    pub amount: String,
    #[serde(default)]
    pub transaction_type: Option<String>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub counterparty_account: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImportDefaults {
    pub asset_account: String,
    #[serde(default)]
    pub expense_account: Option<String>,
    #[serde(default)]
    pub income_account: Option<String>,
    #[serde(default)]
    pub currency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRuleConfig {
    #[serde(default)]
    pub description_contains: Option<String>,
    #[serde(default)]
    pub description_regex: Option<String>,
    #[serde(default)]
    pub assign_account: Option<String>,
    #[serde(default)]
    pub assign_category: Option<String>,
}

#[derive(Debug)]
struct ImportRule {
    description_contains: Option<String>,
    description_regex: Option<Regex>,
    assign_account: Option<String>,
    assign_category: Option<String>,
}

impl ImportRule {
    fn matches(&self, description: &str) -> bool {
        if let Some(ref needle) = self.description_contains {
            if !description
                .to_ascii_lowercase()
                .contains(&needle.to_ascii_lowercase())
            {
                return false;
            }
        }

        if let Some(ref regex) = self.description_regex {
            if !regex.is_match(description) {
                return false;
            }
        }

        true
    }
}

pub struct CsvImporter {
    config: CsvImportConfig,
    rules: Vec<ImportRule>,
}

impl CsvImporter {
    pub fn new(config: CsvImportConfig) -> Result<Self> {
        if config.defaults.asset_account.trim().is_empty() {
            return Err(NumenError::import_error(
                "defaults.asset_account must be provided",
            ));
        }

        let mut rules = Vec::with_capacity(config.rules.len());
        for rule_config in &config.rules {
            let regex = if let Some(ref pattern) = rule_config.description_regex {
                Some(Regex::new(pattern).map_err(|err| {
                    NumenError::import_error(format!("invalid regex `{pattern}`: {err}"))
                })?)
            } else {
                None
            };

            rules.push(ImportRule {
                description_contains: rule_config.description_contains.clone(),
                description_regex: regex,
                assign_account: rule_config.assign_account.clone(),
                assign_category: rule_config.assign_category.clone(),
            });
        }

        Ok(Self { config, rules })
    }

    pub fn import<R: Read>(&self, reader: R) -> Result<Vec<Transaction>> {
        let mut csv_reader = csv::ReaderBuilder::new()
            .trim(csv::Trim::All)
            .from_reader(reader);

        let headers = csv_reader
            .headers()
            .map_err(|err| NumenError::import_error(format!("failed to read headers: {err}")))?
            .clone();

        let header_map: HashMap<String, usize> = headers
            .iter()
            .enumerate()
            .map(|(idx, header)| (header.to_string(), idx))
            .collect();

        let mut transactions = Vec::new();

        for record in csv_reader.records() {
            let record = record
                .map_err(|err| NumenError::import_error(format!("failed to read record: {err}")))?;

            let transaction = self.record_to_transaction(&header_map, &headers, &record)?;

            transactions.push(transaction);
        }

        Ok(transactions)
    }

    fn record_to_transaction(
        &self,
        header_map: &HashMap<String, usize>,
        headers: &StringRecord,
        record: &StringRecord,
    ) -> Result<Transaction> {
        let date_raw = self.value_for(&self.config.columns.date, header_map, record)?;
        let date = self
            .parse_date(date_raw)
            .ok_or_else(|| NumenError::invalid_date(date_raw))?;

        let description = self
            .value_for(&self.config.columns.description, header_map, record)?
            .to_string();

        let amount_raw = self.value_for(&self.config.columns.amount, header_map, record)?;
        let mut amount = parse_decimal(amount_raw)?;

        if let Some(ref ty_column) = self.config.columns.transaction_type {
            let kind = self.value_for(ty_column, header_map, record)?;
            if is_debit(kind) {
                amount = -amount.abs();
            } else if is_credit(kind) {
                amount = amount.abs();
            }
        }

        if amount.is_zero() {
            return Err(NumenError::import_error(format!(
                "transaction `{description}` has zero amount"
            )));
        }

        let currency = if let Some(ref currency_column) = self.config.columns.currency {
            self.value_for(currency_column, header_map, record)?
                .to_string()
        } else if let Some(ref default_currency) = self.config.defaults.currency {
            default_currency.clone()
        } else {
            "USD".to_string()
        };

        let signed_money = Money::new(amount, currency.clone());
        let asset_account = self.config.defaults.asset_account.clone();

        let rule = self.rules.iter().find(|rule| rule.matches(&description));

        let column_counterparty =
            self.config
                .columns
                .counterparty_account
                .as_ref()
                .and_then(|column| {
                    header_map
                        .get(column)
                        .and_then(|idx| record.get(*idx))
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .map(|value| value.to_string())
                });

        let counterparty_account = if let Some(account) = column_counterparty {
            Some(account)
        } else if let Some(rule) = rule {
            rule.assign_account
                .clone()
                .or_else(|| self.account_for_amount(amount))
        } else {
            self.account_for_amount(amount)
        }
        .ok_or_else(|| {
            NumenError::import_error(format!(
                "no counterparty account could be resolved for `{description}`"
            ))
        })?;

        let counterparty_amount = Money::new(-amount, currency.clone());
        let mut postings = vec![
            Posting::new(asset_account.clone(), signed_money.clone()),
            Posting::new(counterparty_account.clone(), counterparty_amount.clone()),
        ];

        if let Some(ref rule) = rule {
            if let Some(category) = &rule.assign_category {
                if let Some(counterparty_posting) = postings.get_mut(1) {
                    counterparty_posting.category = Some(category.clone());
                }
            }
        }

        if let Some(ref column) = self.config.columns.category {
            if let Some(value) = header_map
                .get(column)
                .and_then(|idx| record.get(*idx))
                .filter(|value| !value.trim().is_empty())
            {
                if let Some(counterparty_posting) = postings.get_mut(1) {
                    counterparty_posting.category = Some(value.trim().to_string());
                }
            }
        }

        let mut metadata = crate::transaction::Metadata::new();
        for (idx, header) in headers.iter().enumerate() {
            if let Some(value) = record.get(idx) {
                metadata.insert(header.to_string(), value.to_string());
            }
        }

        let mut transaction = Transaction::new(date, description, postings);
        transaction.metadata = metadata;
        transaction.tags.push("imported".to_string());

        Ok(transaction)
    }

    fn parse_date(&self, raw: &str) -> Option<NaiveDate> {
        if let Some(ref fmt) = self.config.date_format {
            if let Ok(date) = NaiveDate::parse_from_str(raw, fmt) {
                return Some(date);
            }
        }

        NaiveDate::parse_from_str(raw, "%Y-%m-%d")
            .or_else(|_| NaiveDate::parse_from_str(raw, "%d/%m/%Y"))
            .ok()
    }

    fn value_for<'a>(
        &self,
        column: &str,
        header_map: &HashMap<String, usize>,
        record: &'a StringRecord,
    ) -> Result<&'a str> {
        let idx = header_map.get(column).ok_or_else(|| {
            NumenError::import_error(format!("column `{column}` not present in CSV"))
        })?;

        record
            .get(*idx)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                NumenError::import_error(format!("value for column `{column}` is missing or empty"))
            })
    }

    fn account_for_amount(&self, amount: rust_decimal::Decimal) -> Option<String> {
        if amount.is_sign_negative() {
            self.config.defaults.expense_account.clone()
        } else {
            self.config.defaults.income_account.clone()
        }
    }
}

fn parse_decimal(raw: &str) -> Result<rust_decimal::Decimal> {
    let trimmed = raw.trim();
    let is_negative = trimmed.starts_with('(') && trimmed.ends_with(')');

    let cleaned = trimmed
        .trim_matches(|ch| ch == '(' || ch == ')')
        .replace(',', "")
        .replace('$', "")
        .replace("R$", "")
        .replace("€", "");

    let mut value = rust_decimal::Decimal::from_str(cleaned.trim()).map_err(|err| {
        NumenError::import_error(format!("failed to parse amount `{raw}`: {err}"))
    })?;

    if is_negative {
        value = -value.abs();
    }

    Ok(value)
}

fn is_debit(value: &str) -> bool {
    matches!(
        value.to_ascii_lowercase().as_str(),
        "debit" | "d" | "dr" | "saída" | "saida"
    )
}

fn is_credit(value: &str) -> bool {
    matches!(
        value.to_ascii_lowercase().as_str(),
        "credit" | "c" | "cr" | "entrada"
    )
}
