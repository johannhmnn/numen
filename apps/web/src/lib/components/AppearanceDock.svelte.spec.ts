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
		expect((screen.getByRole('radio', { name: 'System' }) as HTMLInputElement).checked).toBe(true);
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
		expect((screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked).toBe(true);
		expect(screen.getByText('Light is pinned')).toBeTruthy();
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

		expect((screen.getByRole('radio', { name: 'System' }) as HTMLInputElement).checked).toBe(true);
		expect(screen.getByText('System is active · Dark now')).toBeTruthy();
	});

	it('exposes an accessible three-way toggle and persists explicit selections', async () => {
		const media = new MatchMediaController(false);
		media.install();

		render(AppearanceDock);

		const radioGroup = screen.getByRole('radiogroup', { name: 'Color theme' });

		expect(within(radioGroup).getByRole('radio', { name: 'Light' })).toBeTruthy();
		expect(within(radioGroup).getByRole('radio', { name: 'Dark' })).toBeTruthy();
		expect(within(radioGroup).getByRole('radio', { name: 'System' })).toBeTruthy();

		await fireEvent.click(within(radioGroup).getByRole('radio', { name: 'Dark' }));

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('dark');
		});

		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(
			(within(radioGroup).getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked
		).toBe(true);

		await fireEvent.click(within(radioGroup).getByRole('radio', { name: 'System' }));

		await waitFor(() => {
			expect(document.documentElement.dataset.themePreference).toBe('system');
		});

		expect(document.documentElement.dataset.theme).toBe('light');
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
		expect(
			(within(radioGroup).getByRole('radio', { name: 'System' }) as HTMLInputElement).checked
		).toBe(true);
	});
});
