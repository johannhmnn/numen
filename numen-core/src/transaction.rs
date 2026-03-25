use chrono::NaiveDate;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{error::NumenError, money::Money};

pub type Metadata = IndexMap<String, String>;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Posting {
    pub account: String,
    pub amount: Money,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

impl Posting {
    pub fn new(account: impl Into<String>, amount: Money) -> Self {
        Self {
            account: account.into(),
            amount,
            category: None,
            tags: Vec::new(),
            memo: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transaction {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub date: NaiveDate,
    pub description: String,
    pub postings: Vec<Posting>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Metadata::is_empty")]
    pub metadata: Metadata,
    #[serde(default)]
    pub recurring: bool,
}

impl Transaction {
    pub fn new(date: NaiveDate, description: impl Into<String>, postings: Vec<Posting>) -> Self {
        Self {
            id: Uuid::new_v4(),
            date,
            description: description.into(),
            postings,
            tags: Vec::new(),
            metadata: Metadata::new(),
            recurring: false,
        }
    }

    pub fn ensure_balanced(&self) -> Result<(), NumenError> {
        let mut iter = self.postings.iter();
        let Some(first) = iter.next() else {
            return Err(NumenError::invalid_transaction(
                self.id,
                "transaction must have at least one posting",
            ));
        };

        let mut total = Money::zero(first.amount.currency.clone());
        total.checked_add_assign(&first.amount)?;
        for posting in iter {
            if posting.amount.currency != total.currency {
                return Err(NumenError::mixed_currencies(self.id));
            }
            total.checked_add_assign(&posting.amount)?;
        }

        if !total.is_zero() {
            return Err(NumenError::transaction_imbalance(
                self.id,
                total.amount,
                &total.currency,
            ));
        }

        Ok(())
    }
}
