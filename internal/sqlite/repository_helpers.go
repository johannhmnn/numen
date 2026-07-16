package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	modernsqlite "modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type rowScanner interface {
	Scan(dest ...any) error
}

type rowQueryer interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

type rowsQueryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type deleteTarget uint8

const (
	accountDeleteTarget deleteTarget = iota + 1
	categoryDeleteTarget
)

type deleteInstruction struct {
	statement string
	entity    string
}

func deleteByID(ctx context.Context, database *sql.DB, target deleteTarget, id string) error {
	instruction, err := instructionForDeleteTarget(target)
	if err != nil {
		return err
	}

	result, err := database.ExecContext(ctx, instruction.statement, id)
	if err != nil {
		return deleteExecutionError(instruction.entity, id, err)
	}

	return deletedRowsError(result, instruction.entity, id)
}

func deleteExecutionError(entity string, id string, cause error) error {
	if isForeignKeyConstraint(cause) {
		return accountingstore.InUseError(entity, id)
	}

	return fmt.Errorf("delete %s %q: %w", entity, id, cause)
}

func deletedRowsError(result sql.Result, entity string, id string) error {
	deletedRows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("count deleted %s rows for %q: %w", entity, id, err)
	}
	if deletedRows == 0 {
		return accountingstore.NotFoundError(entity, id)
	}

	return nil
}

func instructionForDeleteTarget(target deleteTarget) (deleteInstruction, error) {
	switch target {
	case accountDeleteTarget:
		return deleteInstruction{"DELETE FROM accounts WHERE id = ?", "account"}, nil
	case categoryDeleteTarget:
		return deleteInstruction{"DELETE FROM categories WHERE id = ?", "category"}, nil
	default:
		return deleteInstruction{}, fmt.Errorf("invalid delete target %d: expected account or category", target)
	}
}

func isForeignKeyConstraint(err error) bool {
	return hasSQLiteErrorCode(err, sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY)
}

func isUniqueConstraint(err error) bool {
	return hasSQLiteErrorCode(err, sqlite3.SQLITE_CONSTRAINT_UNIQUE)
}

func hasSQLiteErrorCode(err error, code int) bool {
	var sqliteError *modernsqlite.Error
	return errors.As(err, &sqliteError) && sqliteError.Code() == code
}
