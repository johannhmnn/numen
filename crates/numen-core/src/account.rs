use crate::DomainError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AccountType {
    Assets,
    Liabilities,
    Equity,
    Income,
    Expenses,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Account {
    name: String,
    account_type: AccountType,
}

impl Account {
    pub fn new(name: impl Into<String>, account_type: AccountType) -> Result<Self, DomainError> {
        let name = name.into().trim().to_owned();

        if name.is_empty() {
            return Err(DomainError::EmptyAccountName);
        }

        Ok(Self { name, account_type })
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn account_type(&self) -> AccountType {
        self.account_type
    }
}

#[cfg(test)]
mod tests {
    use super::{Account, AccountType};
    use crate::DomainError;

    #[test]
    fn account_accepts_trimmed_non_empty_name() {
        let account = Account::new("  Checking  ", AccountType::Assets).expect("valid account");

        assert_eq!(account.name(), "Checking");
        assert_eq!(account.account_type(), AccountType::Assets);
    }

    #[test]
    fn account_rejects_blank_name() {
        let error = Account::new("   ", AccountType::Expenses).expect_err("blank name rejected");

        assert_eq!(error, DomainError::EmptyAccountName);
    }
}
