import { describe, expect, it } from 'vitest';

import {
	APP_LOCALE,
	formatAccountType,
	formatCurrencyDisplay,
	formatDateDisplay,
	formatSignedDecimalAmount
} from './locale';

describe('locale', () => {
	it('exposes pt-BR as the default application locale', () => {
		expect(APP_LOCALE).toBe('pt-BR');
	});

	it('formats ISO dates for PT-BR display', () => {
		expect(formatDateDisplay('2026-04-03')).toBe('03/04/2026');
		expect(formatDateDisplay('invalid-date')).toBe('invalid-date');
	});

	it('formats signed decimal amounts using PT-BR separators', () => {
		expect(formatSignedDecimalAmount('3400')).toBe('+3.400,00');
		expect(formatSignedDecimalAmount('-48.2')).toBe('-48,20');
	});

	it('formats currency display without changing stored precision', () => {
		expect(formatCurrencyDisplay('3400')).toBe('R$ 3.400,00');
		expect(formatCurrencyDisplay('-48.2')).toBe('-R$ 48,20');
	});

	it('maps account types into PT-BR labels for the UI', () => {
		expect(formatAccountType('Assets')).toBe('Ativos');
		expect(formatAccountType('Income')).toBe('Receitas');
	});
});
