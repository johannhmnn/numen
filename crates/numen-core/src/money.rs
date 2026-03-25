use std::iter::Sum;
use std::ops::{Add, AddAssign, Neg};

use rust_decimal::Decimal;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Money(Decimal);

impl Money {
    pub fn new(amount: Decimal) -> Self {
        Self(amount)
    }

    pub fn zero() -> Self {
        Self(Decimal::ZERO)
    }

    pub fn is_zero(self) -> bool {
        self.0.is_zero()
    }

    pub fn value(self) -> Decimal {
        self.0
    }
}

impl Add for Money {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl AddAssign for Money {
    fn add_assign(&mut self, rhs: Self) {
        self.0 += rhs.0;
    }
}

impl Neg for Money {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self(-self.0)
    }
}

impl Sum for Money {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::zero(), |acc, amount| acc + amount)
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;

    use super::Money;

    #[test]
    fn money_preserves_decimal_values_exactly() {
        let amount = Money::new(Decimal::new(12345, 2));

        assert_eq!(amount.value(), Decimal::new(12345, 2));
        assert!(!amount.is_zero());
    }

    #[test]
    fn money_supports_exact_addition_and_summation() {
        let amounts = [
            Money::new(Decimal::new(1500, 2)),
            Money::new(Decimal::new(-500, 2)),
            Money::new(Decimal::new(-1000, 2)),
        ];

        let total: Money = amounts.into_iter().sum();

        assert_eq!(total, Money::zero());
        assert!(total.is_zero());
    }
}
