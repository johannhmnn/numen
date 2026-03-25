use time::Date;

use crate::{DomainError, Posting};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Transaction {
    date: Date,
    title: String,
    payee: Option<String>,
    primary_category: Option<String>,
    tags: Vec<String>,
    postings: Vec<Posting>,
}

impl Transaction {
    pub fn new(
        date: Option<Date>,
        title: impl Into<String>,
        payee: Option<String>,
        primary_category: Option<String>,
        tags: Vec<String>,
        postings: Vec<Posting>,
    ) -> Result<Self, DomainError> {
        let date = date.ok_or(DomainError::MissingTransactionDate)?;
        let title = normalize_required(title.into(), DomainError::EmptyTransactionTitle)?;
        let payee = normalize_optional(payee);
        let primary_category = normalize_optional(primary_category);
        let tags = normalize_tags(tags)?;

        if postings.len() < 2 {
            return Err(DomainError::MissingPostings);
        }

        let total: crate::Money = postings.iter().map(|posting| posting.amount()).sum();

        if !total.is_zero() {
            return Err(DomainError::ImbalancedTransaction);
        }

        Ok(Self {
            date,
            title,
            payee,
            primary_category,
            tags,
            postings,
        })
    }

    pub fn date(&self) -> Date {
        self.date
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn payee(&self) -> Option<&str> {
        self.payee.as_deref()
    }

    pub fn primary_category(&self) -> Option<&str> {
        self.primary_category.as_deref()
    }

    pub fn tags(&self) -> &[String] {
        &self.tags
    }

    pub fn postings(&self) -> &[Posting] {
        &self.postings
    }
}

fn normalize_required(value: String, error: DomainError) -> Result<String, DomainError> {
    let value = value.trim().to_owned();

    if value.is_empty() {
        return Err(error);
    }

    Ok(value)
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let value = value.trim().to_owned();
        (!value.is_empty()).then_some(value)
    })
}

fn normalize_tags(tags: Vec<String>) -> Result<Vec<String>, DomainError> {
    tags.into_iter()
        .map(|tag| normalize_required(tag, DomainError::EmptyTransactionTag))
        .collect()
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;
    use time::macros::date;

    use super::Transaction;
    use crate::{DomainError, Money, Posting};

    #[test]
    fn transaction_accepts_trimmed_metadata_and_two_postings() {
        let transaction = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "  Grocery Run  ",
            Some("  Corner Market  ".to_owned()),
            Some("  Groceries  ".to_owned()),
            vec!["  home  ".to_owned(), "food  ".to_owned()],
            sample_postings(),
        )
        .expect("valid transaction");

        assert_eq!(transaction.title(), "Grocery Run");
        assert_eq!(transaction.payee(), Some("Corner Market"));
        assert_eq!(transaction.primary_category(), Some("Groceries"));
        assert_eq!(transaction.tags(), &["home".to_owned(), "food".to_owned()]);
        assert_eq!(transaction.postings().len(), 2);
    }

    #[test]
    fn transaction_accepts_balanced_postings() {
        let transaction = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Balanced transaction",
            None,
            None,
            vec![],
            sample_postings(),
        )
        .expect("balanced transaction");

        assert_eq!(transaction.postings().len(), 2);
    }

    #[test]
    fn transaction_rejects_missing_title() {
        let error = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "   ",
            None,
            None,
            vec![],
            sample_postings(),
        )
        .expect_err("blank title rejected");

        assert_eq!(error, DomainError::EmptyTransactionTitle);
    }

    #[test]
    fn transaction_rejects_missing_date() {
        let error = Transaction::new(None, "Grocery Run", None, None, vec![], sample_postings())
            .expect_err("missing date rejected");

        assert_eq!(error, DomainError::MissingTransactionDate);
    }

    #[test]
    fn transaction_rejects_fewer_than_two_postings() {
        let error = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Grocery Run",
            None,
            None,
            vec![],
            vec![
                Posting::new("Assets:Checking", Money::new(Decimal::new(-1250, 2)))
                    .expect("valid posting"),
            ],
        )
        .expect_err("insufficient postings rejected");

        assert_eq!(error, DomainError::MissingPostings);
    }

    #[test]
    fn transaction_rejects_blank_tags_after_normalization() {
        let error = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Grocery Run",
            None,
            None,
            vec!["  ".to_owned()],
            sample_postings(),
        )
        .expect_err("blank tag rejected");

        assert_eq!(error, DomainError::EmptyTransactionTag);
    }

    #[test]
    fn transaction_rejects_imbalanced_postings() {
        let error = Transaction::new(
            Some(date!(2026 - 03 - 25)),
            "Imbalanced transaction",
            None,
            None,
            vec![],
            vec![
                Posting::new("Assets:Checking", Money::new(Decimal::new(-1250, 2)))
                    .expect("valid posting"),
                Posting::new("Expenses:Groceries", Money::new(Decimal::new(1200, 2)))
                    .expect("valid posting"),
            ],
        )
        .expect_err("imbalanced postings rejected");

        assert_eq!(error, DomainError::ImbalancedTransaction);
    }

    fn sample_postings() -> Vec<Posting> {
        vec![
            Posting::new("Assets:Checking", Money::new(Decimal::new(-1250, 2)))
                .expect("valid posting"),
            Posting::new("Expenses:Groceries", Money::new(Decimal::new(1250, 2)))
                .expect("valid posting"),
        ]
    }
}
