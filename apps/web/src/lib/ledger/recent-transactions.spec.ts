import { describe, expect, it } from 'vitest';

import {
	buildRecentTransactionItems,
	formatLedgerAmount
} from './recent-transactions';

describe('buildRecentTransactionItems', () => {
	it('maps persisted transactions into recent-ledger rows', () => {
		const items = buildRecentTransactionItems([
			{
				date: '2026-04-02',
				title: 'Groceries',
				payee: 'Mercado Central',
				primary_category: 'Expenses:Groceries',
				tags: ['food'],
				postings: [
					{ account: 'Assets:Checking', amount: '-48.20' },
					{ account: 'Expenses:Groceries', amount: '48.20' }
				]
			}
		]);

		expect(items).toEqual([
			{
				key: '2026-04-02:Groceries:0',
				date: '2026-04-02',
				title: 'Groceries',
				payee: 'Mercado Central',
				category: 'Expenses:Groceries',
				amount: '+48.20'
			}
		]);
	});

	it('preserves newest-first ordering from the backend response', () => {
		const items = buildRecentTransactionItems([
			{
				date: '2026-04-03',
				title: 'Lunch',
				payee: 'Cafe',
				primary_category: 'Expenses:Dining',
				tags: [],
				postings: [
					{ account: 'Assets:Checking', amount: '-12.00' },
					{ account: 'Expenses:Dining', amount: '12.00' }
				]
			},
			{
				date: '2026-04-02',
				title: 'Salary',
				payee: null,
				primary_category: 'Income:Salary',
				tags: [],
				postings: [
					{ account: 'Assets:Checking', amount: '3400.00' },
					{ account: 'Income:Salary', amount: '-3400.00' }
				]
			}
		]);

		expect(items.map((item) => item.title)).toEqual(['Lunch', 'Salary']);
	});
});

describe('formatLedgerAmount', () => {
	it('formats ledger amounts with an explicit sign and grouped thousands', () => {
		expect(formatLedgerAmount('-3400')).toBe('-3,400.00');
		expect(formatLedgerAmount('48.2')).toBe('+48.20');
	});
});
