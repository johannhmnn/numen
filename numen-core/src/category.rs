use std::convert::TryFrom;

use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    account::AccountType,
    error::{NumenError, Result},
    transaction::Posting,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Category {
    pub name: String,
    pub account_type: AccountType,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub parent: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
}

impl Category {
    pub fn new(name: impl Into<String>, account_type: AccountType) -> Self {
        Self {
            name: name.into(),
            account_type,
            description: None,
            parent: None,
            color: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CategoryRuleConfig {
    pub category: String,
    #[serde(default)]
    pub description_contains: Option<String>,
    #[serde(default)]
    pub description_regex: Option<String>,
    #[serde(default)]
    pub account: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CategoryRule {
    pub category: String,
    pub description_contains: Option<String>,
    pub description_regex: Option<Regex>,
    pub account: Option<String>,
}

impl CategoryRule {
    pub fn matches(&self, description: &str, posting: &Posting) -> bool {
        if let Some(ref account) = self.account
            && &posting.account != account
        {
            return false;
        }

        if let Some(ref pattern) = self.description_contains
            && !description
                .to_ascii_lowercase()
                .contains(&pattern.to_ascii_lowercase())
        {
            return false;
        }

        if let Some(ref regex) = self.description_regex
            && !regex.is_match(description)
        {
            return false;
        }

        true
    }
}

impl TryFrom<CategoryRuleConfig> for CategoryRule {
    type Error = NumenError;

    fn try_from(value: CategoryRuleConfig) -> Result<Self> {
        let regex = if let Some(pattern) = value.description_regex.clone() {
            Some(
                Regex::new(&pattern)
                    .map_err(|err| NumenError::other(format!("invalid regex: {err}")))?,
            )
        } else {
            None
        };

        Ok(Self {
            category: value.category,
            description_contains: value.description_contains,
            description_regex: regex,
            account: value.account,
        })
    }
}
