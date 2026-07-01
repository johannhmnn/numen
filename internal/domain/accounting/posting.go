package accounting

import "fmt"

type Posting struct {
	accountID AccountID
	amount    int64
}

// NewPosting creates a signed posting linked to an account identifier.
//
// Example:
//
//	posting, err := accounting.NewPosting("checking", -10000)
func NewPosting(accountID AccountID, amount int64) (Posting, error) {
	if accountID == "" {
		return Posting{}, fmt.Errorf("invalid posting account ID %q: expected non-empty string", accountID)
	}

	return Posting{accountID: accountID, amount: amount}, nil
}

func (posting Posting) AccountID() AccountID {
	return posting.accountID
}

func (posting Posting) Amount() int64 {
	return posting.amount
}
