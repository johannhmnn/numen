package sqlite

import (
	"context"
	"database/sql"
	"fmt"
)

// ApplySchema creates missing local ledger tables in a database opened through Open.
func ApplySchema(ctx context.Context, database *sql.DB) error {
	for _, statement := range schemaStatements {
		if _, err := database.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("apply SQLite schema statement %q: %w", statement, err)
		}
	}

	return nil
}

var schemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE
	)`,
	`CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY,
		date TEXT NOT NULL,
		title TEXT NOT NULL,
		payee TEXT NOT NULL,
		category_id TEXT NOT NULL REFERENCES categories(id)
	)`,
	`CREATE TABLE IF NOT EXISTS postings (
		transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
		position INTEGER NOT NULL,
		account_id TEXT NOT NULL REFERENCES accounts(id),
		amount_centavos INTEGER NOT NULL,
		PRIMARY KEY (transaction_id, position)
	)`,
}
