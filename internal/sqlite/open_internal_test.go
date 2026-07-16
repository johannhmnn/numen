package sqlite

import "testing"

func TestSQLiteDSNWithForeignKeysAddsPragma(t *testing.T) {
	tests := map[string]string{
		":memory:":                             ":memory:?_pragma=foreign_keys(1)",
		"file:/tmp/ledger.sqlite?cache=shared": "file:/tmp/ledger.sqlite?cache=shared&_pragma=foreign_keys(1)",
		"file::memory:?":                       "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?cache=shared&":          "file::memory:?cache=shared&_pragma=foreign_keys(1)",
	}

	for dsn, expectedDSN := range tests {
		actualDSN := sqliteDSNWithForeignKeys(dsn)
		if actualDSN != expectedDSN {
			t.Fatalf("sqliteDSNWithForeignKeys(%q) = %q, expected %q", dsn, actualDSN, expectedDSN)
		}
	}
}

func TestSQLiteDSNWithForeignKeysCanonicalizesExistingPragmas(t *testing.T) {
	tests := map[string]string{
		"file::memory:?_pragma=foreign_keys(1)":                                        "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?_pragma=foreign_keys=on":                                        "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?_pragma=foreign_keys(0)":                                        "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?_pragma=foreign_keys":                                           "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?_pragma=foreign_keys%3Dtrue":                                    "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?_pragma=foreign_keys(0)&_pragma=foreign_keys(1)":                "file::memory:?_pragma=foreign_keys(1)",
		"file::memory:?%5Fpragma=foreign_keys%3Don&cache=shared":                       "file::memory:?cache=shared&_pragma=foreign_keys(1)",
		"file::memory:?cache=shared&_pragma=journal_mode(WAL)&_pragma=foreign_keys(0)": "file::memory:?cache=shared&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)",
	}

	for dsn, expectedDSN := range tests {
		actualDSN := sqliteDSNWithForeignKeys(dsn)
		if actualDSN != expectedDSN {
			t.Fatalf("sqliteDSNWithForeignKeys(%q) = %q, expected %q", dsn, actualDSN, expectedDSN)
		}
	}
}
