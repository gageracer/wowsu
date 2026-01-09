<script lang="ts">
	import {
		WOW_SPECS,
		getRoleForSpec,
		getSpecIcon,
		getClassIcon,
		getClassColor
	} from '$lib/wow-specs';
	import type { RosterMember } from '$lib/types/roster';
	import type { Role } from '$lib/wow-specs';
	import type { RosterFilter } from '$lib/types/filters';
	import RosterFilters from './RosterFilters.svelte';
	import ColumnManager from './ColumnManager.svelte';
	import MergePanel from './MergePanel.svelte';
	import MergePreview from './MergePreview.svelte';
	import JsonExport from './JsonExport.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import SpecSelector from './SpecSelector.svelte';
	import RoleDisplay from './RoleDisplay.svelte';

	let {
		roster = $bindable([]),
		lastUpdated = $bindable(0),
		isTyping = $bindable(false),
		applyRaiderIOData = (() => {})
	}: {
		roster: RosterMember[];
		lastUpdated: number;
		isTyping: boolean;
		applyRaiderIOData: () => void;
	} = $props();

	let typingTimer: ReturnType<typeof setTimeout> | null = null;
		const TYPING_TIMEOUT = 1000; // Consider user stopped typing after 1 second

	// Column configuration
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
		// Raider.IO columns
		{ key: 'rioMythicPlusScore', label: 'M+ Score', visible: false, sortable: true },
		{ key: 'rioRaidProgress', label: 'Raid Progress', visible: false, sortable: true },
		{ key: 'rioLastCrawled', label: 'RIO Last Crawled', visible: false, sortable: true }
	];




	// Loading state to prevent flash
	let columnsLoaded = $state(false);
	let filtersLoaded = $state(false);

	// Load column config from localStorage or use defaults
	function loadColumnConfig(): ColumnConfig[] {
		if (typeof window === 'undefined') return defaultColumns;

		try {
			const saved = localStorage.getItem('roster-columns');
			if (saved) {
				const savedConfig = JSON.parse(saved);
				// Merge saved config with defaults (to handle new columns being added)
				return defaultColumns.map(col => {
					const savedCol = savedConfig.find((c: ColumnConfig) => c.key === col.key);
					return savedCol ? { ...col, visible: savedCol.visible } : col;
				});
			}
		} catch (e) {
			console.error('Failed to load column config:', e);
		}
		return defaultColumns;
	}


	function saveColumnConfig(config: ColumnConfig[]) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem('roster-columns', JSON.stringify(config));
		} catch (e) {
			console.error('Failed to save column config:', e);
		}
	}

	// Load filters from localStorage
	function loadFilters(): { filters: RosterFilter[]; matchAll: boolean; filtersEnabled: boolean } {
		if (typeof window === 'undefined') return { filters: [], matchAll: true, filtersEnabled: false };

		try {
			const saved = localStorage.getItem('roster-filters');
			if (saved) {
				const parsed = JSON.parse(saved);
				return {
					filters: parsed.filters || [],
					matchAll: parsed.matchAll ?? true,
					filtersEnabled: parsed.filtersEnabled ?? false
				};
			}
		} catch (e) {
			console.error('Failed to load filters:', e);
		}
		return { filters: [], matchAll: true, filtersEnabled: false };
	}

	function saveFilters(filters: RosterFilter[], matchAll: boolean, filtersEnabled: boolean) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem('roster-filters', JSON.stringify({ filters, matchAll, filtersEnabled }));
		} catch (e) {
			console.error('Failed to save filters:', e);
		}
	}

	let columns = $state<ColumnConfig[]>([]);
	let showColumnManager = $state(false);
	const visibleColumns = $derived(columns.filter(col => col.visible));

	// Filter state
	let filters = $state<RosterFilter[]>([]);
	let matchAll = $state(true);
	let filtersApplied = $state(false);
	let filtersEnabled = $state(false);

	// Load from localStorage on mount
	onMount(() => {
		columns = loadColumnConfig();
		columnsLoaded = true;

		const savedFilters = loadFilters();
		filters = savedFilters.filters;
		matchAll = savedFilters.matchAll;
		filtersEnabled = savedFilters.filtersEnabled;
		filtersApplied = savedFilters.filtersEnabled && savedFilters.filters.length > 0;
		filtersLoaded = true;
	});

	// Save columns whenever they change
	$effect(() => {
		if (columnsLoaded) {
			saveColumnConfig(columns);
		}
	});

	// Save filters whenever they change
	$effect(() => {
		if (filtersLoaded) {
			saveFilters(filters, matchAll, filtersEnabled);
		}
	});

	// Update filtersApplied when filtersEnabled changes
	$effect(() => {
		if (filtersLoaded) {
			filtersApplied = filtersEnabled && filters.length > 0;
		}
	});

	// Existing state
	let sortKey = $state<keyof RosterMember | 'daysOffline'>('name');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let showJsonExport = $state(false);
	let showMergePanel = $state(false);
	let newRosterJson = $state('');
	let mergeError = $state<string | null>(null);
	let mergePreview = $state<{
		merged: RosterMember[];
		rolesPreserved: number;
		newPlayers: number;
		changes: Array<{ name: string; classFileName: string; message: string }>;
		lastUpdated: number;
	} | null>(null);

	// Helper functions
	function formatLastOnline(timestamp: number): string {
		if (timestamp === 0) return 'Online';
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
		return `${Math.floor(diffDays / 365)} years ago`;
	}

	function getDaysAgo(timestamp: number): number {
		if (timestamp === 0) return 0;
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	// Filter function
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

		const numericFields = ['level', 'achievementPoints', 'lastOnline'];
		const isNumericField = numericFields.includes(field);

		let memberValue: string | number;
		switch (field) {
			case 'name':
				memberValue = member.name.toLowerCase();
				break;
			case 'class':
				memberValue = member.classFileName;
				break;
			case 'level':
				memberValue = member.level;
				break;
			case 'rankName':
				memberValue = member.rankName.toLowerCase();
				break;
			case 'mainSpec':
				memberValue = (member.mainSpec || '').toLowerCase();
				break;
			case 'mainRole':
				memberValue = member.mainRole || '';
				break;
			case 'zone':
				memberValue = (member.zone || '').toLowerCase();
				break;
			case 'note':
				memberValue = (member.note || '').toLowerCase();
				break;
			case 'achievementPoints':
				memberValue = member.achievementPoints;
				break;
			case 'lastOnline':
				memberValue = getDaysAgo(member.lastOnline);
				break;
			default:
				memberValue = '';
		}

		let compareValue: string | number;
		if (isNumericField) {
			compareValue = value;
		} else if (field === 'class' || field === 'mainRole') {
			compareValue = value;
		} else {
			compareValue = String(value).toLowerCase();
		}

		switch (operator) {
			case '=':
				if (isNumericField) {
					return Number(memberValue) === Number(compareValue);
				}
				return String(memberValue) === String(compareValue);
			case '!=':
				if (isNumericField) {
					return Number(memberValue) !== Number(compareValue);
				}
				return String(memberValue) !== String(compareValue);
			case '>':
				return Number(memberValue) > Number(compareValue);
			case '<':
				return Number(memberValue) < Number(compareValue);
			case '>=':
				return Number(memberValue) >= Number(compareValue);
			case '<=':
				return Number(memberValue) <= Number(compareValue);
			case 'contains':
				return String(memberValue).includes(String(compareValue).toLowerCase());
			case 'not_contains':
				return !String(memberValue).includes(String(compareValue).toLowerCase());
			default:
				return true;
		}
	}

	const filteredRoster = $derived.by(() => {
		if (!filtersApplied || filters.length === 0) {
			return roster;
		}

		return roster.filter((member) => {
			if (matchAll) {
				return filters.every((filter) => matchFilter(member, filter));
			} else {
				return filters.some((filter) => matchFilter(member, filter));
			}
		});
	});

	const sortedRoster = $derived(
		[...filteredRoster].sort((a, b) => {
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
		})
	);

	function toggleSort(key: keyof RosterMember | 'daysOffline') {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function onSpecChange(member: RosterMember, spec: string) {
		const role = getRoleForSpec(member.classFileName, spec);
		if (role && spec) {
			member.mainSpec = spec;
			member.mainRole = role;
		}
	}

	function onNoteChange() {
	  isTyping = true
   	if (typingTimer) {
    		clearTimeout(typingTimer);
   	}

	// Set a new timer to detect when user stops typing
	typingTimer = setTimeout(() => {
			isTyping = false;
	}, TYPING_TIMEOUT);
	}

	function copyToClipboard() {
		const rosterData = {
			version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
			lastUpdated: Math.floor(Date.now() / 1000),
			members: roster
		};
		const jsonText = JSON.stringify(rosterData, null, 2);
		navigator.clipboard.writeText(jsonText).then(() => {
			alert('JSON copied to clipboard!');
		});
	}

	function downloadJson() {
		const rosterData = {
			version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
			lastUpdated: Math.floor(Date.now() / 1000),
			members: roster
		};
		const jsonText = JSON.stringify(rosterData, null, 2);
		const blob = new Blob([jsonText], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'roster-updated.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	function mergeRosters(newLastUpdated?: number) {
		mergeError = null;
		try {
			const newRoster: RosterMember[] = JSON.parse(newRosterJson);

			if (!Array.isArray(newRoster)) {
				mergeError = 'Invalid JSON: Expected an array of roster members';
				return;
			}

			const existingRoles = new SvelteMap<string, { spec: string; role: Role }>();
			roster.forEach((member) => {
				if (member.mainSpec && member.mainRole) {
					existingRoles.set(member.name, {
						spec: member.mainSpec,
						role: member.mainRole
					});
				}
			});

			const existingNames = new Set(roster.map((m) => m.name));
			const changes: Array<{ name: string; classFileName: string; message: string }> = [];
			let rolesPreserved = 0;
			let newPlayers = 0;

			const merged = newRoster.map((newMember) => {
				const existingRole = existingRoles.get(newMember.name);

				if (existingRole) {
					rolesPreserved++;
					changes.push({
						name: newMember.name,
						classFileName: newMember.classFileName,
						message: `Kept role: ${existingRole.spec} (${existingRole.role})`
					});
					return {
						...newMember,
						mainSpec: existingRole.spec,
						mainRole: existingRole.role
					};
				}

				if (!existingNames.has(newMember.name)) {
					newPlayers++;
					changes.push({
						name: newMember.name,
						classFileName: newMember.classFileName,
						message: 'New player (no role assigned)'
					});
				}

				return newMember;
			});

			const updateTimestamp = newLastUpdated || Math.floor(Date.now() / 1000);

			mergePreview = {
				merged,
				rolesPreserved,
				newPlayers,
				changes,
				lastUpdated: updateTimestamp
			};
		} catch (error) {
			mergeError = `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	function applyMerge() {
		if (mergePreview) {
			roster = mergePreview.merged;
			lastUpdated = mergePreview.lastUpdated;
			mergePreview = null;
			newRosterJson = '';
			showMergePanel = false;
			alert('Roster merged successfully! Click "Export Updated JSON" to save.');
		}
	}

	function resetColumns() {
		columns = defaultColumns.map(col => ({ ...col }));
	}

	function getCellValue(member: RosterMember, key: keyof RosterMember | 'daysOffline'): unknown {
		if (key === 'daysOffline') {
			return getDaysAgo(member.lastOnline);
		}
		return member[key as keyof RosterMember];
	}

	function toggleFilters() {
		filtersEnabled = !filtersEnabled;
	}
</script>

<!-- Dev Only-->
{#if dev}
    <div class="mb-4 flex flex-wrap gap-2">
    	<!-- Dev-only features -->
      		<button
     			onclick={() => (showJsonExport = !showJsonExport)}
     			class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      		>
     			{showJsonExport ? 'Hide' : 'Export Updated JSON'}
      		</button>
      		<button
     			onclick={() => (showMergePanel = !showMergePanel)}
     			class="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
      		>
     			{showMergePanel ? 'Hide' : 'Merge From JSON'}
      		</button>
            <button
     			onclick={() => (applyRaiderIOData())}
     			class="rounded bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
      		>
     			Fetch & Merge Raider.IO Guild Data
      		</button>
    </div>
    {#if mergePreview}
    	<MergePreview
    		preview={mergePreview}
    		onApply={applyMerge}
    		onCancel={() => (mergePreview = null)}
    	/>
    {/if}
    {#if showJsonExport}
    	<JsonExport
    		{roster}
    		onCopy={copyToClipboard}
    		onDownload={downloadJson}
    		onClose={() => (showJsonExport = false)}
    	/>
    {/if}
    {#if showMergePanel}
    	<MergePanel
    		bind:newRosterJson={newRosterJson}
    		{mergeError}
    		onPreview={() => mergeRosters()}
    		onCancel={() => {
    			showMergePanel = false;
    			newRosterJson = '';
    			mergeError = null;
    		}}
    	/>
    {/if}
{/if}

<RosterFilters
	bind:filters={filters}
	bind:matchAll={matchAll}
	bind:applied={filtersApplied}
	{toggleFilters}
	{filtersEnabled}
	totalCount={roster.length}
	filteredCount={filteredRoster.length}
/>

{#if showColumnManager}
	<ColumnManager bind:columns={columns} onReset={resetColumns} />
{/if}

<!-- Loading state or table -->
{#if !columnsLoaded}
	<div class="flex items-center justify-center py-12">
		<div class="text-gray-400">Loading roster...</div>
	</div>
{:else}
	<!-- ROSTER TABLE -->
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
        								class="rounded  px-1  text-sm font-semibold text-white hover:opacity-75"
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
				{#each sortedRoster as member (member.name)}
					{@const specs = WOW_SPECS[member.classFileName] || []}
					{@const classColor = getClassColor(member.classFileName)}
					{@const classIcon = getClassIcon(member.classFileName)}
					{@const specIcon = getSpecIcon(member.classFileName, member.mainSpec || '')}
					<tr class="border-b border-gray-700 hover:bg-gray-700/30">
						{#each visibleColumns as column (column.key)}
							<td class="whitespace-nowrap px-4 py-3">
							{#if column.key === 'name'}
								{#if member.rioProfileUrl}
									<a
										data-sveltekit-reload
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
										onChange={(spec: string) => onSpecChange(member, spec)}
									/>
									{:else if member.mainSpec}
										<div class="flex items-center gap-2">
											{#if specIcon}
												<img src={specIcon} alt={member.mainSpec} class="h-5 w-5 rounded" />
											{/if}
											<span class="text-gray-300">{member.mainSpec}</span>
										</div>
									{:else}
										<span class="text-gray-500">Not set</span>
									{/if}
								{:else if column.key === 'mainRole'}
								    <RoleDisplay role={member.mainRole} />
								{:else if column.key === 'rankName'}
									<span class="text-gray-300">{member.rankName}</span>
								{:else if column.key === 'note'}
									{#if dev}
										<input
											type="text"
											bind:value={member.note}
											oninput={() => onNoteChange()}
											placeholder="Add note..."
											class="min-w-32 w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
										/>
									{:else}
										<span class="text-xs text-gray-400" title={member.note}>{member.note || '-'}</span>
									{/if}
								{:else if column.key === 'lastOnline'}
									<span class="text-xs text-gray-400">{formatLastOnline(member.lastOnline)}</span>
								{:else if column.key === 'zone'}
									<span class="text-xs text-gray-400">{member.zone || '-'}</span>
								{:else if column.key === 'achievementPoints'}
									<span class="text-xs text-gray-300">{member.achievementPoints.toLocaleString()}</span>
								{:else if column.key === 'daysOffline'}
									{@const days = getDaysAgo(member.lastOnline)}
									<span class="text-xs {days === 0 ? 'text-green-400' : days < 7 ? 'text-blue-400' : days < 30 ? 'text-yellow-400' : 'text-red-400'}">
										{days === 0 ? 'Online' : `${days} days`}
									</span>
									{:else if column.key === 'realmName'}
										<span class="text-xs text-gray-400">{member.realmName}</span>

									{:else if column.key === 'rioMythicPlusScore'}
										{#if member.rioMythicPlusScore}
											<span class="text-xs font-semibold text-purple-400">{member.rioMythicPlusScore.toFixed(1)}</span>
										{:else}
											<span class="text-xs text-gray-500">-</span>
										{/if}
									{:else if column.key === 'rioRaidProgress'}
										<span class="text-xs text-gray-300">{member.rioRaidProgress || '-'}</span>
									{:else if column.key === 'rioLastCrawled'}
										{#if member.rioLastCrawled}
											<span class="text-xs text-gray-400" title={member.rioLastCrawled}>
												{new Date(member.rioLastCrawled).toLocaleDateString()}
											</span>
										{:else}
											<span class="text-xs text-gray-500">-</span>
										{/if}
									{:else}
										<span class="text-xs text-gray-400">{getCellValue(member, column.key) || '-'}</span>
									{/if}

							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
