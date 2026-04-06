import { describe, expect, it } from 'vitest';

import { buildAccountSetupSummary } from './accounts';

describe('buildAccountSetupSummary', () => {
	it('flags missing category accounts when only funding accounts exist', () => {
		const summary = buildAccountSetupSummary([{ name: 'Assets:Checking', type: 'Assets' }]);

		expect(summary.canRecordTransactions).toBe(false);
		expect(summary.headline).toBe('Adicione pelo menos uma conta de categoria para começar.');
		expect(summary.fundingAccounts.map((account) => account.name)).toEqual(['Assets:Checking']);
		expect(summary.categoryAccounts).toEqual([]);
	});

	it('marks the setup as ready when both account groups exist', () => {
		const summary = buildAccountSetupSummary([
			{ name: 'Expenses:Dining', type: 'Expenses' },
			{ name: 'Assets:Checking', type: 'Assets' }
		]);

		expect(summary.canRecordTransactions).toBe(true);
		expect(summary.headline).toBe('Tudo pronto para registrar transações.');
		expect(summary.fundingAccounts.map((account) => account.name)).toEqual(['Assets:Checking']);
		expect(summary.categoryAccounts.map((account) => account.name)).toEqual(['Expenses:Dining']);
	});
});
