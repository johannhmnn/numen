package sqlite_test

import (
	"context"
	"testing"

	"codeberg.org/oxiccino/numen/internal/accountingstore"
	"codeberg.org/oxiccino/numen/internal/domain/accounting"
	projectsqlite "codeberg.org/oxiccino/numen/internal/sqlite"
)

func TestAccountRepositorySavesAndFindsAccount(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))
	account := mustAccount(t, "credit-card", "Cartão: Crédito", accounting.AccountTypeLiability)

	if err := repository.SaveAccount(ctx, account); err != nil {
		t.Fatalf("save account: %v", err)
	}

	foundAccount, err := repository.FindAccount(ctx, "credit-card")
	if err != nil {
		t.Fatalf("find account: %v", err)
	}

	assertAccount(t, foundAccount, account)
}

func TestAccountRepositoryRejectsZeroValueAccountBeforeInsert(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	err := repository.SaveAccount(ctx, accounting.Account{})
	assertErrorContains(t, err, `invalid account name ""`)

	_, findErr := repository.FindAccount(ctx, "")
	assertErrorIs(t, findErr, accountingstore.ErrNotFound)
}

func TestAccountRepositoryUpdatesExistingAccount(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	saveAccount(t, ctx, repository, mustAccount(t, "checking", "Checking", accounting.AccountTypeAsset))
	updated := mustAccount(t, "checking", "Daily Account", accounting.AccountTypeLiability)
	saveAccount(t, ctx, repository, updated)

	found, err := repository.FindAccount(ctx, "checking")
	if err != nil {
		t.Fatalf("find updated account: %v", err)
	}
	assertAccount(t, found, updated)
}

func TestAccountRepositoryRejectsExactDuplicateName(t *testing.T) {
	assertAccountNameConflict(t, "  Checking  ", "Checking")
}

func TestAccountRepositoryAllowsSimilarNames(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	saveAccount(t, ctx, repository, mustAccount(t, "title-case", "Credit Card", accounting.AccountTypeLiability))
	saveAccount(t, ctx, repository, mustAccount(t, "lower-case", "credit card", accounting.AccountTypeLiability))
	saveAccount(t, ctx, repository, mustAccount(t, "accented", "Negócios", accounting.AccountTypeEquity))
	saveAccount(t, ctx, repository, mustAccount(t, "plain", "Negocios", accounting.AccountTypeEquity))
}

func TestAccountRepositoryRejectsRenameToExactExistingName(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	saveAccount(t, ctx, repository, mustAccount(t, "checking", "Checking", accounting.AccountTypeAsset))
	saveAccount(t, ctx, repository, mustAccount(t, "savings", "Savings", accounting.AccountTypeAsset))

	err := repository.SaveAccount(ctx, mustAccount(t, "savings", "Checking", accounting.AccountTypeAsset))
	assertErrorIs(t, err, accountingstore.ErrNameInUse)

	unchanged, findErr := repository.FindAccount(ctx, "savings")
	if findErr != nil {
		t.Fatalf("find account after conflicting rename: %v", findErr)
	}
	if unchanged.Name() != "Savings" {
		t.Fatalf("account name %q after conflicting rename: expected Savings", unchanged.Name())
	}
}

func TestAccountRepositoryListsAccountsByName(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	saveAccount(t, ctx, repository, mustAccount(t, "z-account", "Zeta", accounting.AccountTypeAsset))
	saveAccount(t, ctx, repository, mustAccount(t, "a-account", "Alpha", accounting.AccountTypeExpense))

	accounts, err := repository.ListAccounts(ctx)
	if err != nil {
		t.Fatalf("list accounts: %v", err)
	}

	if len(accounts) != 2 || accounts[0].ID() != "a-account" || accounts[1].ID() != "z-account" {
		t.Fatalf("unexpected account order: %#v", accounts)
	}
}

func TestAccountRepositoryDeletesUnreferencedAccount(t *testing.T) {
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))

	saveAccount(t, ctx, repository, mustAccount(t, "checking", "Checking", accounting.AccountTypeAsset))

	if err := repository.DeleteAccount(ctx, "checking"); err != nil {
		t.Fatalf("delete account: %v", err)
	}

	_, err := repository.FindAccount(ctx, "checking")
	assertErrorIs(t, err, accountingstore.ErrNotFound)
}

func TestAccountRepositoryBlocksReferencedAccountDelete(t *testing.T) {
	ctx := context.Background()
	database := openRepositoryDatabase(t)
	accountRepository := projectsqlite.NewAccountRepository(database)
	transactionRepository := projectsqlite.NewTransactionRepository(database)

	saveTransactionGraph(t, ctx, accountRepository, projectsqlite.NewCategoryRepository(database))
	if err := transactionRepository.SaveTransaction(ctx, mustTransaction(t)); err != nil {
		t.Fatalf("save transaction: %v", err)
	}

	hasPostings, err := accountRepository.AccountHasPostings(ctx, "checking")
	if err != nil {
		t.Fatalf("check account postings: %v", err)
	}
	if !hasPostings {
		t.Fatal("expected checking account to be referenced by postings")
	}

	err = accountRepository.DeleteAccount(ctx, "checking")
	assertErrorIs(t, err, accountingstore.ErrInUse)
}

func saveAccount(
	t *testing.T,
	ctx context.Context,
	repository *projectsqlite.AccountRepository,
	account accounting.Account,
) {
	t.Helper()

	if err := repository.SaveAccount(ctx, account); err != nil {
		t.Fatalf("save account: %v", err)
	}
}

func assertAccount(t *testing.T, actual accounting.Account, expected accounting.Account) {
	t.Helper()

	if actual.ID() != expected.ID() || actual.Name() != expected.Name() || actual.Type() != expected.Type() {
		t.Fatalf("unexpected account %#v: expected %#v", actual, expected)
	}
}

func assertAccountNameConflict(t *testing.T, existingName string, conflictingName string) {
	t.Helper()
	ctx := context.Background()
	repository := projectsqlite.NewAccountRepository(openRepositoryDatabase(t))
	existing := mustAccount(t, "existing", existingName, accounting.AccountTypeAsset)

	saveAccount(t, ctx, repository, existing)
	err := repository.SaveAccount(ctx, mustAccount(t, "conflicting", conflictingName, accounting.AccountTypeAsset))
	assertErrorIs(t, err, accountingstore.ErrNameInUse)
	assertErrorContains(t, err, conflictingName)

	found, findErr := repository.FindAccount(ctx, "existing")
	if findErr != nil {
		t.Fatalf("find existing account after conflict: %v", findErr)
	}
	assertAccount(t, found, existing)
}
