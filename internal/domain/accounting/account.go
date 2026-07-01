package accounting

import (
	"fmt"
)

type AccountType string

const (
	AccountTypeAsset     AccountType = "Asset"
	AccountTypeLiability AccountType = "Liability"
	AccountTypeEquity    AccountType = "Equity"
	AccountTypeIncome    AccountType = "Income"
	AccountTypeExpense   AccountType = "Expense"
)

type Account struct {
	id   AccountID
	name string
	kind AccountType
}

// NewAccount creates an accounting account with a validated name and type.
//
// Example:
//
//	account, err := accounting.NewAccount("checking", "Checking", accounting.AccountTypeAsset)
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

func (account Account) ID() AccountID {
	return account.id
}

func (account Account) Name() string {
	return account.name
}

func (account Account) Type() AccountType {
	return account.kind
}
