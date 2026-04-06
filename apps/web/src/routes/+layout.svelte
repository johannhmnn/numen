<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';

	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';
	import AppearanceDock from '$lib/components/AppearanceDock.svelte';
	import { ptBrCopy } from '$lib/locale';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="color-scheme" content="light dark" />
</svelte:head>

<div class="min-h-screen pb-8">
	<header class="sticky top-0 z-20 px-3 pt-3 sm:px-4 md:px-6">
		<div
			class="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[1.75rem] border border-[color:var(--chrome-line)] bg-[color:var(--chrome-surface)] px-4 py-3 shadow-[var(--chrome-shadow)] backdrop-blur"
		>
			<a
				class="grid min-w-0 gap-1 text-left no-underline"
				href={resolve('/')}
				aria-label={ptBrCopy.layout.homeAriaLabel}
			>
				<span
					class="[font-family:var(--font-mono)] text-[0.68rem] tracking-[0.18em] text-[color:var(--accent)] uppercase"
				>
					Numen
				</span>
				<strong class="truncate text-sm font-semibold text-[color:var(--ink)] sm:text-base">
					{ptBrCopy.layout.localLedger}
				</strong>
			</a>

			<AppearanceDock />
		</div>
	</header>

	<div class="relative">
		{@render children()}
	</div>
</div>
