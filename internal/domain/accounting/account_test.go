package accounting_test

import (
	"strings"
	"testing"
	"time"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

func TestNewAccountAcceptsEachValidAccountType(t *testing.T) {
	validTypes := []accounting.AccountType{
		accounting.AccountTypeAsset,
		accounting.AccountTypeLiability,
		accounting.AccountTypeEquity,
		accounting.AccountTypeIncome,
		accounting.AccountTypeExpense,
	}

	for _, validType := range validTypes {
		_, err := accounting.NewAccount("account-1", "Checking", validType)
		if err != nil {
			t.Fatalf("new account with type %q: %v", validType, err)
		}
	}
}

func TestNewAccountExposesAccessorValues(t *testing.T) {
	account, err := accounting.NewAccount("checking", "Checking", accounting.AccountTypeAsset)
	if err != nil {
		t.Fatalf("new account: %v", err)
	}

	if account.ID() != "checking" || account.Name() != "Checking" || account.Type() != accounting.AccountTypeAsset {
		t.Fatal("expected account accessors to return constructor values")
	}
}

func TestNewAccountTrimsNameAndPreservesSpelling(t *testing.T) {
	account, err := accounting.NewAccount("credit-card", "  Cartão:  Crédito  ", accounting.AccountTypeLiability)
	if err != nil {
		t.Fatalf("new account: %v", err)
	}

	if account.Name() != "Cartão:  Crédito" {
		t.Fatalf("account name %q: expected preserved trimmed spelling", account.Name())
	}
}

func TestNewAccountRejectsInvalidAccountType(t *testing.T) {
	_, err := accounting.NewAccount("account-1", "Checking", accounting.AccountType("Bank"))
	if err == nil {
		t.Fatal("expected invalid account type error")
	}

	if !strings.Contains(err.Error(), `invalid account type "Bank"`) {
		t.Fatalf("unexpected error %q", err.Error())
	}
}

func TestNewAccountRejectsEmptyName(t *testing.T) {
	_, err := accounting.NewAccount("account-1", "", accounting.AccountTypeAsset)
	if err == nil {
		t.Fatal("expected empty name error")
	}
}

func TestNewAccountRejectsWhitespaceOnlyName(t *testing.T) {
	_, err := accounting.NewAccount("account-1", "   ", accounting.AccountTypeAsset)
	if err == nil {
		t.Fatal("expected whitespace-only name error")
	}
}

func TestNewDateAcceptsValidCalendarDate(t *testing.T) {
	date, err := accounting.NewDate(2026, time.June, 27)
	if err != nil {
		t.Fatalf("new date: %v", err)
	}

	if date.String() != "2026-06-27" {
		t.Fatalf("unexpected date %q", date.String())
	}
}

func TestNewDateRejectsImpossibleCalendarDate(t *testing.T) {
	_, err := accounting.NewDate(2026, time.February, 30)
	if err == nil {
		t.Fatal("expected impossible date error")
	}

	if !strings.Contains(err.Error(), "invalid date (2026, 2, 30)") {
		t.Fatalf("unexpected error %q", err.Error())
	}
}
