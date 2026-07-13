package accounting

import (
	"fmt"
	"time"
)

// Date represents a valid calendar day without time or timezone semantics.
type Date struct {
	year  int
	month time.Month
	day   int
}

// NewDate creates a calendar-only bookkeeping date without time-of-day semantics.
func NewDate(year int, month time.Month, day int) (Date, error) {
	candidate := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	if candidate.Year() != year || candidate.Month() != month || candidate.Day() != day {
		return Date{}, fmt.Errorf("invalid date (%d, %d, %d): expected real calendar date", year, month, day)
	}

	return Date{year: year, month: month, day: day}, nil
}

// String formats the bookkeeping date as YYYY-MM-DD for persistence and boundary output.
func (date Date) String() string {
	return fmt.Sprintf("%04d-%02d-%02d", date.year, date.month, date.day)
}

// Year returns the calendar year.
func (date Date) Year() int {
	return date.year
}

// Month returns the calendar month.
func (date Date) Month() time.Month {
	return date.month
}

// Day returns the day of the month.
func (date Date) Day() int {
	return date.day
}
