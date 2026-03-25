use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum DomainError {
    #[error("account name cannot be empty")]
    EmptyAccountName,
    #[error("transaction title cannot be empty")]
    EmptyTransactionTitle,
    #[error("transaction tag cannot be empty")]
    EmptyTransactionTag,
    #[error("transaction date is required")]
    MissingTransactionDate,
    #[error("transaction must include at least two postings")]
    MissingPostings,
    #[error("posting account cannot be empty")]
    EmptyPostingAccount,
    #[error("posting amount cannot be zero")]
    ZeroPostingAmount,
    #[error("transaction postings must balance to zero")]
    ImbalancedTransaction,
}

#[cfg(test)]
mod tests {
    use super::DomainError;

    #[test]
    fn domain_errors_are_matchable_by_variant() {
        let error = DomainError::EmptyAccountName;

        assert_eq!(error, DomainError::EmptyAccountName);
        assert!(matches!(error, DomainError::EmptyAccountName));
    }

    #[test]
    fn domain_errors_expose_stable_messages() {
        assert_eq!(
            DomainError::ImbalancedTransaction.to_string(),
            "transaction postings must balance to zero"
        );
        assert_eq!(
            DomainError::MissingPostings.to_string(),
            "transaction must include at least two postings"
        );
    }
}
