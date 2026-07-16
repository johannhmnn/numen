package accounting

import "fmt"

// Transaction is a validated balancing envelope around ordered postings.
type Transaction struct {
	id         TransactionID
	date       Date
	title      string
	payee      string
	categoryID CategoryID
	postings   []Posting
}

// NewTransaction creates a balanced transaction envelope around signed postings.
func NewTransaction(
	id TransactionID,
	date Date,
	title string,
	payee string,
	categoryID CategoryID,
	postings []Posting,
) (Transaction, error) {
	trimmedTitle, err := validateRequiredTitle(title)
	if err != nil {
		return Transaction{}, err
	}

	if id == "" {
		return Transaction{}, fmt.Errorf("invalid transaction ID %q: expected non-empty string", id)
	}

	if categoryID == "" {
		return Transaction{}, fmt.Errorf("invalid category ID %q: expected non-empty string", categoryID)
	}

	if err := validateBalancedPostings(postings); err != nil {
		return Transaction{}, err
	}

	return Transaction{id: id, date: date, title: trimmedTitle, payee: payee, categoryID: categoryID, postings: clonePostings(postings)}, nil
}

func validateBalancedPostings(postings []Posting) error {
	if len(postings) < 2 {
		return fmt.Errorf("invalid postings count %d: expected at least 2 postings", len(postings))
	}

	var total int64

	for _, posting := range postings {
		total += posting.Amount()
	}

	if total != 0 {
		return fmt.Errorf("invalid postings total %d: expected exact zero-sum balance", total)
	}

	return nil
}

func clonePostings(postings []Posting) []Posting {
	clonedPostings := make([]Posting, len(postings))
	copy(clonedPostings, postings)
	return clonedPostings
}

// ID returns the stable identifier shared by the transaction's postings.
func (transaction Transaction) ID() TransactionID {
	return transaction.id
}

// Date returns the calendar day when the transaction occurred.
func (transaction Transaction) Date() Date {
	return transaction.date
}

// Title returns the validated transaction title.
func (transaction Transaction) Title() string {
	return transaction.title
}

// Payee returns the free-text counterparty description.
func (transaction Transaction) Payee() string {
	return transaction.payee
}

// CategoryID returns the reporting category attached to the transaction.
func (transaction Transaction) CategoryID() CategoryID {
	return transaction.categoryID
}

// Postings returns a copy so callers cannot mutate transaction state indirectly.
func (transaction Transaction) Postings() []Posting {
	return clonePostings(transaction.postings)
}

// SetTitle validates and replaces the transaction title.
func (transaction *Transaction) SetTitle(title string) error {
	trimmedTitle, err := validateRequiredTitle(title)
	if err != nil {
		return err
	}

	transaction.title = trimmedTitle
	return nil
}

// SetPayee replaces the free-text counterparty description.
func (transaction *Transaction) SetPayee(payee string) {
	transaction.payee = payee
}

// SetCategoryID attaches the transaction to a validated category identifier.
func (transaction *Transaction) SetCategoryID(categoryID CategoryID) error {
	if categoryID == "" {
		return fmt.Errorf("invalid category ID %q: expected non-empty string", categoryID)
	}

	transaction.categoryID = categoryID
	return nil
}

// ReplacePostings replaces the posting set only when at least two signed amounts balance.
func (transaction *Transaction) ReplacePostings(postings []Posting) error {
	if err := validateBalancedPostings(postings); err != nil {
		return err
	}

	transaction.postings = clonePostings(postings)
	return nil
}
