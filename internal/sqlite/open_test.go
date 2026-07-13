package sqlite_test

import (
	"context"
	"path/filepath"
	"testing"

	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

func TestOpenRejectsEmptyDSN(t *testing.T) {
	_, err := projectsqlite.Open("")
	if err == nil {
		t.Fatal("expected an error for an empty DSN")
	}
}

func TestOpenInMemoryDatabase(t *testing.T) {
	database, err := projectsqlite.Open(":memory:")
	if err != nil {
		t.Fatalf("open in-memory database: %v", err)
	}

	t.Cleanup(func() {
		if closeErr := database.Close(); closeErr != nil {
			t.Fatalf("close database: %v", closeErr)
		}
	})

	var value int
	if err := database.QueryRow("SELECT 1").Scan(&value); err != nil {
		t.Fatalf("query smoke test: %v", err)
	}

	if value != 1 {
		t.Fatalf("unexpected query result %d: expected %d", value, 1)
	}
}

func TestOpenEnablesForeignKeysOnAdditionalConnections(t *testing.T) {
	ctx := context.Background()
	dsn := "file:" + filepath.Join(t.TempDir(), "ledger.sqlite")
	database, err := projectsqlite.Open(dsn)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := database.Close(); closeErr != nil {
			t.Fatalf("close database: %v", closeErr)
		}
	})

	firstConnection, err := database.Conn(ctx)
	if err != nil {
		t.Fatalf("reserve first connection: %v", err)
	}
	defer firstConnection.Close()

	assertForeignKeysEnabled(t, database.QueryRowContext(ctx, "PRAGMA foreign_keys"))
}

func assertForeignKeysEnabled(t *testing.T, scanner interface {
	Scan(dest ...interface{}) error
}) {
	t.Helper()

	var enabled int
	if err := scanner.Scan(&enabled); err != nil {
		t.Fatalf("query foreign key pragma: %v", err)
	}
	if enabled != 1 {
		t.Fatalf("unexpected foreign key pragma %d: expected %d", enabled, 1)
	}
}
