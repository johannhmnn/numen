package accounting

import (
	"fmt"
)

// AccountType classifies an account according to double-entry bookkeeping.
type AccountType string

const (
	// AccountTypeAsset classifies resources controlled by the owner.
	AccountTypeAsset AccountType = "Asset"
	// AccountTypeLiability classifies obligations owed by the owner.
	AccountTypeLiability AccountType = "Liability"
	// AccountTypeEquity classifies the owner's residual interest.
	AccountTypeEquity AccountType = "Equity"
	// AccountTypeIncome classifies inflows that increase equity.
	AccountTypeIncome AccountType = "Income"
	// AccountTypeExpense classifies outflows that decrease equity.
	AccountTypeExpense AccountType = "Expense"
)

// Account is a validated accounting account, not only a bank account.
type Account struct {
	id   AccountID
	name string
	kind AccountType
}

// NewAccount creates an accounting account with a validated name and type.
func NewAccount(id AccountID, name string, accountType AccountType) (Account, error) {
	trimmedName, err := validateRequiredName("account name", name)
	if err != nil {
		return Account{}, err
	}

	if id == "" {
		return Account{}, fmt.Errorf("invalid account ID %q: expected non-empty string", id)
	}

	if !isValidAccountType(accountType) {
		return Account{}, fmt.Errorf("invalid account type %q: expected one of Asset, Liability, Equity, Income, Expense", accountType)
	}

	return Account{id: id, name: trimmedName, kind: accountType}, nil
}

func isValidAccountType(accountType AccountType) bool {
	switch accountType {
	case AccountTypeAsset, AccountTypeLiability, AccountTypeEquity, AccountTypeIncome, AccountTypeExpense:
		return true
	default:
		return false
	}
}

// ID returns the stable identifier used by postings and persistence.
func (account Account) ID() AccountID {
	return account.id
}

// Name returns the validated display name.
func (account Account) Name() string {
	return account.name
}

// Type returns the account's bookkeeping classification.
func (account Account) Type() AccountType {
	return account.kind
}
