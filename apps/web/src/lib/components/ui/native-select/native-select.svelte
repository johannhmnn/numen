<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	type NativeSelectProps = Omit<WithElementRef<WithoutChildren<HTMLSelectAttributes>>, 'size'> & {
		children?: Snippet;
		size?: 'sm' | 'default';
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = 'default',
		children,
		...restProps
	}: NativeSelectProps = $props();
</script>

<div
	class={cn(
		'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
		className
	)}
	data-slot="native-select-wrapper"
	data-size={size}
>
	<select
		bind:value
		bind:this={ref}
		data-slot="native-select"
		data-size={size}
		class="bg-input/50 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 w-full min-w-0 appearance-none rounded-3xl border border-transparent py-1 pr-8 pl-3 text-sm transition-[color,box-shadow,background-color] outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:ring-3 data-[size=sm]:h-8"
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon
		class="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 select-none"
		aria-hidden
		data-slot="native-select-icon"
	/>
</div>
