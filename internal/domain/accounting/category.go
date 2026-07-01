package accounting

import "fmt"

type Category struct {
	id   CategoryID
	name string
}

// NewCategory creates a category that stays distinct from accounts.
//
// Example:
//
//	category, err := accounting.NewCategory("groceries", "Groceries")
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

func (category Category) ID() CategoryID {
	return category.id
}

func (category Category) Name() string {
	return category.name
}
