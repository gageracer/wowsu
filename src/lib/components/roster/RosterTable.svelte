<script lang="ts">
	import {
		WOW_SPECS,
		getRoleForSpec,
		getSpecIcon,
		getClassIcon,
		getClassColor
	} from '$lib/wow-specs';
	import type { RosterMember } from '$lib/types/roster';
	import type { RosterFilter } from '$lib/types/filters';
	import { filterContext, rosterContext } from './context/roster';
	import { SvelteMap } from 'svelte/reactivity';
	import RosterFilters from './RosterFilters.svelte';
	import ColumnManager from './ColumnManager.svelte';
	import MergePanel from './MergePanel.svelte';
	import MergePreview from './MergePreview.svelte';
	import JsonExport from './JsonExport.svelte';
	import SpecSelector from './SpecSelector.svelte';
	import RoleDisplay from './RoleDisplay.svelte';
	import { dev } from '$app/environment';
	import { PersistedState, useDebounce } from 'runed';

	// Get roster state from context - ONLY for roster data
	const rosterState = rosterContext.get();

	// Debounce typing state for auto-save
	const setTypingStopped = useDebounce(() => {
		rosterState.setIsTyping(false);
	}, 1000);

	// Column configuration with PersistedState
	interface ColumnConfig {
		key: keyof RosterMember | 'daysOffline';
		label: string;
		visible: boolean;
		alwaysVisible?: boolean;
		sortable: boolean;
	}

	const defaultColumns: ColumnConfig[] = [
		{ key: 'name', label: 'Name', visible: true, alwaysVisible: true, sortable: true },
		{ key: 'level', label: 'Level', visible: true, sortable: true },
		{ key: 'class', label: 'Class', visible: true, sortable: true },
		{ key: 'mainSpec', label: 'Main Spec', visible: true, sortable: true },
		{ key: 'mainRole', label: 'Main Role', visible: true, sortable: true },
		{ key: 'rankName', label: 'Rank', visible: true, sortable: true },
		{ key: 'note', label: 'Note', visible: true, sortable: true },
		{ key: 'lastOnline', label: 'Last Online', visible: true, sortable: true },
		{ key: 'zone', label: 'Zone', visible: false, sortable: true },
		{ key: 'achievementPoints', label: 'Achievement Points', visible: false, sortable: true },
		{ key: 'daysOffline', label: 'Days Offline', visible: false, sortable: true },
		{ key: 'realmName', label: 'Realm', visible: false, sortable: true },
		{ key: 'rioMythicPlusScore', label: 'M+ Score', visible: false, sortable: true },
		{ key: 'rioRaidProgress', label: 'Raid Progress', visible: false, sortable: true },
		{ key: 'rioLastCrawled', label: 'RIO Last Crawled', visible: false, sortable: true }
	];

	const columns = new PersistedState('roster-columns', defaultColumns, {
		syncTabs: true
	});


	const persistedFilters = new PersistedState('roster-filters', {
     	filters: [] as RosterFilter[],
     	matchAll: true,
     	filtersEnabled: false
	}, {
		syncTabs: true
	});

    let filters = $state(persistedFilters.current.filters);
    let matchAll = $state(persistedFilters.current.matchAll);
    let filtersEnabled = $state(persistedFilters.current.filtersEnabled)

    $effect(() => {
        persistedFilters.current = {
            filters: filters,
            matchAll: matchAll,
            filtersEnabled: filtersEnabled
        };
    });

	let showColumnManager = $state(false);
	const visibleColumns = $derived(columns.current.filter(col => col.visible));

	// State for filters applied
	let filtersApplied = $derived(persistedFilters.current.filtersEnabled && persistedFilters.current.filters.length > 0);

	// Local state for sorting (keep local since it's UI-only)
	let sortKey = $state<keyof RosterMember | 'daysOffline'>('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// Helper functions
	function getDaysAgo(timestamp: number): number {
		if (timestamp === 0) return 0;
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	// Filter matching logic (local, not in state)
	function matchFilter(member: RosterMember, filter: RosterFilter): boolean {
		const { field, operator, value } = filter;

		if (operator === 'is_empty' || operator === 'is_not_empty') {
			let fieldValue: unknown;
			switch (field) {
				case 'mainSpec':
					fieldValue = member.mainSpec;
					break;
				case 'mainRole':
					fieldValue = member.mainRole;
					break;
				case 'zone':
					fieldValue = member.zone;
					break;
				case 'note':
					fieldValue = member.note;
					break;
				default:
					fieldValue = member[field as keyof RosterMember];
			}

			const isEmpty = !fieldValue || fieldValue === '';
			return operator === 'is_empty' ? isEmpty : !isEmpty;
		}

		if (!value) return true;

		const numericFields = ['level', 'achievementPoints', 'rioMythicPlusScore', 'daysOffline'];
		const isNumericField = numericFields.includes(field);

		let memberValue: string | number;
		if (field === 'lastOnline') {
			// For lastOnline field, we can compare as days ago
			memberValue = getDaysAgo(member.lastOnline);
		} else {
			const val = member[field as keyof RosterMember];
			if (isNumericField) {
				memberValue = Number(val);
			} else {
				memberValue = String(val || '').toLowerCase();
			}
		}

		let compareValue: string | number;
		if (isNumericField) {
			compareValue = Number(value);
		} else {
			compareValue = String(value).toLowerCase();
		}

		switch (operator) {
			case '=':
				return memberValue === compareValue;
			case '!=':
				return memberValue !== compareValue;
			case '>':
				return Number(memberValue) > Number(compareValue);
			case '<':
				return Number(memberValue) < Number(compareValue);
			case '>=':
				return Number(memberValue) >= Number(compareValue);
			case '<=':
				return Number(memberValue) <= Number(compareValue);
			case 'contains':
				return String(memberValue).includes(String(compareValue));
			case 'not_contains':
				return !String(memberValue).includes(String(compareValue));
			default:
				return true;
		}
	}

	// Computed filtered roster (local filtering)
	const filteredRoster = $derived.by(() => {
		if (!filtersApplied || persistedFilters.current.filters.length === 0) {
			return rosterState.roster;
		}

		return rosterState.roster.filter((member) => {
			if (persistedFilters.current.matchAll) {
				return persistedFilters.current.filters.every((filter) => matchFilter(member, filter));
			} else {
				return persistedFilters.current.filters.some((filter) => matchFilter(member, filter));
			}
		});
	});

	// Computed sorted roster (local sorting)
	const sortedRoster = $derived.by(() => {
		const toSort = filteredRoster.slice();

		return toSort.sort((a, b) => {
			let aVal: string | number | undefined;
			let bVal: string | number | undefined;

			if (sortKey === 'daysOffline') {
				aVal = getDaysAgo(a.lastOnline);
				bVal = getDaysAgo(b.lastOnline);
			} else {
				aVal = a[sortKey as keyof RosterMember];
				bVal = b[sortKey as keyof RosterMember];
			}

			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal === undefined || bVal === undefined) return 0;
			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	// Class metadata cache for icons and colors
	interface ClassMetadata {
		color: string;
		icon: string;
		specIcons: Map<string, string>;
	}

	const classMetadataCache = $derived.by(() => {
		const cache = new SvelteMap<string, ClassMetadata>();
		const allClasses = new Set(rosterState.roster.map((m) => m.classFileName));

		for (const className of allClasses) {
			const specIcons = new SvelteMap<string, string>();
			const specs = WOW_SPECS[className] || [];

			for (const spec of specs) {
				const icon = getSpecIcon(className, spec.name);
				if (icon) {
					specIcons.set(spec.name, icon);
				}
			}

			cache.set(className, {
				color: getClassColor(className),
				icon: getClassIcon(className),
				specIcons
			});
		}

		return cache;
	});

	// Local functions
	function toggleSort(key: keyof RosterMember | 'daysOffline') {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function toggleFilters() {
		filtersEnabled = !filtersEnabled;
	}

	function resetColumns() {
		columns.current = defaultColumns.map(col => ({ ...col }));
	}

	// Event handlers
	function onSpecChange(member: RosterMember, spec: string) {
		const role = getRoleForSpec(member.classFileName, spec);
		if (role && spec) {
			rosterState.updateMemberSpec(member, spec, role);
		}
	}

	function onNoteChange(member: RosterMember, note: string) {
		rosterState.setIsTyping(true);
		rosterState.updateMemberNote(member, note);
		setTypingStopped();
	}

	function copyToClipboard() {
		const rosterData = rosterState.getExportData();
		const jsonText = JSON.stringify(rosterData, null, 2);
		navigator.clipboard.writeText(jsonText).then(() => {
			alert('JSON copied to clipboard!');
		});
	}

	function downloadJson() {
		const rosterData = rosterState.getExportData();
		const jsonText = JSON.stringify(rosterData, null, 2);
		const blob = new Blob([jsonText], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'roster-updated.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	// Placeholder for applyRaiderIOData - passed from parent
	let { applyRaiderIOData = (() => {}) }: { applyRaiderIOData?: () => void } = $props();
</script>

{#if dev}
	<div class="mb-4 flex flex-wrap gap-2">
		<button
			onclick={() => rosterState.toggleJsonExport()}
			class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
		>
			{rosterState.showJsonExport ? 'Hide' : 'Show'} JSON Export
		</button>
		<button
			onclick={() => rosterState.toggleMergePanel()}
			class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
		>
			{rosterState.showMergePanel ? 'Hide' : 'Show'} Merge Panel
		</button>
		<button
			onclick={applyRaiderIOData}
			class="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
		>
			Apply Raider.IO Data
		</button>
	</div>
	{#if rosterState.mergePreview}
		<MergePreview
			preview={rosterState.mergePreview}
			onApply={() => rosterState.applyMerge()}
			onCancel={() => rosterState.cancelMerge()}
		/>
	{/if}
	{#if rosterState.showJsonExport}
		<JsonExport
			roster={rosterState.roster}
			onCopy={copyToClipboard}
			onDownload={downloadJson}
			onClose={() => rosterState.toggleJsonExport()}
		/>
	{/if}
	{#if rosterState.showMergePanel}
		<MergePanel
			bind:newRosterJson={rosterState.newRosterJson}
			mergeError={rosterState.mergeError}
			onPreview={() => rosterState.mergeRosters()}
			onCancel={() => rosterState.toggleMergePanel()}
		/>
	{/if}
{/if}

<RosterFilters
    bind:filters={filters}
    bind:matchAll={matchAll}
    bind:filtersEnabled={filtersEnabled}
	bind:applied={filtersApplied}
	{toggleFilters}
	totalCount={rosterState.roster.length}
	filteredCount={filteredRoster.length}
/>

{#if showColumnManager}
	<ColumnManager bind:columns={columns.current} onReset={resetColumns} />
{/if}

{#if columns.current.length === 0}
	<div class="flex items-center justify-center py-12">
		<div class="text-gray-400">No columns visible. Click ⚙️ to manage columns.</div>
	</div>
{:else}
	<div class="w-full overflow-x-auto rounded-lg border border-gray-700 bg-gray-800/50">
		<table class="w-full min-w-max text-left text-sm">
			<thead class="border-b border-gray-700 bg-gray-800 text-xs uppercase text-gray-300">
				<tr>
					{#each visibleColumns as column, index (column.key)}
						<th class="whitespace-nowrap px-4 py-3">
							<div class="flex items-center justify-between">
								{#if column.sortable}
									<button
										onclick={() => toggleSort(column.key)}
										class="flex items-center gap-1 hover:text-white"
									>
										{column.label}
										{#if sortKey === column.key}
											<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
										{/if}
									</button>
								{:else}
									{column.label}
								{/if}
								{#if index === visibleColumns.length - 1}
									<button
										onclick={() => (showColumnManager = !showColumnManager)}
										class="rounded px-1 text-sm font-semibold text-white hover:opacity-75"
									>
										⚙️
									</button>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sortedRoster as member (`${member.name}-${member.realmName}`)}
					{@const specs = WOW_SPECS[member.classFileName] || []}
					{@const metadata = classMetadataCache.get(member.classFileName)}
					{@const classColor = metadata?.color || '#999'}
					{@const classIcon = metadata?.icon || ''}
					{@const specIcon = metadata?.specIcons.get(member.mainSpec || '') || ''}
					<tr class="border-b border-gray-700 hover:bg-gray-700/30">
						{#each visibleColumns as column (column.key)}
							<td class="whitespace-nowrap px-4 py-3">
								{#if column.key === 'name'}
									{#if member.rioProfileUrl}
										<a
											href={member.rioProfileUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="font-medium hover:underline"
											style="color: {classColor}"
										>
											{member.name}
										</a>
									{:else}
										<span class="font-medium" style="color: {classColor}">
											{member.name}
										</span>
									{/if}
								{:else if column.key === 'level'}
									<span class="text-gray-300">{member.level}</span>
								{:else if column.key === 'class'}
									<div class="flex items-center gap-2">
										{#if classIcon}
											<img src={classIcon} alt={member.class} class="h-5 w-5" />
										{/if}
										<span style="color: {classColor}">{member.class}</span>
									</div>
								{:else if column.key === 'mainSpec'}
									{#if dev}
										<SpecSelector
											bind:value={member.mainSpec}
											{specs}
											classFileName={member.classFileName}
											onChange={(spec) => onSpecChange(member, spec)}
										/>
									{:else if member.mainSpec}
										<div class="flex items-center gap-2">
											{#if specIcon}
												<img src={specIcon} alt={member.mainSpec} class="h-5 w-5 rounded" />
											{/if}
											<span class="text-gray-300">{member.mainSpec}</span>
										</div>
									{:else}
										<span class="text-gray-500">—</span>
									{/if}
								{:else if column.key === 'mainRole'}
									<RoleDisplay role={member.mainRole} />
								{:else if column.key === 'rankName'}
									<span class="text-gray-300">{member.rankName}</span>
								{:else if column.key === 'note'}
									{#if dev}
										<input
											type="text"
											value={member.note || ''}
											oninput={(e) => onNoteChange(member, e.currentTarget.value)}
											class="w-full bg-gray-700 px-2 py-1 text-xs text-gray-300"
										/>
									{:else}
										<span class="text-xs text-gray-400" title={member.note}>{member.note || '-'}</span>
									{/if}
								{:else if column.key === 'lastOnline'}
									<span class="text-xs text-gray-400">{member.lastOnline === 0 ? 'Online' : rosterState.formatLastOnline(member.lastOnline)}</span>
								{:else if column.key === 'zone'}
									<span class="text-xs text-gray-400">{member.zone || '-'}</span>
								{:else if column.key === 'achievementPoints'}
									<span class="text-xs text-gray-300">{member.achievementPoints.toLocaleString()}</span>
								{:else if column.key === 'daysOffline'}
									{@const days = getDaysAgo(member.lastOnline)}
									<span
										class="text-xs {days === 0
											? 'text-green-400'
											: days < 7
												? 'text-blue-400'
												: days < 30
													? 'text-yellow-400'
													: 'text-red-400'}"
									>
										{days === 0 ? 'Online' : `${days} days`}
									</span>
								{:else if column.key === 'realmName'}
									<span class="text-xs text-gray-400">{member.realmName}</span>
								{:else if column.key === 'rioMythicPlusScore'}
									{#if member.rioMythicPlusScore}
										<span class="text-xs font-semibold text-purple-400">
											{member.rioMythicPlusScore.toFixed(0)}
										</span>
									{:else}
										<span class="text-xs text-gray-500">-</span>
									{/if}
								{:else if column.key === 'rioRaidProgress'}
									<span class="text-xs text-gray-300">{member.rioRaidProgress || '-'}</span>
								{:else if column.key === 'rioLastCrawled'}
									{#if member.rioLastCrawled}
										<span class="text-xs text-gray-400" title={member.rioLastCrawled}>
											{rosterState.formatLastOnline(new Date(member.rioLastCrawled).getTime() / 1000)}
										</span>
									{:else}
										<span class="text-xs text-gray-500">-</span>
									{/if}
								{:else}
									<span class="text-xs text-gray-400">{member[column.key as keyof RosterMember] || '-'}</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
