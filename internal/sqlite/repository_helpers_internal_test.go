package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
)

func TestDeleteByIDTranslatesForeignKeyConstraint(t *testing.T) {
	ctx := context.Background()
	database := openInternalTestDatabase(t)
	if err := ApplySchema(ctx, database); err != nil {
		t.Fatalf("apply schema: %v", err)
	}
	insertReferencedAccount(t, ctx, database)

	err := deleteByID(ctx, database, accountDeleteTarget, "checking")
	if !errors.Is(err, accountingstore.ErrInUse) {
		t.Fatalf("delete referenced account error %v: expected ErrInUse", err)
	}
}

func TestDeleteByIDRejectsUnknownTarget(t *testing.T) {
	database := openInternalTestDatabase(t)
	err := deleteByID(context.Background(), database, deleteTarget(99), "checking")

	if err == nil {
		t.Fatal("expected invalid delete target error")
	}
	if !strings.Contains(err.Error(), "99") || !strings.Contains(err.Error(), "account or category") {
		t.Fatalf("unexpected invalid delete target error %q", err.Error())
	}
}

func openInternalTestDatabase(t *testing.T) *sql.DB {
	t.Helper()

	database, err := Open("file:" + t.TempDir() + "/ledger.sqlite")
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

func insertReferencedAccount(t *testing.T, ctx context.Context, database *sql.DB) {
	t.Helper()

	statements := []string{
		`INSERT INTO accounts (id, name, type) VALUES ('checking', 'Checking', 'asset')`,
		`INSERT INTO categories (id, name) VALUES ('groceries', 'Groceries')`,
		`INSERT INTO transactions (id, date, title, payee, category_id)
		 VALUES ('txn-1', '2026-07-11', 'Groceries', 'Market', 'groceries')`,
		`INSERT INTO postings (transaction_id, position, account_id, amount_centavos)
		 VALUES ('txn-1', 0, 'checking', 100)`,
	}
	for _, statement := range statements {
		if _, err := database.ExecContext(ctx, statement); err != nil {
			t.Fatalf("execute fixture statement %q: %v", statement, err)
		}
	}
}
