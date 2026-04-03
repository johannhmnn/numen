<script lang="ts">
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

<div class="app-shell">
	<header class="app-chrome">
		<a class="brand-mark" href={resolve('/')} aria-label={ptBrCopy.layout.homeAriaLabel}>
			<span>Numen</span>
			<strong>{ptBrCopy.layout.localLedger}</strong>
		</a>

		<AppearanceDock />
	</header>

	<div class="app-stage">
		{@render children()}
	</div>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		padding: 0 0 1.5rem;
	}

	.app-chrome {
		position: sticky;
		top: 0;
		z-index: 10;
		max-width: 78rem;
		margin: 0 auto;
		padding: 1rem 1rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.brand-mark {
		display: inline-grid;
		gap: 0.2rem;
		padding: 0.85rem 1rem;
		border-radius: 1.4rem;
		border: 1px solid var(--chrome-line);
		background: var(--chrome-surface);
		box-shadow: var(--chrome-shadow);
		backdrop-filter: blur(16px);
		text-decoration: none;
		color: inherit;
	}

	.brand-mark span {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--accent);
	}

	.brand-mark strong {
		font-size: 0.98rem;
		font-weight: 600;
	}

	.app-stage {
		position: relative;
	}

	@media (max-width: 720px) {
		.app-chrome {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
