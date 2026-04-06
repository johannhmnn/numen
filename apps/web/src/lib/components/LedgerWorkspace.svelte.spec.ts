import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LedgerWorkspace from './LedgerWorkspace.svelte';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('LedgerWorkspace', () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('shows missing category guidance after loading funding accounts', async () => {
		const fetchMock = createLedgerFetchMock({
			accounts: [{ name: 'Assets:Checking', type: 'Assets' }],
			transactions: []
		});
		vi.stubGlobal('fetch', fetchMock);

		render(LedgerWorkspace);

		await waitFor(() => {
			expect(
				screen.getByText('Crie pelo menos uma conta de categoria para liberar o lançamento guiado.')
			).toBeTruthy();
		});

		expect(screen.getByRole('button', { name: 'Abrir painel de contas' })).toBeTruthy();
		const accordionButton = screen.getByText('Painel de contas e configuração').closest('button');
		expect(accordionButton).toBeTruthy();

		await fireEvent.click(accordionButton as HTMLButtonElement);
		await waitFor(() => {
			expect(screen.queryByRole('form', { name: 'Adicionar conta' })).toBeNull();
		});

		await fireEvent.click(accordionButton as HTMLButtonElement);
		await waitFor(() => {
			expect(screen.getByRole('form', { name: 'Adicionar conta' })).toBeTruthy();
		});

		const fundingSection = screen.getByLabelText('Contas de origem');
		const categorySection = screen.getByLabelText('Contas de categoria');

		expect(within(fundingSection).getByText('Assets:Checking')).toBeTruthy();
		expect(
			within(categorySection).getByText(
				'Nenhuma conta de categoria ainda. Adicione uma abaixo para continuar.'
			)
		).toBeTruthy();
		expect(
			(screen.getByRole('button', { name: 'Registrar transação' }) as HTMLButtonElement).disabled
		).toBe(true);
	});

	it('creates an account inline and updates the account desk', async () => {
		const fetchMock = createLedgerFetchMock({
			accounts: [],
			transactions: []
		});
		vi.stubGlobal('fetch', fetchMock);

		render(LedgerWorkspace);

		await waitFor(() => {
			expect(
				screen.getByText(
					'Adicione uma conta de origem e uma conta de categoria para liberar o lançamento guiado.'
				)
			).toBeTruthy();
		});

		const accountForm = screen.getByRole('form', { name: 'Adicionar conta' });

		await fireEvent.input(within(accountForm).getByLabelText('Nome da conta'), {
			target: { value: 'Expenses:Groceries' }
		});
		await fireEvent.change(within(accountForm).getByLabelText('Tipo de conta'), {
			target: { value: 'Expenses' }
		});
		await fireEvent.submit(accountForm);

		await waitFor(() => {
			const categorySection = screen.getByLabelText('Contas de categoria');
			expect(within(categorySection).getByText('Expenses:Groceries')).toBeTruthy();
		});

		expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/accounts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'Expenses:Groceries', type: 'Expenses' })
		});
	});

	it('limits the guided selectors to funding and category account types', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse([
				{ name: 'Assets:Checking', type: 'Assets' },
				{ name: 'Liabilities:CreditCard', type: 'Liabilities' },
				{ name: 'Equity:Opening', type: 'Equity' },
				{ name: 'Expenses:Groceries', type: 'Expenses' },
				{ name: 'Income:Salary', type: 'Income' }
			])
		);
		vi.stubGlobal('fetch', fetchMock);

		render(LedgerWorkspace);

		await waitFor(() => {
			expect(
				screen.getByText('As contas de origem e categoria estão prontas para o lançamento guiado.')
			).toBeTruthy();
		});

		const transactionForm = screen.getByRole('form', { name: 'Lançamento guiado de transação' });
		const fundingSelect = within(transactionForm).getByLabelText('Conta de origem');
		const categorySelect = within(transactionForm).getByLabelText('Conta de categoria');

		expect(within(fundingSelect).getByRole('option', { name: 'Assets:Checking' })).toBeTruthy();
		expect(
			within(fundingSelect).getByRole('option', { name: 'Liabilities:CreditCard' })
		).toBeTruthy();
		expect(within(fundingSelect).queryByRole('option', { name: 'Equity:Opening' })).toBeNull();

		expect(within(categorySelect).getByRole('option', { name: 'Expenses:Groceries' })).toBeTruthy();
		expect(within(categorySelect).getByRole('option', { name: 'Income:Salary' })).toBeTruthy();
		expect(
			within(categorySelect).queryByRole('option', { name: 'Liabilities:CreditCard' })
		).toBeNull();
	});

	it('validates and submits the guided transaction payload', async () => {
		const fetchMock = createLedgerFetchMock({
			accounts: [
				{ name: 'Assets:Checking', type: 'Assets' },
				{ name: 'Expenses:Groceries', type: 'Expenses' }
			],
			transactions: []
		});
		vi.stubGlobal('fetch', fetchMock);

		render(LedgerWorkspace);

		await waitFor(() => {
			expect(
				screen.getByText('As contas de origem e categoria estão prontas para o lançamento guiado.')
			).toBeTruthy();
		});

		const transactionForm = screen.getByRole('form', { name: 'Lançamento guiado de transação' });

		await fireEvent.submit(transactionForm);

		await waitFor(() => {
			expect(within(transactionForm).getByText('O título é obrigatório.')).toBeTruthy();
		});

		expect(within(transactionForm).getByText('O valor é obrigatório.')).toBeTruthy();

		await fireEvent.input(within(transactionForm).getByLabelText('Título'), {
			target: { value: 'Groceries' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Data'), {
			target: { value: '2026-04-02' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Favorecido'), {
			target: { value: 'Mercado Central' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Valor'), {
			target: { value: '48,2' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Tags'), {
			target: { value: 'alimentação, semanal' }
		});
		await fireEvent.submit(transactionForm);

		await waitFor(() => {
			expect(screen.getByText('Transação registrada no razão local.')).toBeTruthy();
		});

		expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/transactions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: expect.any(String)
		});

		const transactionPostCall = fetchMock.mock.calls.find(
			([url, init]) => url === 'http://127.0.0.1:3000/transactions' && init?.method === 'POST'
		);

		expect(transactionPostCall).toBeDefined();
		expect(JSON.parse(transactionPostCall?.[1]?.body as string)).toEqual({
			date: '2026-04-02',
			title: 'Groceries',
			payee: 'Mercado Central',
			primary_category: 'Expenses:Groceries',
			tags: ['alimentação', 'semanal'],
			postings: [
				{ account: 'Assets:Checking', amount: '-48.20' },
				{ account: 'Expenses:Groceries', amount: '48.20' }
			]
		});
	});

	it('renders recent transactions newest first and refreshes them after submit', async () => {
		const fetchMock = createLedgerFetchMock({
			accounts: [
				{ name: 'Assets:Checking', type: 'Assets' },
				{ name: 'Expenses:Groceries', type: 'Expenses' }
			],
			transactions: [
				{
					date: '2026-04-01',
					title: 'Coffee',
					payee: 'Cafe',
					primary_category: 'Expenses:Dining',
					tags: [],
					postings: [
						{ account: 'Assets:Checking', amount: '-5.50' },
						{ account: 'Expenses:Dining', amount: '5.50' }
					]
				}
			]
		});
		vi.stubGlobal('fetch', fetchMock);

		render(LedgerWorkspace);

		await waitFor(() => {
			expect(screen.getByText('Coffee')).toBeTruthy();
		});

		const transactionForm = screen.getByRole('form', { name: 'Lançamento guiado de transação' });

		await fireEvent.input(within(transactionForm).getByLabelText('Data'), {
			target: { value: '2026-04-03' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Título'), {
			target: { value: 'Groceries' }
		});
		await fireEvent.input(within(transactionForm).getByLabelText('Valor'), {
			target: { value: '48,20' }
		});
		await fireEvent.submit(transactionForm);

		await waitFor(() => {
			expect(screen.getByText('Groceries')).toBeTruthy();
		});

		const recentPanelHeading = screen.getByRole('heading', {
			name: 'As transações mais novas aparecem assim que entram.'
		});
		const recentPanel = recentPanelHeading.closest('section');

		expect(recentPanel).toBeTruthy();

		const transactionEntries = within(recentPanel as HTMLElement).getAllByRole('listitem');

		expect(transactionEntries).toHaveLength(2);
		expect(within(transactionEntries[0]).getByText('Groceries')).toBeTruthy();
		expect(within(transactionEntries[1]).getByText('Coffee')).toBeTruthy();
	});
});

interface FetchMockOptions {
	accounts: Array<{ name: string; type: string }>;
	transactions: Array<{
		date: string;
		title: string;
		payee: string | null;
		primary_category: string | null;
		tags: string[];
		postings: Array<{ account: string; amount: string }>;
	}>;
}

function createLedgerFetchMock(options: FetchMockOptions) {
	const accounts = [...options.accounts];
	const transactions = [...options.transactions];

	return vi.fn<typeof fetch>(async (input, init) => {
		const url = String(input);
		const method = init?.method ?? 'GET';

		if (url === 'http://127.0.0.1:3000/accounts' && method === 'GET') {
			return jsonResponse(accounts);
		}

		if (url === 'http://127.0.0.1:3000/accounts' && method === 'POST') {
			const payload = JSON.parse(String(init?.body));
			accounts.push(payload);
			return jsonResponse(payload, 201);
		}

		if (url === 'http://127.0.0.1:3000/transactions' && method === 'GET') {
			return jsonResponse(transactions);
		}

		if (url === 'http://127.0.0.1:3000/transactions' && method === 'POST') {
			const payload = JSON.parse(String(init?.body));
			transactions.unshift(payload);
			return jsonResponse({ status: 'created' }, 201);
		}

		throw new Error(`Unhandled fetch request: ${method} ${url}`);
	});
}
