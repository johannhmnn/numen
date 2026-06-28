package sqlite_test

import (
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
