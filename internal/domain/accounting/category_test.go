package accounting_test

import (
	"testing"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

func TestNewCategoryExposesAccessorValues(t *testing.T) {
	category, err := accounting.NewCategory("groceries", "Groceries")
	if err != nil {
		t.Fatalf("new category: %v", err)
	}

	if category.ID() != "groceries" || category.Name() != "Groceries" {
		t.Fatal("expected category accessors to return constructor values")
	}
}

func TestNewCategoryTrimsNameAndPreservesSpelling(t *testing.T) {
	category, err := accounting.NewCategory("health", "  Saúde  ")
	if err != nil {
		t.Fatalf("new category: %v", err)
	}

	if category.Name() != "Saúde" {
		t.Fatalf("category name %q: expected preserved trimmed spelling", category.Name())
	}
}

func TestNewCategoryRejectsEmptyName(t *testing.T) {
	_, err := accounting.NewCategory("category-1", "")
	if err == nil {
		t.Fatal("expected empty category name error")
	}
}

func TestNewCategoryRejectsWhitespaceOnlyName(t *testing.T) {
	_, err := accounting.NewCategory("category-1", "   ")
	if err == nil {
		t.Fatal("expected whitespace-only category name error")
	}
}
