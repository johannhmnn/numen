import { expect, test, type Page } from '@playwright/test';

test('guided transaction entry works end to end in the browser', async ({ page }) => {
	page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') {
			console.log('BROWSER_CONSOLE_ERROR', message.text());
		}
	});

	await wireLedgerApiMocks(page);

	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');

	await expect(page.getByText(/Lance as transações que você realmente lembra\./)).toBeVisible();
	await expect(page.getByText(/Escolha as contas que estruturam cada lançamento\./)).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(
		page.getByText(
			'Registre uma transação e ela aparecerá aqui como a movimentação mais recente do seu razão.'
		)
	).toBeVisible();

	const themeTrigger = page.getByRole('button', { name: 'Trocar tema de aparência' });

	await themeTrigger.click();
	await page.getByRole('menuitemradio', { name: 'Claro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await themeTrigger.click();
	await page.getByRole('menuitemradio', { name: 'Escuro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await themeTrigger.click();
	await page.getByRole('menuitemradio', { name: 'Sistema' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	const accountForm = page.getByRole('form', { name: 'Adicionar conta' });
	const fundingSection = page.getByLabel('Contas de origem');
	const categorySection = page.getByLabel('Contas de categoria');

	await accountForm.getByLabel('Nome da conta').fill('Assets:Checking');
	await accountForm.getByLabel('Tipo de conta').selectOption('Assets');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(fundingSection.getByText('Assets:Checking')).toBeVisible();
	await expect(accountForm.getByLabel('Nome da conta')).toHaveValue('');

	await accountForm.getByLabel('Nome da conta').fill('Expenses:Groceries');
	await accountForm.getByLabel('Tipo de conta').selectOption('Expenses');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(categorySection.getByText('Expenses:Groceries')).toBeVisible();

	const transactionForm = page.getByRole('form', { name: 'Lançamento guiado de transação' });

	await transactionForm.getByLabel('Data').fill('2026-04-02');
	await transactionForm.getByLabel('Título').fill('Groceries');
	await transactionForm.getByLabel('Favorecido').fill('Mercado Central');
	await transactionForm.getByLabel('Valor').fill('48,20');
	await transactionForm.getByRole('textbox', { name: 'Tags' }).fill('food, weekly');
	await expect(transactionForm.getByLabel('Conta de origem')).toHaveValue('Assets:Checking');
	await expect(transactionForm.getByLabel('Conta de categoria')).toHaveValue('Expenses:Groceries');

	const submitTransactionButton = page.getByRole('button', { name: 'Registrar transação' });
	await expect(submitTransactionButton).toBeEnabled();
	await submitTransactionButton.click();

	await expect(page.getByText('Transação registrada no razão local.')).toBeVisible();

	const recentPanel = page.locator('section').filter({
		has: page.getByRole('heading', {
			name: 'As transações mais novas aparecem assim que entram.'
		})
	});
	const latestTransaction = recentPanel.locator('.transaction-list li').first();

	await expect(latestTransaction.getByText('Groceries', { exact: true })).toBeVisible();
	await expect(latestTransaction.getByText('Mercado Central')).toBeVisible();
	await expect(latestTransaction.getByText('+48,20')).toBeVisible();
});

test('mobile layout keeps the transaction flow in the first viewport and exposes setup via accordion', async ({
	page
}) => {
	page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') {
			console.log('BROWSER_CONSOLE_ERROR', message.text());
		}
	});

	await wireLedgerApiMocks(page);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	const viewportMetrics = await page.evaluate(() => {
		const doc = document.documentElement;

		return {
			scrollWidth: doc.scrollWidth,
			clientWidth: doc.clientWidth
		};
	});

	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);
	await expect(
		page.getByText(/Registre uma conta de origem, uma conta de categoria e um valor claro\./)
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Abrir painel de contas' })).toBeVisible();

	await page.getByRole('button', { name: 'Trocar tema de aparência' }).click();
	await page.getByRole('menuitemradio', { name: 'Claro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');

	const accountDeskToggle = page.getByRole('button', { name: /Painel de contas e configuração/i });
	await accountDeskToggle.click();

	const accountForm = page.getByRole('form', { name: 'Adicionar conta' });
	await expect(accountForm).toBeVisible();

	await accountForm.getByLabel('Nome da conta').fill('Assets:Checking');
	await accountForm.getByLabel('Tipo de conta').selectOption('Assets');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(accountForm.getByLabel('Nome da conta')).toHaveValue('');

	await accountForm.getByLabel('Nome da conta').fill('Expenses:Groceries');
	await accountForm.getByLabel('Tipo de conta').selectOption('Expenses');
	await accountForm.getByRole('button', { name: 'Adicionar conta' }).click();
	await expect(page.getByLabel('Contas de categoria').getByText('Expenses:Groceries')).toBeVisible();

	const transactionForm = page.getByRole('form', { name: 'Lançamento guiado de transação' });
	await transactionForm.getByLabel('Data').fill('2026-04-02');
	await transactionForm.getByLabel('Título').fill('Mercado');
	await transactionForm.getByLabel('Favorecido').fill('Mercado Central');
	await transactionForm.getByLabel('Valor').fill('48,20');
	await transactionForm.getByRole('textbox', { name: 'Tags' }).fill('alimentação, semanal');
	await expect(transactionForm.getByLabel('Conta de origem')).toHaveValue('Assets:Checking');
	await expect(transactionForm.getByLabel('Conta de categoria')).toHaveValue('Expenses:Groceries');

	const submitTransactionButton = page.getByRole('button', { name: 'Registrar transação' });
	await expect(submitTransactionButton).toBeEnabled();
	await submitTransactionButton.click();

	await expect(page.getByText('Transação registrada no razão local.')).toBeVisible();
	await expect(
		page.locator('.transaction-list li').first().getByText('Mercado', { exact: true })
	).toBeVisible();
});

async function wireLedgerApiMocks(page: Page) {
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
}
