<script lang="ts">
	import { WOW_SPECS } from '$lib/wow-specs';
	import type { Role } from '$lib/wow-specs';
	import type { RosterFilter, FilterField, FilterOperator } from '$lib/types/filters';

	let {
		filters = $bindable([]),
		matchAll = $bindable(true),
		applied = $bindable(false),
		totalCount = 0,
		filteredCount = 0
	}: {
		filters: RosterFilter[];
		matchAll: boolean;
		applied: boolean;
		totalCount: number;
		filteredCount: number;
	} = $props();

	let showFilters = $state(false);
	let filterIdCounter = $state(0);

	const FILTER_FIELDS: { value: FilterField; label: string }[] = [
		{ value: 'name', label: 'Name' },
		{ value: 'class', label: 'Class' },
		{ value: 'level', label: 'Level' },
		{ value: 'rankName', label: 'Rank' },
		{ value: 'mainSpec', label: 'Spec' },
		{ value: 'mainRole', label: 'Role' },
		{ value: 'zone', label: 'Zone' },
		{ value: 'note', label: 'Note' },
		{ value: 'achievementPoints', label: 'Achievement Points' },
		{ value: 'lastOnline', label: 'Last Online (days ago)' }
	];

	const OPERATORS: { value: FilterOperator; label: string }[] = [
		{ value: '=', label: '=' },
		{ value: '!=', label: '≠' },
		{ value: '>', label: '>' },
		{ value: '<', label: '<' },
		{ value: '>=', label: '≥' },
		{ value: '<=', label: '≤' },
		{ value: 'contains', label: 'contains' },
		{ value: 'not_contains', label: 'does not contain' },
		{ value: 'is_empty', label: 'is empty' },
		{ value: 'is_not_empty', label: 'is not empty' }
	];

	const WOW_CLASSES = Object.keys(WOW_SPECS).map((key) => ({
		value: key,
		label: key.charAt(0) + key.slice(1).toLowerCase()
	}));

	const WOW_ROLES: Role[] = ['Tank', 'DPS', 'Healer'];

	function addFilter() {
		filters.push({
			id: filterIdCounter++,
			field: 'name',
			operator: 'contains',
			value: ''
		});
	}

	function removeFilter(id: number) {
		filters = filters.filter((f) => f.id !== id);
	}

	function applyFilters() {
		applied = true;
	}

	function clearFilters() {
		filters = [];
		applied = false;
	}

	function getAvailableOperators(field: FilterField): typeof OPERATORS {
		const optionalFields = ['mainSpec', 'mainRole', 'zone', 'note'];

		if (field === 'level' || field === 'achievementPoints' || field === 'lastOnline') {
			// Numeric fields: comparison operators only
			return OPERATORS.filter((op) => ['=', '!=', '>', '<', '>=', '<='].includes(op.value));
		} else if (field === 'class') {
			// Class: exact match only
			return OPERATORS.filter((op) => ['=', '!='].includes(op.value));
		} else if (field === 'mainRole' || field === 'mainSpec') {
			// Optional fields with dropdowns: exact match + empty checks
			return OPERATORS.filter((op) => ['=', '!=', 'is_empty', 'is_not_empty'].includes(op.value));
		} else if (optionalFields.includes(field)) {
			// Other optional text fields: all operators
			return OPERATORS;
		}
		// Text fields (name, rankName): text operators only
		return OPERATORS.filter((op) => !['is_empty', 'is_not_empty'].includes(op.value));
	}

	// Check if operator needs a value input
	function needsValueInput(operator: FilterOperator): boolean {
		return operator !== 'is_empty' && operator !== 'is_not_empty';
	}

	// Get default value for a field
	function getDefaultValue(field: FilterField): string {
		if (field === 'level') {
			return '80';
		}
		return '';
	}

	// Reactive: update value when field changes
	$effect(() => {
		filters.forEach((filter) => {
			// If field changed and current value is empty, set default
			if (!filter.value && filter.field === 'level') {
				filter.value = '80';
			}
		});
	});
