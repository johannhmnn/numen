import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import FoundationShell from './FoundationShell.svelte';

describe('FoundationShell', () => {
	it('renders the Feature 0 shell', () => {
		render(FoundationShell);

		expect(screen.getByRole('heading', { name: 'Numen' })).toBeTruthy();
		expect(screen.getByText('Feature 0 foundation')).toBeTruthy();
		expect(screen.getByText('Double-entry bookkeeping at the core')).toBeTruthy();
	});
});
