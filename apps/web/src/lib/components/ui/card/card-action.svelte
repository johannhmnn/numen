<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

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
	data-slot="card-action"
	class={cn(
		'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
