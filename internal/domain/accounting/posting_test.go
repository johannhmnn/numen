package accounting_test

import (
	"testing"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

func TestNewPostingAcceptsSignedAmounts(t *testing.T) {
	negativePosting, err := accounting.NewPosting("checking", -10000)
	if err != nil {
		t.Fatalf("new negative posting: %v", err)
	}

	positivePosting, err := accounting.NewPosting("groceries-expense", 10000)
	if err != nil {
		t.Fatalf("new positive posting: %v", err)
	}

	if negativePosting.AccountID() != "checking" || positivePosting.AccountID() != "groceries-expense" {
		t.Fatal("expected posting account accessors to return constructor values")
	}

	if negativePosting.Amount() != -10000 || positivePosting.Amount() != 10000 {
		t.Fatal("expected posting amounts to preserve their sign")
	}
}

func TestNewPostingRejectsEmptyAccountID(t *testing.T) {
	_, err := accounting.NewPosting("", 10000)
	if err == nil {
		t.Fatal("expected empty posting account ID error")
	}
}
