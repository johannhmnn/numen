package sqlite_test

import (
	"context"
	"testing"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

func TestTransactionRepositorySavesAndFindsTransaction(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)
	accountRepository := projectsqlite.NewAccountRepository(database)
	categoryRepository := projectsqlite.NewCategoryRepository(database)
	transactionRepository := projectsqlite.NewTransactionRepository(database)

	saveTransactionGraph(t, ctx, accountRepository, categoryRepository)
	transaction := mustTransaction(t)
	saveTransaction(t, ctx, transactionRepository, transaction)

	foundTransaction, err := transactionRepository.FindTransaction(ctx, "txn-1")
	if err != nil {
		t.Fatalf("find transaction: %v", err)
	}

	assertTransaction(t, foundTransaction, transaction)
}

func TestTransactionRepositoryRejectsDateThatCannotRoundTrip(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewTransactionRepository(openRepositoryDatabase(t))
	transaction := mustTransactionWithDate(t, accounting.Date{})

	err := repository.SaveTransaction(ctx, transaction)
	assertErrorContains(t, err, "invalid date (0, 0, 0)")

	_, findErr := repository.FindTransaction(ctx, transaction.ID())
	assertErrorIs(t, findErr, accountingstore.ErrNotFound)
}

func TestTransactionRepositoryReportsMissingTransaction(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewTransactionRepository(openRepositoryDatabase(t))

	_, err := repository.FindTransaction(ctx, "missing")
	assertErrorIs(t, err, accountingstore.ErrNotFound)
}

func TestTransactionRepositoryUpdatesTransactionAndPostings(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)
	accountRepository := projectsqlite.NewAccountRepository(database)
	categoryRepository := projectsqlite.NewCategoryRepository(database)
	transactionRepository := projectsqlite.NewTransactionRepository(database)

	saveTransactionGraph(t, ctx, accountRepository, categoryRepository)
	saveTransaction(t, ctx, transactionRepository, mustTransaction(t))
	updatedTransaction := mustUpdatedTransaction(t)
	saveTransaction(t, ctx, transactionRepository, updatedTransaction)

	foundTransaction, err := transactionRepository.FindTransaction(ctx, "txn-1")
	if err != nil {
		t.Fatalf("find transaction: %v", err)
	}

	assertTransaction(t, foundTransaction, updatedTransaction)
}

func TestTransactionRepositoryPreservesPostingsAfterInvalidReplacement(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)
	accountRepository := projectsqlite.NewAccountRepository(database)
	categoryRepository := projectsqlite.NewCategoryRepository(database)
	transactionRepository := projectsqlite.NewTransactionRepository(database)

	saveTransactionGraph(t, ctx, accountRepository, categoryRepository)
	transaction := mustTransaction(t)
	saveTransaction(t, ctx, transactionRepository, transaction)

	if err := transaction.ReplacePostings([]accounting.Posting{{}}); err == nil {
		t.Fatal("expected invalid replacement error")
	}
	saveTransaction(t, ctx, transactionRepository, transaction)

	foundTransaction, err := transactionRepository.FindTransaction(ctx, transaction.ID())
	if err != nil {
		t.Fatalf("find transaction after invalid replacement: %v", err)
	}
	assertTransaction(t, foundTransaction, transaction)
}

func saveTransactionGraph(
	t *testing.T,
	ctx context.Context,
	accountRepository *projectsqlite.AccountRepository,
	categoryRepository *projectsqlite.CategoryRepository,
) {
	t.Helper()

	saveAccount(t, ctx, accountRepository, mustAccount(t, "checking", "Checking", accounting.AccountTypeAsset))
	saveAccount(t, ctx, accountRepository, mustAccount(t, "groceries-expense", "Groceries Expense", accounting.AccountTypeExpense))
	saveCategory(t, ctx, categoryRepository, mustCategory(t, "groceries", "Groceries"))
}

func saveTransaction(
	t *testing.T,
	ctx context.Context,
	repository *projectsqlite.TransactionRepository,
	transaction accounting.Transaction,
) {
	t.Helper()

	if err := repository.SaveTransaction(ctx, transaction); err != nil {
		t.Fatalf("save transaction: %v", err)
	}
}

func mustTransactionWithDate(t *testing.T, date accounting.Date) accounting.Transaction {
	t.Helper()

	transaction, err := accounting.NewTransaction(
		"invalid-date",
		date,
		"Groceries",
		"Market",
		"groceries",
		mustPostings(t),
	)
	if err != nil {
		t.Fatalf("new transaction: %v", err)
	}

	return transaction
}

func mustUpdatedTransaction(t *testing.T) accounting.Transaction {
	t.Helper()

	transaction := mustTransaction(t)
	if err := transaction.SetTitle("Weekly groceries"); err != nil {
		t.Fatalf("set title: %v", err)
	}

	postings := []accounting.Posting{
		mustPosting(t, "checking", -15000),
		mustPosting(t, "groceries-expense", 15000),
	}
	if err := transaction.ReplacePostings(postings); err != nil {
		t.Fatalf("replace postings: %v", err)
	}

	return transaction
}

func assertTransaction(t *testing.T, actual accounting.Transaction, expected accounting.Transaction) {
	t.Helper()

	if actual.ID() != expected.ID() || actual.Date() != expected.Date() || actual.Title() != expected.Title() ||
		actual.Payee() != expected.Payee() || actual.CategoryID() != expected.CategoryID() {
		t.Fatalf("unexpected transaction %#v: expected %#v", actual, expected)
	}
	assertTransactionPostings(t, actual.Postings(), expected.Postings())
}

func assertTransactionPostings(t *testing.T, actual []accounting.Posting, expected []accounting.Posting) {
	t.Helper()

	if len(actual) != len(expected) {
		t.Fatalf("unexpected posting count %d: expected %d", len(actual), len(expected))
	}

	for index, actualPosting := range actual {
		expectedPosting := expected[index]
		if actualPosting.AccountID() != expectedPosting.AccountID() || actualPosting.Amount() != expectedPosting.Amount() {
			t.Fatalf("unexpected posting at index %d: %#v expected %#v", index, actualPosting, expectedPosting)
		}
	}
}
