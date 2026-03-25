use std::ops::{Add, AddAssign, Neg, Sub, SubAssign};

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use crate::error::{NumenError, Result};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Money {
    pub amount: Decimal,
    pub currency: String,
}

impl Money {
    pub fn new(amount: Decimal, currency: impl Into<String>) -> Self {
        Self {
            amount,
            currency: currency.into(),
        }
    }

    pub fn zero<S: Into<String>>(currency: S) -> Self {
        Self::new(Decimal::ZERO, currency)
    }

    pub fn is_zero(&self) -> bool {
        self.amount.is_zero()
    }

    pub fn checked_add(&self, other: &Self) -> Result<Self> {
        self.ensure_same_currency(other)?;
        Ok(Self::new(self.amount + other.amount, &self.currency))
    }

    pub fn checked_sub(&self, other: &Self) -> Result<Self> {
        self.ensure_same_currency(other)?;
        Ok(Self::new(self.amount - other.amount, &self.currency))
    }

    pub fn checked_add_assign(&mut self, other: &Self) -> Result<()> {
        self.ensure_same_currency(other)?;
        self.amount += other.amount;
        Ok(())
    }

    pub fn checked_sub_assign(&mut self, other: &Self) -> Result<()> {
        self.ensure_same_currency(other)?;
        self.amount -= other.amount;
        Ok(())
    }

    pub fn ensure_same_currency(&self, other: &Self) -> Result<()> {
        if self.currency != other.currency {
            return Err(NumenError::currency_mismatch(
                self.currency.clone(),
                other.currency.clone(),
            ));
        }

        Ok(())
    }
}

impl Add for Money {
    type Output = Result<Money>;

    fn add(self, rhs: Self) -> Self::Output {
        self.checked_add(&rhs)
    }
}

impl AddAssign for Money {
    fn add_assign(&mut self, rhs: Self) {
        self.checked_add_assign(&rhs)
            .expect("currency mismatch when adding amounts");
    }
}

impl Sub for Money {
    type Output = Result<Money>;

    fn sub(self, rhs: Self) -> Self::Output {
        self.checked_sub(&rhs)
    }
}

impl SubAssign for Money {
    fn sub_assign(&mut self, rhs: Self) {
        self.checked_sub_assign(&rhs)
            .expect("currency mismatch when subtracting amounts");
    }
}

impl Neg for Money {
    type Output = Money;

    fn neg(self) -> Self::Output {
        Self::new(-self.amount, self.currency)
    }
}

impl From<(Decimal, &str)> for Money {
    fn from(value: (Decimal, &str)) -> Self {
        Money::new(value.0, value.1)
    }
}
