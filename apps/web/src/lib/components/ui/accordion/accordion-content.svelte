<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<AccordionPrimitive.ContentProps> & {
		children?: Snippet;
	} = $props();
</script>

<AccordionPrimitive.Content
	bind:ref
	data-slot="accordion-content"
	class="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden px-4 text-sm"
	{...restProps}
>
	<div
		class={cn(
			'[&_a]:hover:text-foreground pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4',
			className
		)}
	>
		{@render children?.()}
	</div>
</AccordionPrimitive.Content>
