package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

// AccountRepository persists accounting accounts in SQLite.
type AccountRepository struct {
	database *sql.DB
}

// NewAccountRepository returns a SQLite-backed account repository.
func NewAccountRepository(database *sql.DB) *AccountRepository {
	return &AccountRepository{database: database}
}

// SaveAccount creates or replaces an account with the same identifier.
func (repository *AccountRepository) SaveAccount(ctx context.Context, account accounting.Account) error {
	if _, err := accounting.NewAccount(account.ID(), account.Name(), account.Type()); err != nil {
		return fmt.Errorf("save account %q: invalid entity: %w", account.ID(), err)
	}

	// SQLite exposes attempted values as excluded so conflicts update in place without deleting referenced rows.
	_, err := repository.database.ExecContext(
		ctx,
		`INSERT INTO accounts (id, name, type) VALUES (?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET name = excluded.name,
		type = excluded.type`,
		string(account.ID()),
		account.Name(),
		string(account.Type()),
	)
	if err != nil {
		return accountSaveError(account, err)
	}

	return nil
}

func accountSaveError(account accounting.Account, cause error) error {
	if isUniqueConstraint(cause) {
		return accountingstore.NameInUseError("account", account.Name())
	}

	return fmt.Errorf("save account %q: %w", account.ID(), cause)
}

// FindAccount fetches one account by identifier or returns an error wrapping ErrNotFound.
func (repository *AccountRepository) FindAccount(ctx context.Context, id accounting.AccountID) (accounting.Account, error) {
	row := repository.database.QueryRowContext(ctx, "SELECT id, name, type FROM accounts WHERE id = ?", string(id))
	account, err := scanAccount(row)
	if errors.Is(err, sql.ErrNoRows) {
		return accounting.Account{}, accountingstore.NotFoundError("account", string(id))
	}
	if err != nil {
		return accounting.Account{}, fmt.Errorf("find account %q: %w", id, err)
	}

	return account, nil
}

// ListAccounts returns validated accounts ordered by name and identifier.
func (repository *AccountRepository) ListAccounts(ctx context.Context) ([]accounting.Account, error) {
	rows, err := repository.database.QueryContext(ctx, "SELECT id, name, type FROM accounts ORDER BY name, id")
	if err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	defer rows.Close()

	return collectAccounts(rows)
}

// DeleteAccount removes an account unless postings still reference it.
func (repository *AccountRepository) DeleteAccount(ctx context.Context, id accounting.AccountID) error {
	return deleteByID(ctx, repository.database, accountDeleteTarget, string(id))
}

// AccountHasPostings reports whether an account participates in any transaction.
func (repository *AccountRepository) AccountHasPostings(ctx context.Context, id accounting.AccountID) (bool, error) {
	var exists bool
	err := repository.database.QueryRowContext(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM postings WHERE account_id = ?)",
		string(id),
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check account postings %q: %w", id, err)
	}

	return exists, nil
}

func scanAccount(scanner rowScanner) (accounting.Account, error) {
	var id string
	var name string
	var accountType string

	if err := scanner.Scan(&id, &name, &accountType); err != nil {
		return accounting.Account{}, err
	}

	return accounting.NewAccount(accounting.AccountID(id), name, accounting.AccountType(accountType))
}

func collectAccounts(rows *sql.Rows) ([]accounting.Account, error) {
	accounts := []accounting.Account{}
	for rows.Next() {
		account, err := scanAccount(rows)
		if err != nil {
			return nil, fmt.Errorf("scan account row: %w", err)
		}
		accounts = append(accounts, account)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate account rows: %w", err)
	}

	return accounts, nil
}
