package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

// TransactionRepository persists balanced transactions and ordered postings in SQLite.
type TransactionRepository struct {
	database *sql.DB
}

// NewTransactionRepository returns a SQLite-backed transaction repository.
func NewTransactionRepository(database *sql.DB) *TransactionRepository {
	return &TransactionRepository{database: database}
}

// SaveTransaction atomically creates or replaces a transaction and its postings.
func (repository *TransactionRepository) SaveTransaction(ctx context.Context, transaction accounting.Transaction) error {
	if err := validateTransactionDate(transaction); err != nil {
		return err
	}

	sqlTransaction, err := repository.database.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin save transaction %q: %w", transaction.ID(), err)
	}

	if err := saveTransactionEnvelope(ctx, sqlTransaction, transaction); err != nil {
		return rollbackSave(sqlTransaction, "transaction", string(transaction.ID()), err)
	}
	if err := replaceTransactionPostings(ctx, sqlTransaction, transaction); err != nil {
		return rollbackSave(sqlTransaction, "transaction", string(transaction.ID()), err)
	}
	if err := sqlTransaction.Commit(); err != nil {
		return fmt.Errorf("commit transaction %q: %w", transaction.ID(), err)
	}

	return nil
}

func validateTransactionDate(transaction accounting.Transaction) error {
	date := transaction.Date()
	if _, err := accounting.NewDate(date.Year(), date.Month(), date.Day()); err != nil {
		return fmt.Errorf("save transaction %q: invalid date: %w", transaction.ID(), err)
	}

	return nil
}

// FindTransaction fetches one transaction and its ordered postings from a consistent read snapshot.
func (repository *TransactionRepository) FindTransaction(
	ctx context.Context,
	id accounting.TransactionID,
) (accounting.Transaction, error) {
	snapshot, err := repository.database.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return accounting.Transaction{}, fmt.Errorf("begin find transaction %q: %w", id, err)
	}

	transaction, err := findTransactionSnapshot(ctx, snapshot, id)
	if err != nil {
		return accounting.Transaction{}, rollbackFind(snapshot, id, err)
	}
	if err := snapshot.Commit(); err != nil {
		return accounting.Transaction{}, fmt.Errorf("commit find transaction %q: %w", id, err)
	}

	return transaction, nil
}

func findTransactionSnapshot(ctx context.Context, snapshot *sql.Tx, id accounting.TransactionID) (accounting.Transaction, error) {
	envelope, err := findTransactionEnvelope(ctx, snapshot, id)
	if err != nil {
		return accounting.Transaction{}, err
	}

	postings, err := findTransactionPostings(ctx, snapshot, id)
	if err != nil {
		return accounting.Transaction{}, err
	}

	return accounting.NewTransaction(envelope.id, envelope.date, envelope.title, envelope.payee, envelope.categoryID, postings)
}

type transactionEnvelope struct {
	id         accounting.TransactionID
	date       accounting.Date
	title      string
	payee      string
	categoryID accounting.CategoryID
}

func saveTransactionEnvelope(ctx context.Context, sqlTransaction *sql.Tx, transaction accounting.Transaction) error {
	_, err := sqlTransaction.ExecContext(
		ctx,
		`INSERT INTO transactions (id, date, title, payee, category_id) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET date = excluded.date, title = excluded.title,
		payee = excluded.payee, category_id = excluded.category_id`,
		string(transaction.ID()),
		transaction.Date().String(),
		transaction.Title(),
		transaction.Payee(),
		string(transaction.CategoryID()),
	)
	if err != nil {
		return fmt.Errorf("save transaction envelope %q: %w", transaction.ID(), err)
	}

	return nil
}

func replaceTransactionPostings(ctx context.Context, sqlTransaction *sql.Tx, transaction accounting.Transaction) error {
	if _, err := sqlTransaction.ExecContext(ctx, "DELETE FROM postings WHERE transaction_id = ?", string(transaction.ID())); err != nil {
		return fmt.Errorf("delete postings for transaction %q: %w", transaction.ID(), err)
	}

	for position, posting := range transaction.Postings() {
		if err := savePosting(ctx, sqlTransaction, transaction.ID(), position, posting); err != nil {
			return err
		}
	}

	return nil
}

