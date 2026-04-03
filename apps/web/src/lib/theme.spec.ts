import { describe, expect, it } from 'vitest';

import {
	applyTheme,
	getSystemTheme,
	isThemePreference,
	readStoredThemePreference,
	resolveTheme
} from './theme';

describe('theme helpers', () => {
	it('accepts only supported theme preferences', () => {
		expect(isThemePreference('light')).toBe(true);
		expect(isThemePreference('dark')).toBe(true);
		expect(isThemePreference('system')).toBe(true);
		expect(isThemePreference('sepia')).toBe(false);
	});

	it('defaults to system when storage is empty or invalid', () => {
		expect(readStoredThemePreference({ getItem: () => null })).toBe('system');
		expect(readStoredThemePreference({ getItem: () => 'sepia' })).toBe('system');
	});

	it('resolves system from the current media query result', () => {
		expect(getSystemTheme({ matches: true })).toBe('dark');
		expect(getSystemTheme({ matches: false })).toBe('light');
		expect(resolveTheme('system', 'dark')).toBe('dark');
		expect(resolveTheme('light', 'dark')).toBe('light');
	});

	it('applies both preference and resolved theme to the document root', () => {
		const root = {
			dataset: {} as DOMStringMap,
			style: { colorScheme: '' } as CSSStyleDeclaration
		} as HTMLElement;

		applyTheme(root, 'system', 'dark');

		expect(root.dataset.themePreference).toBe('system');
		expect(root.dataset.theme).toBe('dark');
		expect(root.style.colorScheme).toBe('dark');
	});
});
