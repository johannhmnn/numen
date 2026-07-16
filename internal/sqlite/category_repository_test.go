package sqlite_test

import (
	"context"
	"testing"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

func TestCategoryRepositorySavesAndFindsCategory(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))
	category := mustCategory(t, "health", "Saúde")

	if err := repository.SaveCategory(ctx, category); err != nil {
		t.Fatalf("save category: %v", err)
	}

	foundCategory, err := repository.FindCategory(ctx, "health")
	if err != nil {
		t.Fatalf("find category: %v", err)
	}

	assertCategory(t, foundCategory, category)
}

func TestCategoryRepositoryRejectsZeroValueCategoryBeforeInsert(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	err := repository.SaveCategory(ctx, accounting.Category{})
	assertErrorContains(t, err, `invalid category name ""`)

	_, findErr := repository.FindCategory(ctx, "")
	assertErrorIs(t, findErr, accountingstore.ErrNotFound)
}

func TestCategoryRepositoryUpdatesExistingCategory(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	saveCategory(t, ctx, repository, mustCategory(t, "groceries", "Groceries"))
	updated := mustCategory(t, "groceries", "Weekly Food")
	saveCategory(t, ctx, repository, updated)

	found, err := repository.FindCategory(ctx, "groceries")
	if err != nil {
		t.Fatalf("find updated category: %v", err)
	}
	assertCategory(t, found, updated)
}

func TestCategoryRepositoryRejectsExactDuplicateName(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))
	existing := mustCategory(t, "first", "  Groceries  ")

	saveCategory(t, ctx, repository, existing)
	err := repository.SaveCategory(ctx, mustCategory(t, "second", "Groceries"))
	assertErrorIs(t, err, accountingstore.ErrNameInUse)
	assertErrorContains(t, err, "Groceries")

	found, findErr := repository.FindCategory(ctx, "first")
	if findErr != nil {
		t.Fatalf("find existing category after conflict: %v", findErr)
	}
	assertCategory(t, found, existing)
}

func TestCategoryRepositoryAllowsSimilarNames(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	saveCategory(t, ctx, repository, mustCategory(t, "title-case", "Health Care"))
	saveCategory(t, ctx, repository, mustCategory(t, "lower-case", "health care"))
	saveCategory(t, ctx, repository, mustCategory(t, "accented", "Saúde"))
	saveCategory(t, ctx, repository, mustCategory(t, "plain", "Saude"))
}

func TestCategoryRepositoryRejectsRenameToExactExistingName(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	saveCategory(t, ctx, repository, mustCategory(t, "groceries", "Groceries"))
	saveCategory(t, ctx, repository, mustCategory(t, "transport", "Transport"))

	err := repository.SaveCategory(ctx, mustCategory(t, "transport", "Groceries"))
	assertErrorIs(t, err, accountingstore.ErrNameInUse)

	unchanged, findErr := repository.FindCategory(ctx, "transport")
	if findErr != nil {
		t.Fatalf("find category after conflicting rename: %v", findErr)
	}
	if unchanged.Name() != "Transport" {
		t.Fatalf("category name %q after conflicting rename: expected Transport", unchanged.Name())
	}
}

func TestRepositoriesAllowNameOverlapAcrossEntityTypes(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)

	saveAccount(t, ctx, projectsqlite.NewAccountRepository(database), mustAccount(t, "account", "Shared", accounting.AccountTypeAsset))
	saveCategory(t, ctx, projectsqlite.NewCategoryRepository(database), mustCategory(t, "category", "Shared"))
}

func TestCategoryRepositoryListsCategoriesByName(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	saveCategory(t, ctx, repository, mustCategory(t, "transport", "Transport"))
	saveCategory(t, ctx, repository, mustCategory(t, "groceries", "Groceries"))

	categories, err := repository.ListCategories(ctx)
	if err != nil {
		t.Fatalf("list categories: %v", err)
	}

	if len(categories) != 2 || categories[0].ID() != "groceries" || categories[1].ID() != "transport" {
		t.Fatalf("unexpected category order: %#v", categories)
	}
}

func TestCategoryRepositoryDeletesUnreferencedCategory(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewCategoryRepository(openRepositoryDatabase(t))

	saveCategory(t, ctx, repository, mustCategory(t, "groceries", "Groceries"))

	if err := repository.DeleteCategory(ctx, "groceries"); err != nil {
		t.Fatalf("delete category: %v", err)
	}

	_, err := repository.FindCategory(ctx, "groceries")
	assertErrorIs(t, err, accountingstore.ErrNotFound)
}

func TestCategoryRepositoryBlocksReferencedCategoryDelete(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)
	accountRepository := projectsqlite.NewAccountRepository(database)
	categoryRepository := projectsqlite.NewCategoryRepository(database)

	saveTransactionGraph(t, ctx, accountRepository, categoryRepository)
	saveTransaction(t, ctx, projectsqlite.NewTransactionRepository(database), mustTransaction(t))

	hasTransactions, err := categoryRepository.CategoryHasTransactions(ctx, "groceries")
	if err != nil {
		t.Fatalf("check category transactions: %v", err)
	}
	if !hasTransactions {
		t.Fatal("expected groceries category to be referenced by transactions")
	}

	err = categoryRepository.DeleteCategory(ctx, "groceries")
	assertErrorIs(t, err, accountingstore.ErrInUse)
}

func saveCategory(
	t *testing.T,
	ctx context.Context,
	repository *projectsqlite.CategoryRepository,
	category accounting.Category,
) {
	t.Helper()

	if err := repository.SaveCategory(ctx, category); err != nil {
		t.Fatalf("save category: %v", err)
	}
}

func assertCategory(t *testing.T, actual accounting.Category, expected accounting.Category) {
	t.Helper()

	if actual.ID() != expected.ID() || actual.Name() != expected.Name() {
		t.Fatalf("unexpected category %#v: expected %#v", actual, expected)
	}
}
