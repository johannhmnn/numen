import { expect, test } from '@playwright/test';

test('guided transaction entry works end to end in the browser', async ({ page }) => {
	const accounts: Array<{ name: string; type: string }> = [];
	const transactions: Array<{
		date: string;
		title: string;
		payee: string | null;
		primary_category: string | null;
		tags: string[];
		postings: Array<{ account: string; amount: string }>;
	}> = [];

	await page.route('http://127.0.0.1:3000/accounts', async (route) => {
		const method = route.request().method();

		if (method === 'GET') {
			await route.fulfill({ status: 200, json: accounts });
			return;
		}

		if (method === 'POST') {
			const payload = route.request().postDataJSON() as { name: string; type: string };
			accounts.push(payload);
			await route.fulfill({ status: 201, json: payload });
			return;
		}

		throw new Error(`Unhandled accounts route method: ${method}`);
	});

	await page.route('http://127.0.0.1:3000/transactions', async (route) => {
		const method = route.request().method();

		if (method === 'GET') {
			await route.fulfill({ status: 200, json: transactions });
			return;
		}

		if (method === 'POST') {
			const payload = route.request().postDataJSON() as (typeof transactions)[number];
			transactions.unshift(payload);
			await route.fulfill({ status: 201, json: { status: 'created' } });
			return;
		}

		throw new Error(`Unhandled transactions route method: ${method}`);
	});

	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');

	await expect(
		page.getByRole('heading', {
			name: 'Lance as transacoes que voce realmente lembra.'
		})
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Escolha as contas que estruturam cada lancamento.' })
	).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: 'Sistema' })).toBeChecked();
	await expect(
		page.getByText(
			'Registre uma transacao e ela aparecera aqui como a movimentacao mais recente do seu razao.'
		)
	).toBeVisible();

	await page.getByRole('radio', { name: 'Claro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.getByRole('radio', { name: 'Claro' })).toBeChecked();

	await page.getByRole('radio', { name: 'Escuro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: 'Escuro' })).toBeChecked();

	await page.getByRole('radio', { name: 'Sistema' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: 'Sistema' })).toBeChecked();

	const accountForm = page.getByRole('form', { name: 'Adicionar conta' });
	const fundingSection = page.getByLabel('Contas de origem');
	const categorySection = page.getByLabel('Contas de categoria');

	await accountForm.getByLabel('Nome da conta').fill('Assets:Checking');
	await accountForm.getByLabel('Tipo de conta').selectOption('Assets');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(fundingSection.getByText('Assets:Checking')).toBeVisible();

	await accountForm.getByLabel('Nome da conta').fill('Expenses:Groceries');
	await accountForm.getByLabel('Tipo de conta').selectOption('Expenses');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(categorySection.getByText('Expenses:Groceries')).toBeVisible();

	const transactionForm = page.getByRole('form', { name: 'Lancamento guiado de transacao' });

	await transactionForm.getByLabel('Data').fill('2026-04-02');
	await transactionForm.getByLabel('Titulo').fill('Groceries');
	await transactionForm.getByLabel('Favorecido').fill('Mercado Central');
	await transactionForm.getByLabel('Valor').fill('48,20');
	await transactionForm.getByRole('textbox', { name: 'Tags' }).fill('food, weekly');
	await transactionForm.getByRole('button', { name: 'Registrar transacao' }).click();

	await expect(page.getByText('Transacao registrada no razao local.')).toBeVisible();

	const recentPanel = page.locator('section').filter({
		has: page.getByRole('heading', {
			name: 'As transacoes mais novas aparecem assim que entram.'
		})
	});
	const latestTransaction = recentPanel.locator('.transaction-list li').first();

	await expect(latestTransaction.getByText('Groceries', { exact: true })).toBeVisible();
	await expect(latestTransaction.getByText('Mercado Central')).toBeVisible();
	await expect(latestTransaction.getByText('+48,20')).toBeVisible();
});
