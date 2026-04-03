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

	await page.goto('/');

	await expect(
		page.getByRole('heading', {
			name: 'Structured entry for the transactions you actually remember.'
		})
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Choose the accounts that frame each entry.' })
	).toBeVisible();
	await expect(
		page.getByText('Record a transaction and it will appear here as your latest ledger move.')
	).toBeVisible();

	const accountForm = page.getByRole('form', { name: 'Add account' });
	const fundingSection = page.getByLabel('Funding accounts');
	const categorySection = page.getByLabel('Category accounts');

	await accountForm.getByLabel('Account name').fill('Assets:Checking');
	await accountForm.getByLabel('Account type').selectOption('Assets');
	await accountForm.getByRole('button', { name: 'Add account' }).click();
	await expect(fundingSection.getByText('Assets:Checking')).toBeVisible();

	await accountForm.getByLabel('Account name').fill('Expenses:Groceries');
	await accountForm.getByLabel('Account type').selectOption('Expenses');
	await accountForm.getByRole('button', { name: 'Add account' }).click();
	await expect(categorySection.getByText('Expenses:Groceries')).toBeVisible();

	const transactionForm = page.getByRole('form', { name: 'Guided transaction entry' });

	await transactionForm.getByLabel('Date').fill('2026-04-02');
	await transactionForm.getByLabel('Title').fill('Groceries');
	await transactionForm.getByLabel('Payee').fill('Mercado Central');
	await transactionForm.getByLabel('Amount').fill('48.20');
	await transactionForm.getByRole('textbox', { name: 'Tags' }).fill('food, weekly');
	await transactionForm.getByRole('button', { name: 'Record transaction' }).click();

	await expect(page.getByText('Transaction recorded to the local ledger.')).toBeVisible();

	const recentPanel = page.locator('section').filter({
		has: page.getByRole('heading', {
			name: 'Newest transactions stay visible the moment they land.'
		})
	});
	const latestTransaction = recentPanel.locator('.transaction-list li').first();

	await expect(latestTransaction.getByText('Groceries', { exact: true })).toBeVisible();
	await expect(latestTransaction.getByText('Mercado Central')).toBeVisible();
	await expect(latestTransaction.getByText('+48.20')).toBeVisible();
});
