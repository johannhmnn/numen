import { expect, test } from '@playwright/test';

test('home page loads the Numen foundation shell', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Numen' })).toBeVisible();
	await expect(page.getByText('Feature 0 foundation')).toBeVisible();
});
