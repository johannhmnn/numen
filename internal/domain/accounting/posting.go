package accounting

import "fmt"

// Posting assigns one signed centavo amount to an accounting account.
type Posting struct {
	accountID AccountID
	amount    int64
}

// NewPosting creates a signed posting linked to an account identifier.
func NewPosting(accountID AccountID, amount int64) (Posting, error) {
	if accountID == "" {
		return Posting{}, fmt.Errorf("invalid posting account ID %q: expected non-empty string", accountID)
	}

	return Posting{accountID: accountID, amount: amount}, nil
}

// AccountID returns the account affected by the posting.
func (posting Posting) AccountID() AccountID {
	return posting.accountID
}

// Amount returns the signed amount in integer centavos.
func (posting Posting) Amount() int64 {
	return posting.amount
}
