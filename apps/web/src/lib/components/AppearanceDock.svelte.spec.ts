import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY } from '$lib/theme';

import AppearanceDock from './AppearanceDock.svelte';

function createMediaQueryList(
	initialMatches: boolean,
	listeners: Set<(event: Pick<MediaQueryListEvent, 'matches'>) => void>
) {
	return {
		matches: initialMatches,
		media: '(prefers-color-scheme: dark)',
		onchange: null,
		addEventListener(
			_type: 'change',
			listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void
		) {
			listeners.add(listener);
		},
		removeEventListener(
			_type: 'change',
			listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void
		) {
			listeners.delete(listener);
		},
		addListener(listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void) {
			listeners.add(listener);
		},
		removeListener(listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void) {
			listeners.delete(listener);
		},
		dispatchEvent() {
			return true;
		}
	} as unknown as MediaQueryList;
}

class MatchMediaController {
	private listeners = new Set<(event: Pick<MediaQueryListEvent, 'matches'>) => void>();
	private mediaQueryList: MediaQueryList;

	constructor(initialMatches: boolean) {
		this.mediaQueryList = createMediaQueryList(initialMatches, this.listeners);
	}

	install() {
		const stub = vi.fn<(query: string) => MediaQueryList>().mockImplementation((query) => {
			expect(query).toBe('(prefers-color-scheme: dark)');

			return this.mediaQueryList;
		});

		vi.stubGlobal('matchMedia', stub);
	}

	setMatches(nextMatches: boolean) {
		Object.defineProperty(this.mediaQueryList, 'matches', {
			configurable: true,
			value: nextMatches
		});

		for (const listener of this.listeners) {
			listener({ matches: nextMatches });
		}
	}
}

describe('AppearanceDock', () => {
	afterEach(() => {
		cleanup();
		window.localStorage.clear();
		document.documentElement.removeAttribute('data-theme');
		document.documentElement.removeAttribute('data-theme-preference');
		document.documentElement.style.colorScheme = '';
		vi.unstubAllGlobals();
	});

	it('defaults to system and resolves from the current OS preference', async () => {
		const media = new MatchMediaController(true);
		media.install();

		render(AppearanceDock);

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('system');
		});

		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(document.documentElement.style.colorScheme).toBe('dark');
		expect(screen.getByRole('button', { name: 'Trocar tema de aparência' })).toBeTruthy();
	});

	it('uses a saved preference instead of the OS preference', async () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, 'light');

		const media = new MatchMediaController(true);
		media.install();

		render(AppearanceDock);

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('light');
		});

		expect(document.documentElement.dataset.theme).toBe('light');
		await fireEvent.click(screen.getByRole('button', { name: 'Trocar tema de aparência' }));
		expect(screen.getByRole('menuitemradio', { name: /^Claro\b/u })).toHaveAttribute(
			'data-state',
			'checked'
		);
		expect(screen.getByText('Tema selecionado: Claro')).toBeTruthy();
	});

	it('tracks system theme changes while system mode is selected', async () => {
		const media = new MatchMediaController(false);
		media.install();

		render(AppearanceDock);

		await waitFor(() => {
			expect(document.documentElement.dataset.theme).toBe('light');
		});

		media.setMatches(true);

		await waitFor(() => {
			expect(document.documentElement.dataset.theme).toBe('dark');
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Trocar tema de aparência' }));
		expect(screen.getByRole('menuitemradio', { name: /^Sistema\b/u })).toHaveAttribute(
			'data-state',
			'checked'
		);
		expect(screen.getByText('Acompanhando o sistema: Escuro')).toBeTruthy();
	});

	it('exposes an accessible theme dropdown and persists explicit selections', async () => {
		const media = new MatchMediaController(false);
		media.install();

		render(AppearanceDock);

		const trigger = screen.getByRole('button', { name: 'Trocar tema de aparência' });
		await fireEvent.click(trigger);
		const menu = screen.getByRole('menu', { name: 'Menu de aparência' });

		expect(within(menu).getByRole('menuitemradio', { name: /^Claro\b/u })).toBeTruthy();
		expect(within(menu).getByRole('menuitemradio', { name: /^Escuro\b/u })).toBeTruthy();
		expect(within(menu).getByRole('menuitemradio', { name: /^Sistema\b/u })).toBeTruthy();

		await fireEvent.click(within(menu).getByRole('menuitemradio', { name: /^Escuro\b/u }));

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('dark');
		});

		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		await fireEvent.click(trigger);
		expect(screen.getByRole('menuitemradio', { name: /^Escuro\b/u })).toHaveAttribute(
			'data-state',
			'checked'
		);

		await fireEvent.click(screen.getByRole('menuitemradio', { name: /^Sistema\b/u }));

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('system');
		});

		expect(document.documentElement.dataset.theme).toBe('light');
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
		await fireEvent.click(trigger);
		expect(screen.getByRole('menuitemradio', { name: /^Sistema\b/u })).toHaveAttribute(
			'data-state',
			'checked'
		);
	});
});
