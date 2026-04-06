<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLOptionAttributes } from 'svelte/elements';
	import type { WithElementRef, WithoutChildren } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		children,
		...restProps
	}: WithElementRef<WithoutChildren<HTMLOptionAttributes>> & {
		children?: Snippet;
	} = $props();
</script>

<option bind:this={ref} data-slot="native-select-option" {...restProps}>
	{@render children?.()}
</option>
