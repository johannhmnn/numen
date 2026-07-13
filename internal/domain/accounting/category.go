package accounting

import "fmt"

// Category classifies a transaction for reporting, such as "Groceries".
// It does not receive postings or carry a balance; those roles belong to accounts.
type Category struct {
	id   CategoryID
	name string
}

// NewCategory creates a category that stays distinct from accounts.
func NewCategory(id CategoryID, name string) (Category, error) {
	trimmedName, err := validateRequiredName("category name", name)
	if err != nil {
		return Category{}, err
	}

	if id == "" {
		return Category{}, fmt.Errorf("invalid category ID %q: expected non-empty string", id)
	}

	return Category{id: id, name: trimmedName}, nil
}

// ID returns the stable identifier referenced by transactions.
func (category Category) ID() CategoryID {
	return category.id
}

// Name returns the validated display name.
func (category Category) Name() string {
	return category.name
}
