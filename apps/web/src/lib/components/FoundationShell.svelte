<script lang="ts">
	const principles = [
		'Double-entry bookkeeping at the core',
		'Local-first architecture with a Rust API',
		'TDD-driven feature slices from day one'
	];
</script>

<section class="shell">
	<div class="hero">
		<p class="eyebrow">Feature 0 foundation</p>
		<h1>Numen</h1>
		<p class="lede">A local-first finance app with a Rust ledger core and a SvelteKit interface.</p>
	</div>

	<div class="principles" aria-label="Foundational principles">
		{#each principles as principle (principle)}
			<article class="card">
				<p>{principle}</p>
			</article>
		{/each}
	</div>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
		background:
			radial-gradient(circle at top, rgba(243, 225, 199, 0.45), transparent 45%),
			linear-gradient(180deg, #fff7eb 0%, #f3eadf 100%);
		color: #2a1c12;
	}

	.shell {
		min-height: 100vh;
		display: grid;
		gap: 2rem;
		padding: 4rem 1.5rem 3rem;
		align-content: center;
		max-width: 72rem;
		margin: 0 auto;
	}

	.hero {
		display: grid;
		gap: 1rem;
		max-width: 42rem;
	}

	.eyebrow {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.75rem;
		color: #8a5a36;
	}

	h1 {
		margin: 0;
		font-size: clamp(3rem, 8vw, 6rem);
		line-height: 0.95;
	}

	.lede {
		margin: 0;
		font-size: clamp(1.1rem, 2.8vw, 1.5rem);
		line-height: 1.6;
		max-width: 34rem;
	}

	.principles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.card {
		padding: 1.25rem;
		border: 1px solid rgba(138, 90, 54, 0.2);
		border-radius: 1.25rem;
		background: rgba(255, 250, 244, 0.8);
		backdrop-filter: blur(10px);
		box-shadow: 0 18px 40px rgba(105, 72, 49, 0.08);
	}

	.card p {
		margin: 0;
		line-height: 1.5;
	}

	@media (max-width: 40rem) {
		.shell {
			padding-top: 3rem;
		}
	}
</style>
