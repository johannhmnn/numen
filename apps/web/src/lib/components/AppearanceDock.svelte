<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	import {
		PREFERS_DARK_THEME_QUERY,
		THEME_OPTIONS,
		applyTheme,
		getSystemTheme,
		readInitialResolvedTheme,
		readInitialThemePreference,
		readStoredThemePreference,
		resolveTheme,
		subscribeToSystemThemeChanges,
		type ResolvedTheme,
		type ThemePreference,
		writeStoredThemePreference
	} from '$lib/theme';

	const root = browser ? document.documentElement : null;

	let themePreference = $state<ThemePreference>(readInitialThemePreference(root));
	let resolvedTheme = $state<ResolvedTheme>(readInitialResolvedTheme(root));
	let systemTheme = $state<ResolvedTheme>(readInitialResolvedTheme(root));

	let statusCopy = $derived.by(() => {
		if (themePreference === 'system') {
			return `System is active · ${capitalize(resolvedTheme)} now`;
		}

		return `${capitalize(themePreference)} is pinned`;
	});

	onMount(() => {
		const mediaQuery = window.matchMedia(PREFERS_DARK_THEME_QUERY);

		systemTheme = getSystemTheme(mediaQuery);
		themePreference = readStoredThemePreference(window.localStorage);
		syncTheme();

		return subscribeToSystemThemeChanges(mediaQuery, (event) => {
			systemTheme = event.matches ? 'dark' : 'light';

			if (themePreference === 'system') {
				syncTheme();
			}
		});
	});

	function setThemePreference(nextPreference: ThemePreference) {
		themePreference = nextPreference;
		writeStoredThemePreference(window.localStorage, nextPreference);
		syncTheme();
	}

	function syncTheme() {
		if (!browser) {
			return;
		}

		resolvedTheme = resolveTheme(themePreference, systemTheme);
		applyTheme(document.documentElement, themePreference, resolvedTheme);
	}

	function capitalize(value: string) {
		return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
	}
</script>

<section class="appearance-dock" aria-label="Appearance controls">
	<div class="appearance-copy">
		<p class="appearance-kicker">Appearance</p>
		<p class="appearance-status">{statusCopy}</p>
	</div>

	<div class="appearance-toggle" role="radiogroup" aria-label="Color theme">
		{#each THEME_OPTIONS as option (option.value)}
			<label class:selected={themePreference === option.value} title={option.description}>
				<input
					type="radio"
					name="theme-preference"
					value={option.value}
					checked={themePreference === option.value}
					onchange={() => setThemePreference(option.value)}
				/>
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</section>

<style>
	.appearance-dock {
		display: grid;
		gap: 0.55rem;
		padding: 0.8rem;
		border: 1px solid var(--chrome-line);
		border-radius: 1.5rem;
		background: var(--chrome-surface);
		box-shadow: var(--chrome-shadow);
		backdrop-filter: blur(16px);
	}

	.appearance-copy {
		display: grid;
		gap: 0.18rem;
	}

	.appearance-kicker,
	.appearance-status,
	.appearance-toggle label span {
		font-family: var(--font-mono);
	}

	.appearance-kicker {
		margin: 0;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--accent);
	}

	.appearance-status {
		margin: 0;
		font-size: 0.74rem;
		line-height: 1.35;
		color: var(--ink-soft);
	}

	.appearance-toggle {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
		padding: 0.28rem;
		border-radius: 1.15rem;
		background: var(--toggle-track);
	}

	.appearance-toggle label {
		position: relative;
		display: grid;
		place-items: center;
		border-radius: 0.95rem;
		padding: 0.7rem 0.8rem;
		min-width: 4.75rem;
		color: var(--ink-soft);
		cursor: pointer;
		transition:
			transform 160ms ease,
			background-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease;
	}

	.appearance-toggle label:hover {
		transform: translateY(-1px);
		color: var(--ink);
	}

	.appearance-toggle input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.appearance-toggle label.selected {
		background: var(--toggle-pill);
		color: var(--toggle-pill-ink);
		box-shadow: 0 14px 28px rgba(0, 0, 0, 0.14);
	}

	.appearance-toggle input:focus-visible + span {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}

	@media (max-width: 640px) {
		.appearance-dock {
			width: 100%;
		}

		.appearance-toggle label {
			min-width: 0;
		}
	}
</style>
