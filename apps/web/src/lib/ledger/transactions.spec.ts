import { describe, expect, it } from 'vitest';

import { buildGuidedTransactionFieldErrors, createGuidedTransactionSchema } from './transactions';

describe('createGuidedTransactionSchema', () => {
	it('builds an expense transaction from funding and category selections', () => {
		const schema = createGuidedTransactionSchema([
			{ name: 'Assets:Checking', type: 'Assets' },
			{ name: 'Expenses:Groceries', type: 'Expenses' }
		]);

		const result = schema.parse({
			date: '2026-04-02',
			title: 'Groceries',
			payee: 'Mercado Central',
			fundingAccount: 'Assets:Checking',
			categoryAccount: 'Expenses:Groceries',
			amount: '48.2',
			tags: 'food, weekly, home'
		});

		expect(result).toEqual({
			date: '2026-04-02',
			title: 'Groceries',
			payee: 'Mercado Central',
			primary_category: 'Expenses:Groceries',
			tags: ['food', 'weekly', 'home'],
			postings: [
				{ account: 'Assets:Checking', amount: '-48.20' },
				{ account: 'Expenses:Groceries', amount: '48.20' }
			]
		});
	});

	it('builds an income transaction with the correct liability-side offset', () => {
		const schema = createGuidedTransactionSchema([
			{ name: 'Liabilities:CreditCard', type: 'Liabilities' },
			{ name: 'Income:Refunds', type: 'Income' }
		]);

		const result = schema.parse({
			date: '2026-04-02',
			title: 'Refund',
			payee: '',
			fundingAccount: 'Liabilities:CreditCard',
			categoryAccount: 'Income:Refunds',
			amount: '20',
			tags: 'refund'
		});

		expect(result.postings).toEqual([
			{ account: 'Liabilities:CreditCard', amount: '20.00' },
			{ account: 'Income:Refunds', amount: '-20.00' }
		]);
		expect(result.payee).toBeNull();
	});

	it('returns field-level errors for missing required values', () => {
		const schema = createGuidedTransactionSchema([
			{ name: 'Assets:Checking', type: 'Assets' },
			{ name: 'Expenses:Groceries', type: 'Expenses' }
		]);
		const result = schema.safeParse({
			date: '',
			title: '   ',
			payee: '',
			fundingAccount: '',
			categoryAccount: '',
			amount: '0',
			tags: ''
		});

		expect(result.success).toBe(false);

		if (result.success) {
			throw new Error('expected validation to fail');
		}

		expect(buildGuidedTransactionFieldErrors(result.error)).toEqual({
			date: 'Enter a valid date.',
			title: 'Title is required.',
			payee: undefined,
			fundingAccount: 'Choose a funding account.',
			categoryAccount: 'Choose a category account.',
			amount: 'Amount must be greater than zero.',
			tags: undefined
		});
	});

	it('rejects account selections that fall outside the guided flow groups', () => {
		const schema = createGuidedTransactionSchema([
			{ name: 'Equity:Opening', type: 'Equity' },
			{ name: 'Expenses:Groceries', type: 'Expenses' }
		]);
		const result = schema.safeParse({
			date: '2026-04-02',
			title: 'Groceries',
			payee: '',
			fundingAccount: 'Equity:Opening',
			categoryAccount: 'Expenses:Groceries',
			amount: '12.50',
			tags: ''
		});

		expect(result.success).toBe(false);

		if (result.success) {
			throw new Error('expected validation to fail');
		}

		expect(buildGuidedTransactionFieldErrors(result.error).fundingAccount).toBe(
			'Choose a funding account from the account desk.'
		);
	});
});
