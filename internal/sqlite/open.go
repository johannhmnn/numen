package sqlite

import (
	"database/sql"
	"fmt"
	"net/url"
	"slices"
	"strings"

	_ "modernc.org/sqlite"
)

const foreignKeysPragmaQuery = "_pragma=foreign_keys(1)"

// Open returns a verified SQLite connection pool with foreign-key enforcement enabled.
func Open(dsn string) (*sql.DB, error) {
	if dsn == "" {
		return nil, fmt.Errorf("invalid SQLite DSN %q: expected non-empty string", dsn)
	}

	database, err := sql.Open("sqlite", sqliteDSNWithForeignKeys(dsn))
	if err != nil {
		return nil, fmt.Errorf("open SQLite database %q: %w", dsn, err)
	}

	if err := database.Ping(); err != nil {
		return nil, fmt.Errorf("ping SQLite database %q: %w", dsn, err)
	}

	return database, nil
}

func sqliteDSNWithForeignKeys(dsn string) string {
	if dsnHasEnabledForeignKeysPragma(dsn) {
		return dsn
	}

	separator := "?"
	if strings.Contains(dsn, "?") {
		separator = "&"
	}
	if strings.HasSuffix(dsn, "?") || strings.HasSuffix(dsn, "&") {
		separator = ""
	}

	return dsn + separator + foreignKeysPragmaQuery
}

func dsnHasEnabledForeignKeysPragma(dsn string) bool {
	_, query, found := strings.Cut(dsn, "?")
	if !found {
		return false
	}

	values, err := url.ParseQuery(query)
	if err != nil {
		return false
	}

	return slices.ContainsFunc(values["_pragma"], pragmaEnablesForeignKeys)
}

func pragmaEnablesForeignKeys(pragma string) bool {
	normalizedPragma := strings.TrimSpace(pragma)
	name, value, found := strings.Cut(normalizedPragma, "=")
	if !found {
		name, value, found = strings.Cut(normalizedPragma, "(")
	}
	if !found || !strings.EqualFold(strings.TrimSpace(name), "foreign_keys") {
		return false
	}

	normalizedValue := strings.Trim(strings.ToLower(strings.TrimSpace(value)), " )")
	return normalizedValue == "1" || normalizedValue == "on" ||
		normalizedValue == "true" || normalizedValue == "yes"
}
