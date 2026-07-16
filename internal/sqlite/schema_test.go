package sqlite_test

import (
	"context"
	"testing"

	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

func TestApplySchemaCreatesLedgerTables(t *testing.T) {
	ctx := context.Background()
	database := openSchemaDatabase(t)

	if err := projectsqlite.ApplySchema(ctx, database); err != nil {
		t.Fatalf("apply schema: %v", err)
	}

	for _, tableName := range []string{"accounts", "categories", "transactions", "postings"} {
		assertTableExists(t, databaseQuery{database}, tableName)
	}
}
