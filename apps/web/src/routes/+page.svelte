<script lang="ts">
	import LedgerWorkspace from '$lib/components/LedgerWorkspace.svelte';
	import { ptBrCopy } from '$lib/locale';
</script>

<svelte:head>
	<title>Numen</title>
	<meta name="description" content={ptBrCopy.page.description} />
</svelte:head>

<LedgerWorkspace />
