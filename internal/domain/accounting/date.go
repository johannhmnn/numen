package accounting

import (
	"fmt"
	"time"
)

type Date struct {
	year  int
	month time.Month
	day   int
}

// NewDate creates a calendar-only bookkeeping date without time-of-day semantics.
//
// Example:
//
//	date, err := accounting.NewDate(2026, time.June, 27)
func NewDate(year int, month time.Month, day int) (Date, error) {
	candidate := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	if candidate.Year() != year || candidate.Month() != month || candidate.Day() != day {
		return Date{}, fmt.Errorf("invalid date (%d, %d, %d): expected real calendar date", year, month, day)
	}

	return Date{year: year, month: month, day: day}, nil
}

// String formats the date for persistence and external boundaries.
//
// Example:
//
//	formatted := date.String()
func (date Date) String() string {
	return fmt.Sprintf("%04d-%02d-%02d", date.year, date.month, date.day)
}

func (date Date) Year() int {
	return date.year
}

func (date Date) Month() time.Month {
	return date.month
}

func (date Date) Day() int {
	return date.day
}
