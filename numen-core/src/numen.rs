use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};

use chrono::{Datelike, Duration, NaiveDate};
use indexmap::IndexMap;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    account::{Account, AccountType},
    budget::{Budget, BudgetAllocation, BudgetOverview, BudgetStatus},
    category::{Category, CategoryRule},
    error::{NumenError, Result},
    money::Money,
    transaction::{Posting, Transaction},
};

#[derive(Debug, Clone, Copy)]
pub enum TimeGranularity {
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

pub struct Numen {
    default_currency: String,
    accounts: IndexMap<String, Account>,
    categories: IndexMap<String, Category>,
    category_rules: Vec<CategoryRule>,
    budgets: IndexMap<String, Budget>,
    transactions: IndexMap<Uuid, Transaction>,
}

impl Numen {
    pub fn new(default_currency: impl Into<String>) -> Self {
        Self {
            default_currency: default_currency.into(),
            accounts: IndexMap::new(),
            categories: IndexMap::new(),
            category_rules: Vec::new(),
            budgets: IndexMap::new(),
            transactions: IndexMap::new(),
        }
    }

    pub fn default_currency(&self) -> &str {
        &self.default_currency
    }

    pub fn add_account(&mut self, account: Account) -> Result<()> {
        if self.accounts.contains_key(&account.name) {
            return Err(NumenError::account_exists(&account.name));
        }
        self.accounts.insert(account.name.clone(), account);
        Ok(())
    }

    pub fn upsert_account(&mut self, account: Account) {
        self.accounts.insert(account.name.clone(), account);
    }

    pub fn get_account(&self, name: &str) -> Option<&Account> {
        self.accounts.get(name)
    }

    pub fn accounts(&self) -> impl Iterator<Item = &Account> {
        self.accounts.values()
    }

    pub fn add_category(&mut self, category: Category) {
        self.categories.insert(category.name.clone(), category);
    }

    pub fn categories(&self) -> impl Iterator<Item = &Category> {
        self.categories.values()
    }

    pub fn category_rules(&self) -> &[CategoryRule] {
        &self.category_rules
    }

    pub fn set_category_rules(&mut self, rules: Vec<CategoryRule>) {
        self.category_rules = rules;
    }

    pub fn add_category_rule(&mut self, rule: CategoryRule) {
        self.category_rules.push(rule);
    }

    pub fn add_budget(&mut self, budget: Budget) -> Result<()> {
        if !self.categories.contains_key(&budget.category) {
            return Err(NumenError::category_not_found(&budget.category));
        }

        self.budgets.insert(budget.category.clone(), budget);
        Ok(())
    }

    pub fn budgets(&self) -> impl Iterator<Item = &Budget> {
        self.budgets.values()
    }

    pub fn get_budget(&self, category: &str) -> Option<&Budget> {
        self.budgets.get(category)
    }

    pub fn record_transaction(&mut self, mut transaction: Transaction) -> Result<()> {
        if transaction.postings.len() < 2 {
            return Err(NumenError::invalid_transaction(
                transaction.id,
                "transaction must include at least two postings",
            ));
        }

        let accounts: Result<Vec<&Account>> = transaction
            .postings
            .iter()
            .map(|posting| {
                self.accounts
                    .get(&posting.account)
                    .ok_or_else(|| NumenError::account_not_found(&posting.account))
            })
            .collect();

        let _ = accounts?;

        self.validate_postings_currency(&transaction.postings, transaction.id)?;
        transaction.ensure_balanced()?;
        self.apply_category_rules(&mut transaction)?;

        self.transactions.insert(transaction.id, transaction);
        Ok(())
    }

    fn validate_postings_currency(&self, postings: &[Posting], transaction_id: Uuid) -> Result<()> {
        let mut iter = postings.iter();
        let Some(first) = iter.next() else {
            return Ok(());
        };

        for posting in iter {
            if posting.amount.currency != first.amount.currency {
                return Err(NumenError::mixed_currencies(transaction_id));
            }
        }

        Ok(())
    }

    fn apply_category_rules(&self, transaction: &mut Transaction) -> Result<()> {
        for posting in &mut transaction.postings {
            if posting.category.is_some() {
                continue;
            }

            let Some(account) = self.accounts.get(&posting.account) else {
                continue;
            };

            if !matches!(account.r#type, AccountType::Expenses | AccountType::Income) {
                continue;
            }

            for rule in &self.category_rules {
                if rule.matches(&transaction.description, posting) {
                    if self.categories.contains_key(&rule.category) {
                        posting.category = Some(rule.category.clone());
                        break;
                    } else {
                        return Err(NumenError::category_not_found(&rule.category));
                    }
                }
            }
        }

        Ok(())
    }