func savePosting(
	ctx context.Context,
	sqlTransaction *sql.Tx,
	transactionID accounting.TransactionID,
	position int,
	posting accounting.Posting,
) error {
	_, err := sqlTransaction.ExecContext(
		ctx,
		`INSERT INTO postings (transaction_id, position, account_id, amount_centavos)
		VALUES (?, ?, ?, ?)`,
		string(transactionID),
		position,
		string(posting.AccountID()),
		posting.Amount(),
	)
	if err != nil {
		return fmt.Errorf("save posting %d for transaction %q: %w", position, transactionID, err)
	}

	return nil
}

func findTransactionEnvelope(
	ctx context.Context,
	database rowQueryer,
	id accounting.TransactionID,
) (transactionEnvelope, error) {
	row := database.QueryRowContext(ctx, "SELECT id, date, title, payee, category_id FROM transactions WHERE id = ?", string(id))
	envelope, err := scanTransactionEnvelope(row)
	if errors.Is(err, sql.ErrNoRows) {
		return transactionEnvelope{}, accountingstore.NotFoundError("transaction", string(id))
	}
	if err != nil {
		return transactionEnvelope{}, fmt.Errorf("find transaction %q: %w", id, err)
	}

	return envelope, nil
}

func scanTransactionEnvelope(scanner rowScanner) (transactionEnvelope, error) {
	var id string
	var dateText string
	var title string
	var payee string
	var categoryID string

	if err := scanner.Scan(&id, &dateText, &title, &payee, &categoryID); err != nil {
		return transactionEnvelope{}, err
	}

	date, err := parseStoredDate(dateText)
	if err != nil {
		return transactionEnvelope{}, err
	}

	return transactionEnvelope{accounting.TransactionID(id), date, title, payee, accounting.CategoryID(categoryID)}, nil
}

func findTransactionPostings(ctx context.Context, database rowsQueryer, id accounting.TransactionID) ([]accounting.Posting, error) {
	rows, err := database.QueryContext(
		ctx,
		"SELECT account_id, amount_centavos FROM postings WHERE transaction_id = ? ORDER BY position",
		string(id),
	)
	if err != nil {
		return nil, fmt.Errorf("query postings for transaction %q: %w", id, err)
	}
	defer rows.Close()

	return collectPostings(rows, id)
}

func collectPostings(rows *sql.Rows, transactionID accounting.TransactionID) ([]accounting.Posting, error) {
	postings := []accounting.Posting{}
	for rows.Next() {
		posting, err := scanPosting(rows)
		if err != nil {
			return nil, fmt.Errorf("scan posting for transaction %q: %w", transactionID, err)
		}
		postings = append(postings, posting)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate postings for transaction %q: %w", transactionID, err)
	}

	return postings, nil
}

func scanPosting(scanner rowScanner) (accounting.Posting, error) {
	var accountID string
	var amount int64

	if err := scanner.Scan(&accountID, &amount); err != nil {
		return accounting.Posting{}, err
	}

	return accounting.NewPosting(accounting.AccountID(accountID), amount)
}

func parseStoredDate(value string) (accounting.Date, error) {
	parsedTime, err := time.Parse(time.DateOnly, value)
	if err != nil {
		return accounting.Date{}, fmt.Errorf("invalid stored date %q: expected YYYY-MM-DD", value)
	}

	return accounting.NewDate(parsedTime.Year(), parsedTime.Month(), parsedTime.Day())
}

func rollbackSave(sqlTransaction *sql.Tx, entity string, id string, cause error) error {
	if rollbackErr := sqlTransaction.Rollback(); rollbackErr != nil {
		return fmt.Errorf("save %s %q: %w; rollback failed: %w", entity, id, cause, rollbackErr)
	}

	return cause
}

func rollbackFind(snapshot *sql.Tx, id accounting.TransactionID, cause error) error {
	if rollbackErr := snapshot.Rollback(); rollbackErr != nil {
		return fmt.Errorf("find transaction %q: %w; rollback failed: %w", id, cause, rollbackErr)
	}

	return cause
}
