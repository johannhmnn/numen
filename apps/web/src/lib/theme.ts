export const THEME_STORAGE_KEY = 'numen-theme-preference';
export const PREFERS_DARK_THEME_QUERY = '(prefers-color-scheme: dark)';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_OPTIONS: ReadonlyArray<{
	value: ThemePreference;
	label: string;
	description: string;
}> = [
	{
		value: 'light',
		label: 'Light',
		description: 'Keep the ledger bright and paper-toned.'
	},
	{
		value: 'dark',
		label: 'Dark',
		description: 'Shift the desk into a low-light reading room.'
	},
	{
		value: 'system',
		label: 'System',
		description: 'Follow the device preference automatically.'
	}
] as const;

type ThemeChangeListener = (event: Pick<MediaQueryListEvent, 'matches'>) => void;

interface ThemeMediaQuery {
	readonly matches: boolean;
	addEventListener?: (type: 'change', listener: ThemeChangeListener) => void;
	removeEventListener?: (type: 'change', listener: ThemeChangeListener) => void;
	addListener?: (listener: ThemeChangeListener) => void;
	removeListener?: (listener: ThemeChangeListener) => void;
}

interface ThemeStorageReader {
	getItem(key: string): string | null;
}

interface ThemeStorageWriter extends ThemeStorageReader {
	setItem(key: string, value: string): void;
}

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredThemePreference(
	storage: ThemeStorageReader | null | undefined
): ThemePreference {
	try {
		const value = storage?.getItem(THEME_STORAGE_KEY);

		return isThemePreference(value) ? value : 'system';
	} catch {
		return 'system';
	}
}

export function writeStoredThemePreference(
	storage: ThemeStorageWriter | null | undefined,
	preference: ThemePreference
) {
	try {
		storage?.setItem(THEME_STORAGE_KEY, preference);
	} catch {
		// Ignore storage failures and keep the in-memory selection.
	}
}

export function readInitialThemePreference(root: HTMLElement | null | undefined): ThemePreference {
	return isThemePreference(root?.dataset.themePreference) ? root.dataset.themePreference : 'system';
}

export function readInitialResolvedTheme(root: HTMLElement | null | undefined): ResolvedTheme {
	return root?.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function getSystemTheme(
	mediaQuery: Pick<ThemeMediaQuery, 'matches'> | null | undefined
): ResolvedTheme {
	return mediaQuery?.matches ? 'dark' : 'light';
}

export function resolveTheme(
	preference: ThemePreference,
	systemTheme: ResolvedTheme
): ResolvedTheme {
	return preference === 'system' ? systemTheme : preference;
}

export function applyTheme(
	root: HTMLElement,
	preference: ThemePreference,
	resolvedTheme: ResolvedTheme
) {
	root.dataset.themePreference = preference;
	root.dataset.theme = resolvedTheme;
	root.style.colorScheme = resolvedTheme;
}

export function subscribeToSystemThemeChanges(
	mediaQuery: ThemeMediaQuery,
	listener: ThemeChangeListener
) {
	if (typeof mediaQuery.addEventListener === 'function') {
		mediaQuery.addEventListener('change', listener);

		return () => mediaQuery.removeEventListener?.('change', listener);
	}

	mediaQuery.addListener?.(listener);

	return () => mediaQuery.removeListener?.(listener);
}
