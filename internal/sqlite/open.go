package sqlite

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// Open connects to SQLite and verifies the database is reachable.
//
// Example:
//
//	db, err := sqlite.Open(":memory:")
func Open(dsn string) (*sql.DB, error) {
	if dsn == "" {
		return nil, fmt.Errorf("invalid SQLite DSN %q: expected non-empty string", dsn)
	}

	database, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open SQLite database %q: %w", dsn, err)
	}

	if err := database.Ping(); err != nil {
		return nil, fmt.Errorf("ping SQLite database %q: %w", dsn, err)
	}

	return database, nil
}