</script>

<div class="mb-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-200">Filters</h3>
		<button
			onclick={() => (showFilters = !showFilters)}
			class="text-sm text-blue-400 hover:text-blue-300"
		>
			{showFilters ? 'Hide' : 'Show'} Filters
		</button>
	</div>

	{#if showFilters}
		<div class="space-y-3">
			{#each filters as filter (filter.id)}
				<div class="flex gap-2 items-start">
					<!-- Field Selector -->
					<select
						bind:value={filter.field}
						onchange={() => {
							// Reset value when field changes and set defaults
							filter.value = getDefaultValue(filter.field);
						}}
						class="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
					>
						{#each FILTER_FIELDS as field}
							<option value={field.value}>{field.label}</option>
						{/each}
					</select>

					<!-- Operator Selector -->
					<select
						bind:value={filter.operator}
						class="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
					>
						{#each getAvailableOperators(filter.field) as op}
							<option value={op.value}>{op.label}</option>
						{/each}
					</select>

					<!-- Value Input/Selector (only show if operator needs a value) -->
					{#if needsValueInput(filter.operator)}
						{#if filter.field === 'class'}
							<select
								bind:value={filter.value}
								class="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
							>
								<option value="">Select Class...</option>
								{#each WOW_CLASSES as cls}
									<option value={cls.value}>{cls.label}</option>
								{/each}
							</select>
						{:else if filter.field === 'mainRole'}
							<select
								bind:value={filter.value}
								class="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
							>
								<option value="">Select Role...</option>
								{#each WOW_ROLES as role}
									<option value={role}>{role}</option>
								{/each}
							</select>
						{:else if filter.field === 'mainSpec'}
							<input
								type="text"
								bind:value={filter.value}
								placeholder="Enter spec name..."
								class="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
							/>
						{:else if filter.field === 'level' || filter.field === 'achievementPoints' || filter.field === 'lastOnline'}
							<input
								type="number"
								bind:value={filter.value}
								placeholder={filter.field === 'lastOnline' ? 'Days ago' : filter.field === 'level' ? '80' : 'Enter number...'}
								class="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
							/>
						{:else}
							<input
								type="text"
								bind:value={filter.value}
								placeholder="Enter value..."
								class="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
							/>
						{/if}
					{:else}
						<!-- Placeholder for empty/not empty operators -->
						<div class="flex-1 rounded border border-dashed border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-gray-500 italic">
							No value needed
						</div>
					{/if}

					<!-- Remove Button -->
					<button
						onclick={() => removeFilter(filter.id)}
						class="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
					>
						remove
					</button>
				</div>
			{/each}

			<!-- Add Filter Button -->
			<div>
				<button
					onclick={addFilter}
					class="rounded border border-dashed border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 hover:bg-gray-750 hover:text-gray-200"
				>
					+ Additional Filters...
				</button>
			</div>

			{#if filters.length > 1}
				<!-- Match Logic -->
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-400">Match:</span>
					<label class="flex items-center gap-1 text-gray-300">
						<input type="radio" bind:group={matchAll} value={true} class="text-blue-500" />
						All additional filters
					</label>
					<label class="flex items-center gap-1 text-gray-300">
						<input type="radio" bind:group={matchAll} value={false} class="text-blue-500" />
						At least one
					</label>
				</div>
			{/if}

			<!-- Apply/Clear Buttons -->
			<div class="flex gap-2 pt-2">
				<button
					onclick={applyFilters}
					class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
				>
					Apply Filter
				</button>
				{#if filters.length > 0 || applied}
					<button
						onclick={clearFilters}
						class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
					>
						Clear All
					</button>
				{/if}
			</div>

			<!-- Results Count -->
			{#if applied && filters.length > 0}
				<div class="text-sm text-gray-400">
					{filteredCount} {filteredCount === 1 ? 'member' : 'members'} found ({totalCount} total)
				</div>
			{/if}
		</div>
	{/if}
</div>
