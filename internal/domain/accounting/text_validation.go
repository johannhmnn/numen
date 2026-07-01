package accounting

import (
	"fmt"
	"strings"
)

func validateRequiredName(kind string, value string) (string, error) {
	return validateRequiredTrimmedText(kind, value)
}

func validateRequiredTitle(value string) (string, error) {
	return validateRequiredTrimmedText("transaction title", value)
}

func validateRequiredTrimmedText(kind string, value string) (string, error) {
	trimmedValue := strings.TrimSpace(value)
	if trimmedValue == "" {
		return "", fmt.Errorf("invalid %s %q: expected non-empty non-whitespace string", kind, value)
	}

	return trimmedValue, nil
}
