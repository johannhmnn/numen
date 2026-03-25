use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Assets,
    Liabilities,
    Equity,
    Income,
    Expenses,
}

impl AccountType {
    /// Returns the natural sign for balances of the account type.
    pub fn natural_sign(self) -> i8 {
        match self {
            AccountType::Assets | AccountType::Expenses => 1,
            AccountType::Liabilities | AccountType::Equity | AccountType::Income => -1,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Account {
    pub name: String,
    pub r#type: AccountType,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub parent: Option<String>,
    #[serde(default)]
    pub currency: Option<String>,
}

impl Account {
    pub fn new(name: impl Into<String>, r#type: AccountType) -> Self {
        Self {
            name: name.into(),
            r#type,
            description: None,
            parent: None,
            currency: None,
        }
    }

    pub fn with_description(
        name: impl Into<String>,
        r#type: AccountType,
        description: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            r#type,
            description: Some(description.into()),
            parent: None,
            currency: None,
        }
    }

    pub fn with_currency(mut self, currency: impl Into<String>) -> Self {
        self.currency = Some(currency.into());
        self
    }
}
