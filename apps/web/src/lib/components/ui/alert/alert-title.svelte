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
	data-slot="alert-title"
	class={cn(
		'[&_a]:hover:text-foreground font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
