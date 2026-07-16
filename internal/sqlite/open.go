package sqlite

import (
	"database/sql"
	"fmt"
	"net/url"
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
	databasePath, query, found := strings.Cut(dsn, "?")
	if !found {
		return dsn + "?" + foreignKeysPragmaQuery
	}

	parameters := queryParametersWithoutForeignKeys(query)
	parameters = append(parameters, foreignKeysPragmaQuery)
	return databasePath + "?" + strings.Join(parameters, "&")
}

func queryParametersWithoutForeignKeys(query string) []string {
	parameters := make([]string, 0)
	for parameter := range strings.SplitSeq(query, "&") {
		if parameter == "" || isForeignKeysPragmaParameter(parameter) {
			continue
		}
		parameters = append(parameters, parameter)
	}

	return parameters
}

func isForeignKeysPragmaParameter(parameter string) bool {
	encodedName, encodedValue, found := strings.Cut(parameter, "=")
	if !found {
		return false
	}

	name, nameErr := url.QueryUnescape(encodedName)
	pragma, pragmaErr := url.QueryUnescape(encodedValue)
	if nameErr != nil || pragmaErr != nil || !strings.EqualFold(name, "_pragma") {
		return false
	}

	return strings.EqualFold(sqlitePragmaName(pragma), "foreign_keys")
}

func sqlitePragmaName(pragma string) string {
	normalizedPragma := strings.TrimSpace(pragma)
	name, _, found := strings.Cut(normalizedPragma, "=")
	if !found {
		name, _, found = strings.Cut(normalizedPragma, "(")
	}
	if !found {
		return normalizedPragma
	}

	return strings.TrimSpace(name)
}
