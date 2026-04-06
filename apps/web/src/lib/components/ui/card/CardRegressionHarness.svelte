<script lang="ts">
	import * as Card from './index.js';

	const recentEntries = [
		{ id: '1', title: 'Mercado' },
		{ id: '2', title: 'Café' }
	];
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Cartão de teste</Card.Title>
		<Card.Description>Renderiza cabeçalho, conteúdo e rodapé sem quebrar.</Card.Description>
	</Card.Header>

	<Card.Content>
		<p>Mensagem inicial</p>

		<form aria-label="Formulário de teste" class="grid gap-2">
			<label for="harness-field">Campo</label>
			<input id="harness-field" type="text" value="ok" />
		</form>
	</Card.Content>

	<Card.Footer>
		<button type="button">Salvar</button>
	</Card.Footer>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>Lançamentos recentes</Card.Title>
	</Card.Header>

	<Card.Content>
		<ol>
			{#each recentEntries as entry (entry.id)}
				<li>{entry.title}</li>
			{/each}
		</ol>
	</Card.Content>
</Card.Root>
