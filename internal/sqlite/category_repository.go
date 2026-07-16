package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

// CategoryRepository persists reporting categories in SQLite.
type CategoryRepository struct {
	database *sql.DB
}

// NewCategoryRepository returns a SQLite-backed category repository.
func NewCategoryRepository(database *sql.DB) *CategoryRepository {
	return &CategoryRepository{database: database}
}

// SaveCategory creates or replaces a category with the same identifier.
func (repository *CategoryRepository) SaveCategory(ctx context.Context, category accounting.Category) error {
	if _, err := accounting.NewCategory(category.ID(), category.Name()); err != nil {
		return fmt.Errorf("save category %q: invalid entity: %w", category.ID(), err)
	}

	_, err := repository.database.ExecContext(
		ctx,
		`INSERT INTO categories (id, name) VALUES (?, ?)
		ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
		string(category.ID()),
		category.Name(),
	)
	if err != nil {
		return categorySaveError(category, err)
	}

	return nil
}

func categorySaveError(category accounting.Category, cause error) error {
	if isUniqueConstraint(cause) {
		return accountingstore.NameInUseError("category", category.Name())
	}

	return fmt.Errorf("save category %q: %w", category.ID(), cause)
}

// FindCategory fetches one category by identifier or returns an error wrapping ErrNotFound.
func (repository *CategoryRepository) FindCategory(ctx context.Context, id accounting.CategoryID) (accounting.Category, error) {
	row := repository.database.QueryRowContext(ctx, "SELECT id, name FROM categories WHERE id = ?", string(id))
	category, err := scanCategory(row)
	if errors.Is(err, sql.ErrNoRows) {
		return accounting.Category{}, accountingstore.NotFoundError("category", string(id))
	}
	if err != nil {
		return accounting.Category{}, fmt.Errorf("find category %q: %w", id, err)
	}

	return category, nil
}

// ListCategories returns validated categories ordered by name and identifier.
func (repository *CategoryRepository) ListCategories(ctx context.Context) ([]accounting.Category, error) {
	rows, err := repository.database.QueryContext(ctx, "SELECT id, name FROM categories ORDER BY name, id")
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	return collectCategories(rows)
}

// DeleteCategory removes a category unless transactions still reference it.
func (repository *CategoryRepository) DeleteCategory(ctx context.Context, id accounting.CategoryID) error {
	return deleteByID(ctx, repository.database, categoryDeleteTarget, string(id))
}

// CategoryHasTransactions reports whether a category classifies any transaction.
func (repository *CategoryRepository) CategoryHasTransactions(ctx context.Context, id accounting.CategoryID) (bool, error) {
	var exists bool
	err := repository.database.QueryRowContext(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM transactions WHERE category_id = ?)",
		string(id),
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check category transactions %q: %w", id, err)
	}

	return exists, nil
}

func scanCategory(scanner rowScanner) (accounting.Category, error) {
	var id string
	var name string

	if err := scanner.Scan(&id, &name); err != nil {
		return accounting.Category{}, err
	}

	return accounting.NewCategory(accounting.CategoryID(id), name)
}

func collectCategories(rows *sql.Rows) ([]accounting.Category, error) {
	categories := []accounting.Category{}
	for rows.Next() {
		category, err := scanCategory(rows)
		if err != nil {
			return nil, fmt.Errorf("scan category row: %w", err)
		}
		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate category rows: %w", err)
	}

	return categories, nil
}
