import { describe, expect, it } from 'vitest';

import { formatLocalDateInputValue } from './date';

describe('formatLocalDateInputValue', () => {
	it('uses the local calendar date instead of converting through UTC', () => {
		const eveningInSaoPaulo = new Date('2026-04-06T21:15:00-03:00');

		expect(eveningInSaoPaulo.toISOString().slice(0, 10)).toBe('2026-04-07');
		expect(formatLocalDateInputValue(eveningInSaoPaulo)).toBe('2026-04-06');
	});

	it('zero-pads month and day for date inputs', () => {
		expect(formatLocalDateInputValue(new Date('2026-01-02T09:00:00-03:00'))).toBe('2026-01-02');
	});
});
