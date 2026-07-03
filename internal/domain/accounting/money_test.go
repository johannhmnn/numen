package accounting_test

import (
	"strings"
	"testing"

	"codeberg.org/oxiccino/numen/internal/domain/accounting"
)

func TestParseBRLCentavosAcceptsPlainDecimalInput(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected int64
	}{
		{name: "zero", input: "0.00", expected: 0},
		{name: "positive", input: "123.45", expected: 12345},
		{name: "negative", input: "-123.45", expected: -12345},
		{name: "trimmed", input: " 42.10 ", expected: 4210},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			amount, err := accounting.ParseBRLCentavos(testCase.input)
			if err != nil {
				t.Fatalf("parse BRL centavos: %v", err)
			}

			if amount != testCase.expected {
				t.Fatalf("unexpected centavos %d: expected %d", amount, testCase.expected)
			}
		})
	}
}

func TestParseBRLCentavosRejectsInvalidInput(t *testing.T) {
	invalidInputs := []string{
		"",
		"   ",
		"123",
		"123.4",
		"123.456",
		"123,45",
		"R$ 123,45",
		"1.234,56",
		"+123.45",
		"12a.45",
	}

	for _, input := range invalidInputs {
		t.Run(input, func(t *testing.T) {
			_, err := accounting.ParseBRLCentavos(input)
			if err == nil {
				t.Fatal("expected invalid BRL amount error")
			}

			errorText := err.Error()
			if !strings.Contains(errorText, input) {
				t.Fatalf("unexpected error %q: expected offending value", errorText)
			}

			if !strings.Contains(errorText, "expected 123.45 or -123.45") {
				t.Fatalf("unexpected error %q: expected shape message", errorText)
			}
		})
	}
}

func TestFormatBRLFormatsSignedCentavos(t *testing.T) {
	testCases := []struct {
		name     string
		input    int64
		expected string
	}{
		{name: "zero", input: 0, expected: "R$ 0,00"},
		{name: "positive", input: 12345, expected: "R$ 123,45"},
		{name: "negative", input: -12345, expected: "-R$ 123,45"},
		{name: "thousands", input: 123456789, expected: "R$ 1.234.567,89"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			formatted := accounting.FormatBRL(testCase.input)
			if formatted != testCase.expected {
				t.Fatalf("unexpected formatted amount %q: expected %q", formatted, testCase.expected)
			}
		})
	}
}
