use crate::{DomainError, Money};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Posting {
    account: String,
    amount: Money,
}

impl Posting {
    pub fn new(account: impl Into<String>, amount: Money) -> Result<Self, DomainError> {
        let account = account.into().trim().to_owned();

        if account.is_empty() {
            return Err(DomainError::EmptyPostingAccount);
        }

        if amount.is_zero() {
            return Err(DomainError::ZeroPostingAmount);
        }

        Ok(Self { account, amount })
    }

    pub fn account(&self) -> &str {
        &self.account
    }

    pub fn amount(&self) -> Money {
        self.amount
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;

    use super::Posting;
    use crate::{DomainError, Money};

    #[test]
    fn posting_accepts_trimmed_non_empty_account_and_non_zero_amount() {
        let posting = Posting::new("  Assets:Checking  ", Money::new(Decimal::new(1250, 2)))
            .expect("valid posting");

        assert_eq!(posting.account(), "Assets:Checking");
        assert_eq!(posting.amount(), Money::new(Decimal::new(1250, 2)));
    }

    #[test]
    fn posting_rejects_blank_account_reference() {
        let error = Posting::new("   ", Money::new(Decimal::new(1250, 2)))
            .expect_err("blank account rejected");

        assert_eq!(error, DomainError::EmptyPostingAccount);
    }

    #[test]
    fn posting_rejects_zero_amount() {
        let error = Posting::new("Expenses:Food", Money::zero()).expect_err("zero amount rejected");

        assert_eq!(error, DomainError::ZeroPostingAmount);
    }
}
