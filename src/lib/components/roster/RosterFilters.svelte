<script lang="ts">
	import { WOW_SPECS } from '$lib/wow-specs';
	import type { Role } from '$lib/wow-specs';
	import type { FilterField, FilterOperator, RosterFilter } from '$lib/types/filters';

	let {
	    filters = $bindable([]),
	    matchAll = $bindable(false),
	    filtersEnabled = $bindable(false),
		applied = $bindable(false),
		toggleFilters = $bindable(() => {}),
		totalCount = 0,
		filteredCount = 0
	}: {
	    filters: RosterFilter[];
	    matchAll: boolean;
	    filtersEnabled: boolean;
		applied: boolean;
		toggleFilters: () => void;
		totalCount: number;
		filteredCount: number;
	} = $props();

	let showFilters = $state(false);

	let filterIdCounter = $derived.by(() => {
		if (filters.length === 0) return 0;
		const maxId = Math.max(...filters.map(f => f.id));
		return maxId + 1;
	});

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
			id: filterIdCounter,
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
			return OPERATORS.filter((op) => ['contains','not_contains','=', '!=', 'is_empty', 'is_not_empty'].includes(op.value));
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
</script>

{#snippet toggleFilter()}
    <!-- Filter Enable/Disable Toggle -->
    {#if filters.length > 0}
	<div class="flex items-center gap-2">
		<button
			onclick={toggleFilters}
			class="rounded px-2 py-1 text-sm font-semibold text-white transition-colors {filtersEnabled
				? 'bg-green-600 hover:bg-green-700'
				: 'bg-gray-600 hover:bg-gray-700'}"
		>
			{filtersEnabled ? '✓ Filters Enabled' : 'Filters Disabled'}
		</button>
		<span class="text-xs text-gray-400">
			{filters.length} {filters.length === 1 ? 'filter' : 'filters'} configured
		</span>
	</div>
    {/if}
{/snippet}

{#snippet result()}
    <!-- Results Count -->
	{#if applied && filters.length > 0}
		<div class="text-xs sm:text-sm text-gray-400">
			{filteredCount} {filteredCount === 1 ? 'member' : 'members'} found ({totalCount} total)
		</div>
	{/if}
{/snippet}

<div class="mb-4 rounded-lg border border-gray-700 bg-gray-900 p-3 sm:p-2">
	<div class={`flex items-center justify-between${showFilters ? " mb-3":""}`}>
		{@render toggleFilter?.()}
		{@render result()}
		<button
			onclick={() => (showFilters = !showFilters)}
			class="text-xs sm:text-sm text-blue-400 hover:text-blue-300"
		>
			{showFilters ? 'Hide' : 'Show'} Filters
		</button>
	</div>

	{#if showFilters}
		<div class="space-y-3">
		{#key filters.length}
			{#each filters as filter, i (`${i}-${filter.id}`)}
				<!-- Mobile: Stack vertically, Desktop: Flex row -->
				<div class="flex flex-col sm:flex-row gap-2 sm:items-start">
					<!-- Top row on mobile: Field and Operator -->
					<div class="flex gap-2 sm:contents">
						<!-- Field Selector -->
						<select
							bind:value={filter.field}
							onchange={() => {
								// Reset value when field changes and set defaults
								filter.value = getDefaultValue(filter.field);
							}}
							class="flex-1 sm:flex-initial rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
						>
							{#each FILTER_FIELDS as field, index(index)}
								<option value={field.value}>{field.label}</option>
							{/each}
						</select>

						<!-- Operator Selector -->
						<select
							bind:value={filter.operator}
							class="flex-1 sm:flex-initial rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
						>
							{#each getAvailableOperators(filter.field) as op, index(index)}
								<option value={op.value}>{op.label}</option>
							{/each}
						</select>
					</div>

					<!-- Bottom row on mobile: Value input and Remove button -->
					<div class="flex gap-2 sm:flex-1">
						<!-- Value Input/Selector (only show if operator needs a value) -->
						{#if needsValueInput(filter.operator)}
							{#if filter.field === 'class'}
								<select
									bind:value={filter.value}
									class="flex-1 rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
								>
									<option value="">Select Class...</option>
									{#each WOW_CLASSES as cls, index(index)}
										<option value={cls.value}>{cls.label}</option>
									{/each}
								</select>
							{:else if filter.field === 'mainRole'}
								<select
									bind:value={filter.value}
									class="flex-1 rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
								>
									<option value="">Select Role...</option>
									{#each WOW_ROLES as role (role)}
										<option value={role}>{role}</option>
									{/each}
								</select>
							{:else if filter.field === 'mainSpec'}
								<input
									type="text"
									bind:value={filter.value}
									placeholder="Enter spec name..."
									class="flex-1 rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
								/>
							{:else if filter.field === 'level' || filter.field === 'achievementPoints' || filter.field === 'lastOnline'}
								<input
									type="number"
									bind:value={filter.value}
									placeholder={filter.field === 'lastOnline' ? 'Days ago' : filter.field === 'level' ? '80' : 'Enter number...'}
									class="flex-1 rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
								/>
							{:else}
								<input
									type="text"
									bind:value={filter.value}
									placeholder="Enter value..."
									class="flex-1 rounded border border-gray-600 bg-gray-800 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
								/>
							{/if}
						{:else}
							<!-- Placeholder for empty/not empty operators -->
							<div class="flex-1 rounded border border-dashed border-gray-600 bg-gray-800/50 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-500 italic">
								No value needed
							</div>
						{/if}

						<!-- Remove Button -->
						<button
							onclick={() => removeFilter(filter.id)}
							class="rounded bg-red-600 px-3 py-2 text-xs sm:text-sm text-white hover:bg-red-700 whitespace-nowrap"
						>
							remove
						</button>
					</div>
				</div>
			{/each}
		{/key}
			<!-- Add Filter Button -->
			<div>
				<button
					onclick={addFilter}
					class="w-full sm:w-auto rounded border border-dashed border-gray-600 bg-gray-800 px-4 py-2 text-xs sm:text-sm text-gray-300 hover:border-gray-500 hover:bg-gray-750 hover:text-gray-200"
				>
					+ Additional Filters...
				</button>
			</div>

			{#if filters.length > 1}
				<!-- Match Logic -->
				<div class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
					<span class="text-gray-400">Match:</span>
					<div class="flex flex-col sm:flex-row gap-2">
						<label class="flex items-center gap-1 text-gray-300">
							<input type="radio" bind:group={matchAll} value={true} class="text-blue-500" />
							All additional filters
						</label>
						<label class="flex items-center gap-1 text-gray-300">
							<input type="radio" bind:group={matchAll} value={false} class="text-blue-500" />
							At least one
						</label>
					</div>
				</div>
			{/if}

			<!-- Apply/Clear Buttons -->
			<div class="flex flex-col sm:flex-row gap-2 pt-2">
				<button
					onclick={applyFilters}
					class="rounded bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700"
				>
					Apply Filter
				</button>
				{#if filters.length > 0 || applied}
					<button
						onclick={clearFilters}
						class="rounded bg-gray-600 px-4 py-2 text-xs sm:text-sm text-white hover:bg-gray-700"
					>
						Clear All
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
