<script lang="ts">
	import type { Spec } from '$lib/wow-specs';
	import { getSpecIcon } from '$lib/wow-specs';

	let {
		value = $bindable(),
		specs = [],
		classFileName = ''
	}: {
		value: string | undefined;
		specs: Spec[];
		classFileName: string;
	} = $props();

	let detailsEl = $state<HTMLDetailsElement>();
	let selectedSpec = $derived(specs.find(s => s.name === value));
</script>

<details bind:this={detailsEl} class="spec-selector relative min-w-10">
	<summary class="flex w-full items-center gap-2 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-left text-xs text-gray-200 hover:border-gray-500 focus:border-blue-500 focus:outline-none cursor-pointer list-none">
		{#if selectedSpec}
			{@const specIcon = getSpecIcon(classFileName, selectedSpec.name)}
			{#if specIcon}
				<img src={specIcon} alt={selectedSpec.name} class="h-5 w-5 rounded" />
			{/if}
			<span class="flex-1">{selectedSpec.name}</span>
		{:else}
			<span class="flex-1 text-gray-400">Select Spec</span>
		{/if}
		<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</summary>

	<div class="absolute z-50 mt-1 w-full rounded border border-gray-600 bg-gray-800 shadow-lg">
		<div class="max-h-60 overflow-y-auto">
			<button
				type="button"
				onclick={() => { value = ''; detailsEl?.removeAttribute('open'); }}
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-700"
			>
				<span>None</span>
			</button>
			{#each specs as spec (spec.name)}
				{@const specIcon = getSpecIcon(classFileName, spec.name)}
				{@const roleIcon = `/roles/${spec.role}_icon.webp`}
				<button
					type="button"
					onclick={() => { value = spec.name; detailsEl?.removeAttribute('open'); }}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-700 {value === spec.name ? 'bg-gray-700/50' : ''}"
				>
					{#if specIcon}
						<img src={specIcon} alt={spec.name} class="h-5 w-5 rounded" />
					{/if}
					<span class="flex-1">{spec.name}</span>
					{#if roleIcon}
						<img src={roleIcon} alt={spec.role} class="h-4 w-4" title={spec.role} />
					{/if}
				</button>
			{/each}
		</div>
	</div>
</details>
