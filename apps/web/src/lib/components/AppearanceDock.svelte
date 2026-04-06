<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import MonitorCogIcon from '@lucide/svelte/icons/monitor-cog';

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
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { cn } from '$lib/utils';
	import { ptBrCopy } from '$lib/locale';

	const root = browser ? document.documentElement : null;

	let themePreference = $state<ThemePreference>(readInitialThemePreference(root));
	let resolvedTheme = $state<ResolvedTheme>(readInitialResolvedTheme(root));
	let systemTheme = $state<ResolvedTheme>(readInitialResolvedTheme(root));

	let selectedTheme = $derived(
		THEME_OPTIONS.find((option) => option.value === themePreference) ?? THEME_OPTIONS[2]
	);
	let statusCopy = $derived.by(() => {
		if (themePreference === 'system') {
			return ptBrCopy.appearance.statusSystemActive(resolvedTheme);
		}

		return ptBrCopy.appearance.statusPinned(themePreference);
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
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label={ptBrCopy.appearance.triggerLabel}
		class={cn(
			buttonVariants({ variant: 'outline', size: 'sm' }),
			'rounded-full border-[color:var(--chrome-line)] bg-[color:var(--chrome-surface)] px-3 text-[color:var(--ink)] shadow-[var(--chrome-shadow)] backdrop-blur md:px-4'
		)}
	>
		<MonitorCogIcon />
		<span class="hidden font-medium sm:inline">{selectedTheme.label}</span>
		<ChevronsUpDownIcon class="text-[color:var(--ink-soft)]" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Content
		align="end"
		aria-label={ptBrCopy.appearance.menuLabel}
		class="border-border/70 w-72 border bg-[color:var(--paper-lift)] p-2 text-[color:var(--ink)] shadow-[var(--chrome-shadow)] backdrop-blur"
	>
		<DropdownMenu.Label class="px-3 py-2">
			<div class="grid gap-1">
				<p
					class="[font-family:var(--font-mono)] text-[0.68rem] tracking-[0.18em] text-[color:var(--accent)] uppercase"
				>
					{ptBrCopy.appearance.kicker}
				</p>
				<p class="text-sm font-semibold text-[color:var(--ink)]">{selectedTheme.label}</p>
				<p class="text-xs leading-relaxed text-[color:var(--ink-soft)]">{statusCopy}</p>
			</div>
		</DropdownMenu.Label>

		<DropdownMenu.Separator class="bg-border/70 mx-1 my-1" />

		<DropdownMenu.RadioGroup value={themePreference}>
			{#each THEME_OPTIONS as option (option.value)}
				<DropdownMenu.RadioItem
					value={option.value}
					onclick={() => setThemePreference(option.value)}
					class="items-start rounded-[1.25rem] px-3 py-3"
				>
					{#snippet children({ checked })}
						<div class="grid gap-0.5 pr-4">
							<span class="text-sm font-medium text-[color:var(--ink)]">{option.label}</span>
							<span
								class:text-[color:var(--accent)]={checked}
								class="text-xs leading-relaxed text-[color:var(--ink-soft)]"
							>
								{option.description}
							</span>
						</div>
					{/snippet}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