    pub fn transactions(&self) -> impl Iterator<Item = &Transaction> {
        self.transactions.values()
    }

    pub fn transaction(&self, id: &Uuid) -> Option<&Transaction> {
        self.transactions.get(id)
    }

    pub fn remove_transaction(&mut self, id: &Uuid) -> Option<Transaction> {
        self.transactions.shift_remove(id)
    }

    pub fn balance_for_account(&self, account_name: &str) -> Result<Money> {
        let mut total: Option<Money> = None;

        for transaction in self.transactions.values() {
            for posting in &transaction.postings {
                if posting.account != account_name {
                    continue;
                }

                match total.as_mut() {
                    Some(sum) => sum.checked_add_assign(&posting.amount)?,
                    None => {
                        total = Some(Money::new(
                            posting.amount.amount,
                            posting.amount.currency.clone(),
                        ));
                    }
                }
            }
        }

        if let Some(total) = total {
            Ok(total)
        } else {
            let currency = self
                .accounts
                .get(account_name)
                .and_then(|a| a.currency.clone())
                .unwrap_or_else(|| self.default_currency.clone());
            Ok(Money::zero(currency))
        }
    }

    pub fn balances(&self) -> Result<HashMap<String, Money>> {
        let mut balances = HashMap::new();
        for account in self.accounts.keys() {
            balances.insert(account.clone(), self.balance_for_account(account)?);
        }
        Ok(balances)
    }

    pub fn budget_status_for_month(
        &self,
        month: NaiveDate,
        expense_account_filter: impl Fn(&Account) -> bool,
    ) -> Result<Vec<BudgetStatus>> {
        let start = NaiveDate::from_ymd_opt(month.year(), month.month(), 1)
            .ok_or_else(|| NumenError::invalid_date(month.to_string()))?;
        let end = if month.month() == 12 {
            NaiveDate::from_ymd_opt(month.year() + 1, 1, 1)
        } else {
            NaiveDate::from_ymd_opt(month.year(), month.month() + 1, 1)
        }
        .ok_or_else(|| NumenError::invalid_date(month.to_string()))?;

        let mut actuals: HashMap<String, Money> = HashMap::new();

        for transaction in self.transactions.values() {
            if !(start..end).contains(&transaction.date) {
                continue;
            }

            for posting in &transaction.postings {
                let Some(account) = self.accounts.get(&posting.account) else {
                    continue;
                };
                if !expense_account_filter(account) {
                    continue;
                }

                if let Some(category) = &posting.category {
                    let entry = actuals
                        .entry(category.clone())
                        .or_insert_with(|| Money::zero(posting.amount.currency.clone()));
                    entry.checked_add_assign(&posting.amount)?;
                }
            }
        }

        let mut statuses = Vec::new();

        for (category_name, budget) in &self.budgets {
            if let Some(actual) = actuals.get(category_name) {
                statuses.push(BudgetStatus::new(
                    category_name,
                    start,
                    budget.monthly_limit.clone(),
                    actual.clone(),
                ));
            } else {
                statuses.push(BudgetStatus::new(
                    category_name,
                    start,
                    budget.monthly_limit.clone(),
                    Money::zero(budget.monthly_limit.currency.clone()),
                ));
            }
        }

        statuses.sort_by(|a, b| a.category.cmp(&b.category));

        Ok(statuses)
    }

    pub fn total_budget_allocation(&self) -> Result<Money> {
        let mut total = Money::zero(self.default_currency.clone());
        for budget in self.budgets.values() {
            total.checked_add_assign(&budget.monthly_limit)?;
        }
        Ok(total)
    }

