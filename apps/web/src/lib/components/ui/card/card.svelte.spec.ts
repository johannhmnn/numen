import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import CardRegressionHarness from './CardRegressionHarness.svelte';

describe('Card wrappers', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders multiple card sections without duplicating implicit children keys', () => {
		expect(() => render(CardRegressionHarness)).not.toThrow();

		expect(screen.getByText('Cartão de teste')).toBeTruthy();
		expect(screen.getByRole('form', { name: 'Formulário de teste' })).toBeTruthy();
		expect(screen.getByText('Mercado')).toBeTruthy();
		expect(screen.getByText('Café')).toBeTruthy();
	});
});
