<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<WithoutChildren<HTMLAttributes<HTMLDivElement>>> & {
		children?: Snippet;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-title"
	class={cn('text-base font-medium', className)}
	{...restProps}
>
	{@render children?.()}
</div>
