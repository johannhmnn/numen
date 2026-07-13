package accounting

import (
	"fmt"
	"strconv"
	"strings"
)

const brlInputShape = "123.45 or -123.45"

// ParseBRLCentavos parses strict dot-decimal input such as "123.45" or "-123.45" into signed centavos.
func ParseBRLCentavos(input string) (int64, error) {
	trimmedInput := strings.TrimSpace(input)
	if trimmedInput == "" {
		return 0, invalidBRLInput(input)
	}

	reaisPart, centavosPart, ok := splitBRLDecimalParts(trimmedInput)
	if !ok {
		return 0, invalidBRLInput(input)
	}

	return parseSignedCentavos(reaisPart, centavosPart, input)
}

func splitBRLDecimalParts(input string) (string, string, bool) {
	parts := strings.Split(input, ".")
	if len(parts) != 2 || len(parts[1]) != 2 {
		return "", "", false
	}

	return parts[0], parts[1], true
}

func parseSignedCentavos(reaisPart string, centavosPart string, originalInput string) (int64, error) {
	sign, unsignedReaisPart, ok := parseMoneySign(reaisPart)
	if !ok {
		return 0, invalidBRLInput(originalInput)
	}

	reais, err := strconv.ParseInt(unsignedReaisPart, 10, 64)
	if err != nil {
		return 0, invalidBRLInput(originalInput)
	}

	centavos, err := strconv.ParseInt(centavosPart, 10, 64)
	if err != nil {
		return 0, invalidBRLInput(originalInput)
	}

	return sign * (reais*100 + centavos), nil
}

func parseMoneySign(reaisPart string) (int64, string, bool) {
	if reaisPart == "" {
		return 0, "", false
	}

	if strings.HasPrefix(reaisPart, "+") {
		return 0, "", false
	}

	if after, ok := strings.CutPrefix(reaisPart, "-"); ok {
		unsignedReaisPart := after
		if unsignedReaisPart == "" {
			return 0, "", false
		}

		return -1, unsignedReaisPart, true
	}

	return 1, reaisPart, true
}

func invalidBRLInput(input string) error {
	return fmt.Errorf("invalid BRL amount %q: expected %s", input, brlInputShape)
}

// FormatBRL formats signed centavos as BRL display text.
func FormatBRL(amount int64) string {
	signPrefix, unsignedAmount := brlSignPrefix(amount)
	reais := unsignedAmount / 100
	centavos := unsignedAmount % 100
	return fmt.Sprintf("%sR$ %s,%02d", signPrefix, formatThousands(reais), centavos)
}

func brlSignPrefix(amount int64) (string, uint64) {
	if amount < 0 {
		return "-", uint64(-(amount + 1)) + 1
	}

	return "", uint64(amount)
}

func formatThousands(value uint64) string {
	digits := strconv.FormatUint(value, 10)
	return formatThousandsDigits(digits)
}

func formatThousandsDigits(digits string) string {
	if len(digits) <= 3 {
		return digits
	}

	return formatThousandsDigits(digits[:len(digits)-3]) + "." + digits[len(digits)-3:]
}
