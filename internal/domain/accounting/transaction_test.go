package accounting_test

import (
	"testing"
	"time"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

func TestNewTransactionRejectsEmptyTitle(t *testing.T) {
	date := mustDate(t)
	postings := mustBalancedPostings(t)

	_, err := accounting.NewTransaction("txn-1", date, "", "Market", "groceries", postings)
	if err == nil {
		t.Fatal("expected empty title error")
	}
}

func TestNewTransactionRejectsWhitespaceOnlyTitle(t *testing.T) {
	date := mustDate(t)
	postings := mustBalancedPostings(t)

	_, err := accounting.NewTransaction("txn-1", date, "   ", "Market", "groceries", postings)
	if err == nil {
		t.Fatal("expected whitespace-only title error")
	}
}

func TestNewTransactionRejectsFewerThanTwoPostings(t *testing.T) {
	date := mustDate(t)
	posting := mustPosting(t, "checking", -10000)

	_, err := accounting.NewTransaction("txn-1", date, "Groceries", "Market", "groceries", []accounting.Posting{posting})
	if err == nil {
		t.Fatal("expected postings count error")
	}
}

func TestNewTransactionRejectsUnbalancedPostings(t *testing.T) {
	date := mustDate(t)
	postings := []accounting.Posting{
		mustPosting(t, "checking", -10000),
		mustPosting(t, "groceries-expense", 9000),
	}

	_, err := accounting.NewTransaction("txn-1", date, "Groceries", "Market", "groceries", postings)
	if err == nil {
		t.Fatal("expected unbalanced postings error")
	}
}

func TestNewTransactionAcceptsBalancedExpenseExample(t *testing.T) {
	date := mustDate(t)
	postings := mustBalancedPostings(t)

	transaction, err := accounting.NewTransaction("txn-1", date, "Groceries", "Market", "groceries", postings)
	if err != nil {
		t.Fatalf("new balanced transaction: %v", err)
	}

	if transaction.Title() != "Groceries" {
		t.Fatalf("unexpected title %q", transaction.Title())
	}
}

func TestNewTransactionSupportsNegativeIncreaseExamples(t *testing.T) {
	date := mustDate(t)
	postings := []accounting.Posting{
		mustPosting(t, "salary-income", -250000),
		mustPosting(t, "checking", 250000),
	}

	_, err := accounting.NewTransaction("txn-2", date, "Salary", "Employer", "income", postings)
	if err != nil {
		t.Fatalf("new income transaction: %v", err)
	}
}

func TestTransactionSetTitleRejectsInvalidValue(t *testing.T) {
	transaction := mustTransaction(t)

	err := transaction.SetTitle("   ")
	if err == nil {
		t.Fatal("expected whitespace-only title error")
	}
}

func TestTransactionSetCategoryIDRejectsEmptyValue(t *testing.T) {
	transaction := mustTransaction(t)

	err := transaction.SetCategoryID("")
	if err == nil {
		t.Fatal("expected empty category ID error")
	}
}

func TestTransactionReplacePostingsAcceptsBalancedSet(t *testing.T) {
	transaction := mustTransaction(t)
	postings := []accounting.Posting{
		mustPosting(t, "cash", -5000),
		mustPosting(t, "transport-expense", 5000),
	}

	if err := transaction.ReplacePostings(postings); err != nil {
		t.Fatalf("replace postings: %v", err)
	}

	replacedPostings := transaction.Postings()
	if len(replacedPostings) != 2 {
		t.Fatalf("unexpected postings length %d", len(replacedPostings))
	}

	if replacedPostings[0].AccountID() != "cash" || replacedPostings[1].AccountID() != "transport-expense" {
		t.Fatal("expected postings to be replaced")
	}
}

func TestTransactionReplacePostingsRejectsUnbalancedSet(t *testing.T) {
	transaction := mustTransaction(t)
	postings := []accounting.Posting{
		mustPosting(t, "cash", -5000),
		mustPosting(t, "transport-expense", 3000),
	}

	err := transaction.ReplacePostings(postings)
	if err == nil {
		t.Fatal("expected unbalanced postings error")
	}
}

func TestTransactionReplacePostingsRejectsFewerThanTwoPostings(t *testing.T) {
	transaction := mustTransaction(t)
	postings := []accounting.Posting{
		mustPosting(t, "cash", -5000),
	}

	err := transaction.ReplacePostings(postings)
	if err == nil {
		t.Fatal("expected postings count error")
	}
}

func TestTransactionPostingsReturnsCopy(t *testing.T) {
	transaction := mustTransaction(t)

	postings := transaction.Postings()
	postings[0] = mustPosting(t, "cash", -5000)

	originalPostings := transaction.Postings()
	if originalPostings[0].AccountID() != "checking" {
		t.Fatal("expected transaction postings to remain unchanged")
	}
}

func mustDate(t *testing.T) accounting.Date {
	t.Helper()

	date, err := accounting.NewDate(2026, time.June, 27)
	if err != nil {
		t.Fatalf("new date: %v", err)
	}

	return date
}

func mustPosting(t *testing.T, accountID accounting.AccountID, amount int64) accounting.Posting {
	t.Helper()

	posting, err := accounting.NewPosting(accountID, amount)
	if err != nil {
		t.Fatalf("new posting: %v", err)
	}

	return posting
}

func mustTransaction(t *testing.T) accounting.Transaction {
	t.Helper()

	transaction, err := accounting.NewTransaction("txn-1", mustDate(t), "Groceries", "Market", "groceries", mustBalancedPostings(t))
	if err != nil {
		t.Fatalf("new transaction: %v", err)
	}

	return transaction
}

func mustBalancedPostings(t *testing.T) []accounting.Posting {
	t.Helper()

	return []accounting.Posting{
		mustPosting(t, "checking", -10000),
		mustPosting(t, "groceries-expense", 10000),
	}
}
