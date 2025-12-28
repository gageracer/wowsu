<script lang="ts">
	import type { RosterMember } from '$lib/types/roster';

	interface ColumnConfig {
		key: keyof RosterMember | 'daysOffline';
		label: string;
		visible: boolean;
		alwaysVisible?: boolean;
		sortable: boolean;
	}

	let {
		columns = $bindable([]),
		onReset
	}: {
		columns: ColumnConfig[];
		onReset: () => void;
	} = $props();

	const visibleColumns = $derived(columns.filter(col => col.visible));

	function toggleColumn(key: keyof RosterMember | 'daysOffline') {
		const col = columns.find(c => c.key === key);
		if (col && !col.alwaysVisible) {
			col.visible = !col.visible;
		}
	}
</script>

<div class="mb-4 rounded-lg border border-purple-600 bg-gray-900 p-4">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-purple-400">Column Manager</h3>
		<button
			onclick={onReset}
			class="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600"
		>
			Reset to Defaults
		</button>
	</div>
	<p class="mb-3 text-sm text-gray-400">
		Toggle which columns are displayed in the roster table
	</p>
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
		{#each columns as column (column.key)}
			<label
				class="flex items-center gap-2 rounded border p-2 transition-colors {column.visible
					? 'border-purple-500 bg-purple-900/30'
					: 'border-gray-600 bg-gray-800/50'} {column.alwaysVisible
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer hover:border-purple-400'}"
			>
				<input
					type="checkbox"
					checked={column.visible}
					disabled={column.alwaysVisible}
					onchange={() => toggleColumn(column.key)}
					class="h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
				/>
				<span class="text-sm text-gray-300">
					{column.label}
					{#if column.alwaysVisible}
						<span class="text-xs text-gray-500">(required)</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>
	<div class="mt-3 text-xs text-gray-500">
		Showing {visibleColumns.length} of {columns.length} columns
	</div>
</div>