    pub fn monthly_income_projection(&self) -> Result<Money> {
        let mut income_totals: HashMap<(i32, u32), Money> = HashMap::new();

        for transaction in self.transactions.values() {
            for posting in &transaction.postings {
                let Some(account) = self.accounts.get(&posting.account) else {
                    continue;
                };
                if account.r#type != AccountType::Income {
                    continue;
                }

                let key = (transaction.date.year(), transaction.date.month());
                let normalized = normalize_amount(account.r#type, &posting.amount);
                income_totals
                    .entry(key)
                    .and_modify(|sum| {
                        let _ = sum.checked_add_assign(&normalized);
                    })
                    .or_insert_with(|| normalized);
            }
        }

        if income_totals.is_empty() {
            return Ok(Money::zero(self.default_currency.clone()));
        }

        let mut total: Option<Money> = None;
        for income in income_totals.values() {
            match total.as_mut() {
                Some(sum) => sum.checked_add_assign(income)?,
                None => total = Some(income.clone()),
            }
        }

        let total = total.unwrap_or_else(|| Money::zero(self.default_currency.clone()));
        let avg = if income_totals.is_empty() {
            Decimal::ZERO
        } else {
            total.amount / Decimal::from(income_totals.len() as i64)
        };
        Ok(Money::new(avg, total.currency.clone()))
    }

    pub fn budget_overview(&self) -> Result<BudgetOverview> {
        let total = self.total_budget_allocation()?;
        let monthly_income = self.monthly_income_projection()?;

        let mut allocations: Vec<BudgetAllocation> = self
            .budgets
            .values()
            .map(|budget| {
                let weight = if total.amount.is_zero() {
                    Decimal::ZERO
                } else {
                    (budget.monthly_limit.amount / total.amount).max(Decimal::ZERO)
                };

                BudgetAllocation {
                    category: budget.category.clone(),
                    limit: budget.monthly_limit.clone(),
                    weight,
                }
            })
            .collect();

        allocations.sort_by(|a, b| b.limit.amount.cmp(&a.limit.amount));

        let delta = match monthly_income.checked_sub(&total) {
            Ok(diff) => diff,
            Err(_) => Money::zero(monthly_income.currency.clone()),
        };

        let is_over_budget = total.amount > monthly_income.amount;

        Ok(BudgetOverview {
            allocations,
            total,
            monthly_income,
            delta,
            is_over_budget,
        })
    }

    pub fn balances_over_time<I, S>(
        &self,
        accounts: I,
        granularity: TimeGranularity,
    ) -> Result<Vec<TimeSeriesPoint>>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let account_set: HashSet<String> = accounts
            .into_iter()
            .map(|name| name.as_ref().to_string())
            .collect();

        if account_set.is_empty() {
            return Ok(Vec::new());
        }

        let mut buckets: BTreeMap<NaiveDate, Money> = BTreeMap::new();

        for transaction in self.transactions.values() {
            let period_start = period_start(transaction.date, granularity);
            for posting in &transaction.postings {
                if !account_set.contains(&posting.account) {
                    continue;
                }

                let account = self
                    .accounts
                    .get(&posting.account)
                    .ok_or_else(|| NumenError::account_not_found(&posting.account))?;

                let normalized = normalize_amount(account.r#type, &posting.amount);

                let entry = buckets
                    .entry(period_start)
                    .or_insert_with(|| Money::zero(normalized.currency.clone()));

                entry.checked_add_assign(&normalized)?;
            }
        }

        let mut points = Vec::with_capacity(buckets.len());
        for (start, value) in buckets {
            let end = period_end(start, granularity);
            points.push(TimeSeriesPoint {
                period_start: start,
                period_end: end,
                value,
            });
        }

        Ok(points)
    }

    pub fn expenses_over_time(&self, granularity: TimeGranularity) -> Result<Vec<TimeSeriesPoint>> {
        let accounts: Vec<String> = self
            .accounts
            .iter()
            .filter_map(|(name, account)| {
                if account.r#type == AccountType::Expenses {
                    Some(name.clone())
                } else {
                    None
                }
            })
            .collect();

        self.balances_over_time(accounts, granularity)
    }

    pub fn expenses_by_category(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<CategoryBreakdown>> {
        if end < start {
            return Err(NumenError::other(
                "end date must be greater than or equal to start date",
            ));
        }

        let mut totals: HashMap<String, Money> = HashMap::new();

        for transaction in self.transactions.values() {
            if transaction.date < start || transaction.date > end {
                continue;
            }

            for posting in &transaction.postings {
                let Some(account) = self.accounts.get(&posting.account) else {
                    continue;
                };

                if account.r#type != AccountType::Expenses {
                    continue;
                }

                let category_name = posting
                    .category
                    .clone()
                    .unwrap_or_else(|| "Uncategorized".to_string());

                let entry = totals
                    .entry(category_name)
                    .or_insert_with(|| Money::zero(posting.amount.currency.clone()));

                entry.checked_add_assign(&posting.amount)?;
            }
        }

        let mut breakdown: Vec<CategoryBreakdown> = totals
            .into_iter()
            .map(|(category, value)| CategoryBreakdown { category, value })
            .collect();

        breakdown.sort_by(|a, b| b.value.amount.cmp(&a.value.amount));

        Ok(breakdown)
    }

