package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"
	"time"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

type databaseQuery struct {
	database *sql.DB
}

func openSchemaDatabase(t *testing.T) *sql.DB {
	t.Helper()

	database, err := projectsqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open database: %v", err)
	}

	t.Cleanup(func() {
		if closeErr := database.Close(); closeErr != nil {
			t.Fatalf("close database: %v", closeErr)
		}
	})

	return database
}

func openRepositoryDatabase(t *testing.T) *sql.DB {
	t.Helper()

	database := openSchemaDatabase(t)
	if err := projectsqlite.ApplySchema(context.Background(), database); err != nil {
		t.Fatalf("apply schema: %v", err)
	}

	return database
}

func assertTableExists(t *testing.T, query databaseQuery, tableName string) {
	t.Helper()

	var existingName string
	err := query.database.QueryRow(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
		tableName,
	).Scan(&existingName)
	if err != nil {
		t.Fatalf("find table %q: %v", tableName, err)
	}
	if existingName != tableName {
		t.Fatalf("unexpected table %q: expected %q", existingName, tableName)
	}
}

func assertErrorIs(t *testing.T, err error, target error) {
	t.Helper()

	if !errors.Is(err, target) {
		t.Fatalf("expected error %v to wrap %v", err, target)
	}
}

func assertErrorContains(t *testing.T, err error, expected string) {
	t.Helper()

	if err == nil || !strings.Contains(err.Error(), expected) {
		t.Fatalf("expected error %v to contain %q", err, expected)
	}
}

func mustAccount(t *testing.T, id accounting.AccountID, name string, accountType accounting.AccountType) accounting.Account {
	t.Helper()

	account, err := accounting.NewAccount(id, name, accountType)
	if err != nil {
		t.Fatalf("new account: %v", err)
	}

	return account
}

func mustCategory(t *testing.T, id accounting.CategoryID, name string) accounting.Category {
	t.Helper()

	category, err := accounting.NewCategory(id, name)
	if err != nil {
		t.Fatalf("new category: %v", err)
	}

	return category
}

func mustTransaction(t *testing.T) accounting.Transaction {
	t.Helper()

	transactionDate, err := accounting.NewDate(2026, time.July, 6)
	if err != nil {
		t.Fatalf("new date: %v", err)
	}

	transaction, err := accounting.NewTransaction(
		"txn-1",
		transactionDate,
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

func mustPostings(t *testing.T) []accounting.Posting {
	t.Helper()

	return []accounting.Posting{
		mustPosting(t, "checking", -10000),
		mustPosting(t, "groceries-expense", 10000),
	}
}

func mustPosting(t *testing.T, accountID accounting.AccountID, amount int64) accounting.Posting {
	t.Helper()

	posting, err := accounting.NewPosting(accountID, amount)
	if err != nil {
		t.Fatalf("new posting: %v", err)
	}

	return posting
}
