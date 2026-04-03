import { describe, expect, it, vi } from 'vitest';

import {
	NumenApiError,
	createNumenApiClient,
	transactionsSchema
} from './api';

describe('createNumenApiClient', () => {
	it('lists transactions using typed response parsing', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify([
					{
						date: '2026-03-26',
						title: 'Dinner',
						payee: 'Bistro',
						primary_category: 'Dining',
						tags: ['evening'],
						postings: [
							{ account: 'Assets:Checking', amount: '-42.00' },
							{ account: 'Expenses:Dining', amount: '42.00' }
						]
					}
				]),
				{
					status: 200,
					headers: { 'content-type': 'application/json' }
				}
			)
		);
		const client = createNumenApiClient({
			baseUrl: 'http://127.0.0.1:3000',
			fetch: fetchMock
		});

		const transactions = await client.listTransactions();

		expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/transactions', {
			method: 'GET',
			headers: undefined,
			body: undefined
		});
		expect(transactionsSchema.parse(transactions)).toEqual(transactions);
		expect(transactions[0]?.title).toBe('Dinner');
	});

	it('sends validated transaction payloads and surfaces API errors', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ status: 'created' }), {
					status: 201,
					headers: { 'content-type': 'application/json' }
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: 'posting references unknown account `Assets:Missing`' }), {
					status: 422,
					headers: { 'content-type': 'application/json' }
				})
			);
		const client = createNumenApiClient({
			baseUrl: 'http://127.0.0.1:3000',
			fetch: fetchMock
		});
		const payload = {
			date: '2026-03-27',
			title: 'Groceries',
			payee: 'Market',
			primary_category: 'Groceries',
			tags: ['food'],
			postings: [
				{ account: 'Assets:Checking', amount: '-12.50' },
				{ account: 'Expenses:Groceries', amount: '12.50' }
			]
		};

		const response = await client.createTransaction(payload);

		expect(response).toEqual({ status: 'created' });
		expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:3000/transactions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});

		await expect(
			client.createTransaction({
				...payload,
				postings: [
					{ account: 'Assets:Missing', amount: '-12.50' },
					{ account: 'Expenses:Groceries', amount: '12.50' }
				]
			})
		).rejects.toEqual(
			new NumenApiError('posting references unknown account `Assets:Missing`', 422)
		);
	});
});