    pub fn rolling_expense_sum(&self, window_days: u32) -> Result<Vec<RollingPoint>> {
        self.rolling_expense(window_days, RollingComputation::Sum)
    }

    pub fn rolling_expense_average(&self, window_days: u32) -> Result<Vec<RollingPoint>> {
        self.rolling_expense(window_days, RollingComputation::Average)
    }

    pub fn detect_recurring_transactions(
        &self,
        min_occurrences: usize,
        tolerance_days: i64,
    ) -> Result<Vec<RecurringTransactionGroup>> {
        if min_occurrences < 2 {
            return Err(NumenError::other(
                "min_occurrences must be at least 2 to detect recurrences",
            ));
        }

        let mut groups: HashMap<String, Vec<&Transaction>> = HashMap::new();
        for transaction in self.transactions.values() {
            let key = normalize_description(&transaction.description);
            groups.entry(key).or_default().push(transaction);
        }

        let mut results = Vec::new();

        for (description, mut txs) in groups {
            if txs.len() < min_occurrences {
                continue;
            }

            txs.sort_by_key(|tx| tx.date);
            let mut intervals = Vec::new();

            for window in txs.windows(2) {
                let lhs = window[0];
                let rhs = window[1];
                let days = rhs.date.signed_duration_since(lhs.date).num_days().max(0) as f64;
                if days > 0.0 {
                    intervals.push(days);
                }
            }

            if intervals.len() < min_occurrences - 1 {
                continue;
            }

            let mean_interval = intervals.iter().sum::<f64>() / intervals.len() as f64;

            if intervals
                .iter()
                .any(|interval| (interval - mean_interval).abs() > tolerance_days as f64)
            {
                continue;
            }

            let mut total_amount: Option<Money> = None;
            let mut tx_ids = Vec::with_capacity(txs.len());

            for tx in &txs {
                tx_ids.push(tx.id);

                let tx_amount = match self.aggregate_postings_by_type(tx, AccountType::Expenses)? {
                    Some(amount) => Some(amount),
                    None => self.aggregate_postings_by_type(tx, AccountType::Income)?,
                };

                if let Some(amount) = tx_amount {
                    match total_amount.as_mut() {
                        Some(total) => total.checked_add_assign(&amount)?,
                        None => total_amount = Some(amount),
                    }
                }
            }

            let average_amount = if let Some(total) = total_amount {
                let divisor = Decimal::from(txs.len() as i64);
                let divisor = if divisor.is_zero() {
                    Decimal::ONE
                } else {
                    divisor
                };
                Money::new(total.amount / divisor, total.currency.clone())
            } else {
                Money::zero(self.default_currency.clone())
            };

            results.push(RecurringTransactionGroup {
                description,
                transaction_ids: tx_ids,
                average_interval_days: mean_interval,
                average_amount,
            });
        }

        results.sort_by(|a, b| a.description.cmp(&b.description));

        Ok(results)
    }

    pub fn mark_transactions_as_recurring(&mut self, ids: &[Uuid]) -> Result<()> {
        for id in ids {
            let Some(tx) = self.transactions.get_mut(id) else {
                return Err(NumenError::invalid_transaction(
                    *id,
                    "transaction not found",
                ));
            };

            tx.recurring = true;
            if !tx.tags.iter().any(|tag| tag == "recurring") {
                tx.tags.push("recurring".to_string());
            }
        }

        Ok(())
    }

    fn rolling_expense(
        &self,
        window_days: u32,
        computation: RollingComputation,
    ) -> Result<Vec<RollingPoint>> {
        if window_days == 0 {
            return Err(NumenError::other("window_days must be greater than zero"));
        }

        let mut entries: Vec<(NaiveDate, Money)> = Vec::new();
        for transaction in self.transactions.values() {
            for posting in &transaction.postings {
                let Some(account) = self.accounts.get(&posting.account) else {
                    continue;
                };
                if account.r#type != AccountType::Expenses {
                    continue;
                }
                entries.push((transaction.date, posting.amount.clone()));
            }
        }

