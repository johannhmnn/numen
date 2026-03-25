use chrono::{Datelike, NaiveDate};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use crate::money::Money;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Budget {
    pub category: String,
    pub monthly_limit: Money,
}

impl Budget {
    pub fn new(category: impl Into<String>, monthly_limit: Money) -> Self {
        Self {
            category: category.into(),
            monthly_limit,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BudgetStatus {
    pub category: String,
    pub month: NaiveDate,
    pub limit: Money,
    pub actual: Money,
    pub remaining: Money,
    pub utilization: Decimal,
}

impl BudgetStatus {
    pub fn new(category: impl Into<String>, month: NaiveDate, limit: Money, actual: Money) -> Self {
        let remaining = limit.checked_sub(&actual).unwrap_or_else(|_| limit.clone());
        let utilization = if limit.amount.is_zero() {
            Decimal::ZERO
        } else {
            (actual.amount / limit.amount).max(Decimal::ZERO)
        };

        Self {
            category: category.into(),
            month: NaiveDate::from_ymd_opt(month.year(), month.month(), 1).expect("invalid month"),
            limit,
            actual,
            remaining,
            utilization,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BudgetAllocation {
    pub category: String,
    pub limit: Money,
    pub weight: Decimal,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BudgetOverview {
    pub allocations: Vec<BudgetAllocation>,
    pub total: Money,
    pub monthly_income: Money,
    pub delta: Money,
    pub is_over_budget: bool,
}
