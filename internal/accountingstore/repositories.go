package accountingstore

import (
	"context"
	"errors"
	"fmt"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

// ErrNotFound identifies repository lookups and deletes for missing records.
var ErrNotFound = errors.New("record not found")

// ErrInUse identifies records that cannot be deleted while they are referenced.
var ErrInUse = errors.New("record is referenced")

// ErrNameInUse identifies account or category names already assigned within the same entity type.
var ErrNameInUse = errors.New("record name is already in use")

// AccountRepository defines persistence and reference checks for accounting accounts.
type AccountRepository interface {
	// SaveAccount creates or replaces an account with the same identifier.
	SaveAccount(ctx context.Context, account accounting.Account) error
	// FindAccount returns one account or an error wrapping ErrNotFound.
	FindAccount(ctx context.Context, id accounting.AccountID) (accounting.Account, error)
	// ListAccounts returns accounts ordered for stable presentation.
	ListAccounts(ctx context.Context) ([]accounting.Account, error)
	// DeleteAccount removes an unreferenced account or returns ErrInUse.
	DeleteAccount(ctx context.Context, id accounting.AccountID) error
	// AccountHasPostings reports whether deleting an account would break posting references.
	AccountHasPostings(ctx context.Context, id accounting.AccountID) (bool, error)
}

// CategoryRepository defines persistence while distinguishing categories from accounts.
type CategoryRepository interface {
	// SaveCategory creates or replaces a category with the same identifier.
	SaveCategory(ctx context.Context, category accounting.Category) error
	// FindCategory returns one category or an error wrapping ErrNotFound.
	FindCategory(ctx context.Context, id accounting.CategoryID) (accounting.Category, error)
	// ListCategories returns categories ordered for stable presentation.
	ListCategories(ctx context.Context) ([]accounting.Category, error)
	// DeleteCategory removes an unreferenced category or returns ErrInUse.
	DeleteCategory(ctx context.Context, id accounting.CategoryID) error
	// CategoryHasTransactions reports whether deleting a category would break transaction references.
	CategoryHasTransactions(ctx context.Context, id accounting.CategoryID) (bool, error)
}

// TransactionRepository persists balanced transactions with their ordered postings.
type TransactionRepository interface {
	// SaveTransaction atomically creates or replaces a transaction and its postings.
	SaveTransaction(ctx context.Context, transaction accounting.Transaction) error
	// FindTransaction returns one transaction or an error wrapping ErrNotFound.
	FindTransaction(ctx context.Context, id accounting.TransactionID) (accounting.Transaction, error)
}

// NotFoundError wraps ErrNotFound with the missing entity identifier.
func NotFoundError(entity string, id string) error {
	return fmt.Errorf("%s %q: %w", entity, id, ErrNotFound)
}

// InUseError wraps ErrInUse with the referenced entity identifier.
func InUseError(entity string, id string) error {
	return fmt.Errorf("%s %q: %w", entity, id, ErrInUse)
}

// NameInUseError wraps ErrNameInUse with the conflicting display name.
func NameInUseError(entity string, name string) error {
	return fmt.Errorf("%s name %q: %w", entity, name, ErrNameInUse)
}