        entries.sort_by_key(|(date, _)| *date);

        let mut window: VecDeque<(NaiveDate, Money)> = VecDeque::new();
        let mut running_total: Option<Money> = None;
        let mut points = Vec::new();

        for (date, amount) in entries {
            if running_total.is_none() {
                running_total = Some(Money::zero(amount.currency.clone()));
            }

            if let Some(total) = running_total.as_mut() {
                total.checked_add_assign(&amount)?;
            }

            window.push_back((date, amount.clone()));

            let threshold = date - Duration::days(window_days as i64 - 1);
            while let Some((front_date, front_amount)) = window.front() {
                if *front_date < threshold {
                    let front_amount = front_amount.clone();
                    if let Some(total) = running_total.as_mut() {
                        total.checked_sub_assign(&front_amount)?;
                    }
                    window.pop_front();
                } else {
                    break;
                }
            }

            if let Some(total) = running_total.as_ref() {
                let window_start = window.front().map(|(d, _)| *d).unwrap_or(date);
                let span_days = date.signed_duration_since(window_start).num_days() + 1;

                let value = match computation {
                    RollingComputation::Sum => total.clone(),
                    RollingComputation::Average => {
                        let divisor = Decimal::from(span_days.max(1));
                        let divisor = if divisor.is_zero() {
                            Decimal::ONE
                        } else {
                            divisor
                        };
                        Money::new(total.amount / divisor, total.currency.clone())
                    }
                };

                points.push(RollingPoint { date, value });
            }
        }

        Ok(points)
    }

    fn aggregate_postings_by_type(
        &self,
        transaction: &Transaction,
        account_type: AccountType,
    ) -> Result<Option<Money>> {
        let mut total: Option<Money> = None;
        for posting in &transaction.postings {
            let Some(account) = self.accounts.get(&posting.account) else {
                continue;
            };
            if account.r#type != account_type {
                continue;
            }

            match total.as_mut() {
                Some(sum) => sum.checked_add_assign(&posting.amount)?,
                None => total = Some(posting.amount.clone()),
            }
        }
        Ok(total)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TimeSeriesPoint {
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub value: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CategoryBreakdown {
    pub category: String,
    pub value: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RollingPoint {
    pub date: NaiveDate,
    pub value: Money,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RecurringTransactionGroup {
    pub description: String,
    pub transaction_ids: Vec<Uuid>,
    pub average_interval_days: f64,
    pub average_amount: Money,
}

#[derive(Clone, Copy)]
enum RollingComputation {
    Sum,
    Average,
}

fn period_start(date: NaiveDate, granularity: TimeGranularity) -> NaiveDate {
    match granularity {
        TimeGranularity::Daily => date,
        TimeGranularity::Weekly => {
            let offset = date.weekday().num_days_from_monday() as i64;
            date - Duration::days(offset)
        }
        TimeGranularity::Monthly => NaiveDate::from_ymd_opt(date.year(), date.month(), 1)
            .expect("invalid date when computing month start"),
        TimeGranularity::Yearly => NaiveDate::from_ymd_opt(date.year(), 1, 1)
            .expect("invalid date when computing year start"),
    }
}

fn period_end(start: NaiveDate, granularity: TimeGranularity) -> NaiveDate {
    match granularity {
        TimeGranularity::Daily => start,
        TimeGranularity::Weekly => start + Duration::days(6),
        TimeGranularity::Monthly => {
            let (year, month) = if start.month() == 12 {
                (start.year() + 1, 1)
            } else {
                (start.year(), start.month() + 1)
            };
            NaiveDate::from_ymd_opt(year, month, 1).expect("invalid date when computing month end")
                - Duration::days(1)
        }
        TimeGranularity::Yearly => NaiveDate::from_ymd_opt(start.year(), 12, 31)
            .expect("invalid date when computing year end"),
    }
}

fn normalize_amount(account_type: AccountType, amount: &Money) -> Money {
    let multiplier = Decimal::from(account_type.natural_sign() as i32);
    Money::new(amount.amount * multiplier, amount.currency.clone())
}

fn normalize_description(description: &str) -> String {
    description.trim().to_ascii_lowercase()
}
