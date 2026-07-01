package accounting

import "fmt"

type Transaction struct {
	id         TransactionID
	date       Date
	title      string
	payee      string
	categoryID CategoryID
	postings   []Posting
}

// NewTransaction creates a balanced transaction envelope around signed postings.
//
// Example:
//
//	transaction, err := accounting.NewTransaction("txn-1", date, "Groceries", "Market", "groceries", postings)
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

	if len(postings) < 2 {
		return Transaction{}, fmt.Errorf("invalid postings count %d: expected at least 2 postings", len(postings))
	}

	if err := validateBalancedPostings(postings); err != nil {
		return Transaction{}, err
	}

	return Transaction{id: id, date: date, title: trimmedTitle, payee: payee, categoryID: categoryID, postings: clonePostings(postings)}, nil
}

func validateBalancedPostings(postings []Posting) error {
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

func (transaction Transaction) ID() TransactionID {
	return transaction.id
}

func (transaction Transaction) Date() Date {
	return transaction.date
}

func (transaction Transaction) Title() string {
	return transaction.title
}

func (transaction Transaction) Payee() string {
	return transaction.payee
}

func (transaction Transaction) CategoryID() CategoryID {
	return transaction.categoryID
}

func (transaction Transaction) Postings() []Posting {
	return clonePostings(transaction.postings)
}

func (transaction *Transaction) SetTitle(title string) error {
	trimmedTitle, err := validateRequiredTitle(title)
	if err != nil {
		return err
	}

	transaction.title = trimmedTitle
	return nil
}

func (transaction *Transaction) SetPayee(payee string) {
	transaction.payee = payee
}

func (transaction *Transaction) SetCategoryID(categoryID CategoryID) error {
	if categoryID == "" {
		return fmt.Errorf("invalid category ID %q: expected non-empty string", categoryID)
	}

	transaction.categoryID = categoryID
	return nil
}

func (transaction *Transaction) ReplacePostings(postings []Posting) error {
	if err := validateBalancedPostings(postings); err != nil {
		return err
	}

	transaction.postings = clonePostings(postings)
	return nil
}
