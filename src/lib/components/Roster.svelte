<script lang="ts">
	import {
		WOW_SPECS,
		ROLE_COLORS,
		ROLE_ICONS,
		getRoleForSpec,
		getSpecIcon,
		getClassIcon,
		getClassColor
	} from '$lib/wow-specs';
	import type { RosterMember } from '$lib/types/roster';
	import type { Role } from '$lib/wow-specs';
	import type { RosterFilter } from '$lib/types/filters';
	import RosterFilters from './RosterFilters.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { dev } from '$app/environment';

	let {
		roster = $bindable([]),
		lastUpdated = $bindable(0)
	}: {
		roster: RosterMember[];
		lastUpdated: number;
	} = $props();

	// Filter state
	let filters = $state<RosterFilter[]>([]);
	let matchAll = $state(true);
	let filtersApplied = $state(false);

	// Existing state
	let sortKey = $state<keyof RosterMember>('name');
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

	function formatDate(timestamp: number): string {
		if (!timestamp) return 'Never';
		const date = new Date(timestamp * 1000);
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Filter function
	function matchFilter(member: RosterMember, filter: RosterFilter): boolean {
		const { field, operator, value } = filter;

		// Handle empty/not empty checks first (don't need value)
		if (operator === 'is_empty' || operator === 'is_not_empty') {
			let fieldValue: any;
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
					fieldValue = (member as any)[field];
			}

			const isEmpty = !fieldValue || fieldValue === '';
			return operator === 'is_empty' ? isEmpty : !isEmpty;
		}

		if (!value) return true;

		// Determine if this is a numeric field
		const numericFields = ['level', 'achievementPoints', 'lastOnline'];
		const isNumericField = numericFields.includes(field);

		let memberValue: any;
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
		}

		// Handle compareValue based on field type
		let compareValue: any;
		if (isNumericField) {
			compareValue = value; // Keep as-is for numeric comparisons
		} else if (field === 'class' || field === 'mainRole') {
			compareValue = value; // Keep as-is for exact matches
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
			let aVal = a[sortKey];
			let bVal = b[sortKey];

			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		})
	);

	function toggleSort(key: keyof RosterMember) {
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

	function onNoteChange(member: RosterMember, note: string) {
		member.note = note;
	}

	function exportJson() {
		showJsonExport = true;
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
</script>

{#if dev}
	<div class="mb-4 flex flex-wrap gap-2">
		<button
			onclick={exportJson}
			class="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
		>
			Export Updated JSON
		</button>
		<button
			onclick={() => (showMergePanel = !showMergePanel)}
			class="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
		>
			{showMergePanel ? 'Hide' : 'Merge New Roster'}
		</button>
	</div>

	{#if showMergePanel}
		<div class="mb-4 rounded-lg border border-orange-600 bg-gray-900 p-4">
			<h3 class="mb-2 text-lg font-semibold text-orange-400">Merge New Roster</h3>
			<p class="mb-3 text-sm text-gray-400">
				Paste your new roster JSON from the game. Existing role assignments will be preserved for
				matching players.
			</p>
			<textarea
				bind:value={newRosterJson}
				placeholder="Paste new roster JSON here..."
				class="mb-3 h-64 w-full rounded border border-gray-600 bg-gray-950 p-3 font-mono text-xs text-gray-300 focus:border-orange-500 focus:outline-none"
			></textarea>
			<div class="flex gap-2">
				<button
					onclick={() => mergeRosters()}
					disabled={!newRosterJson.trim()}
					class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Merge & Preview
				</button>
				<button
					onclick={() => {
						newRosterJson = '';
						mergePreview = null;
					}}
					class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
				>
					Clear
				</button>
			</div>
			{#if mergeError}
				<div class="mt-3 rounded bg-red-900/50 p-3 text-sm text-red-300">
					{mergeError}
				</div>
			{/if}
		</div>
	{/if}
{/if}

{#if mergePreview}
	<div class="mb-4 rounded-lg border border-green-600 bg-gray-900 p-4">
		<h3 class="mb-2 text-lg font-semibold text-green-400">Merge Preview</h3>
		<div class="mb-3 grid grid-cols-3 gap-4 text-sm">
			<div class="rounded bg-blue-900/30 p-3">
				<div class="font-semibold text-blue-400">Total Players</div>
				<div class="text-2xl text-gray-200">{mergePreview.merged.length}</div>
			</div>
			<div class="rounded bg-green-900/30 p-3">
				<div class="font-semibold text-green-400">Roles Preserved</div>
				<div class="text-2xl text-gray-200">{mergePreview.rolesPreserved}</div>
			</div>
			<div class="rounded bg-orange-900/30 p-3">
				<div class="font-semibold text-orange-400">New Players</div>
				<div class="text-2xl text-gray-200">{mergePreview.newPlayers}</div>
			</div>
		</div>
		<div class="mb-3 max-h-64 overflow-auto rounded bg-gray-950 p-3">
			<h4 class="mb-2 text-sm font-semibold text-gray-400">Changes:</h4>
			<ul class="space-y-1 text-xs text-gray-300">
				{#each mergePreview.changes as change (change.name)}
					<li class="flex items-center gap-2">
						<span class="text-gray-500">•</span>
						<span class="font-medium" style="color: {getClassColor(change.classFileName)}"
							>{change.name}</span
						>
						<span class="text-gray-500">→</span>
						<span class="text-gray-400">{change.message}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="flex gap-2">
			<button
				onclick={applyMerge}
				class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
			>
				Apply Merge
			</button>
			<button
				onclick={() => (mergePreview = null)}
				class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

{#if showJsonExport}
	<div class="mb-4 rounded-lg border border-gray-600 bg-gray-900 p-4">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-200">Updated Roster JSON</h3>
			<div class="flex gap-2">
				<button
					onclick={copyToClipboard}
					class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
				>
					Copy to Clipboard
				</button>
				<button
					onclick={downloadJson}
					class="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
				>
					Download
				</button>
				<button
					onclick={() => (showJsonExport = false)}
					class="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700"
				>
					Close
				</button>
			</div>
		</div>
		<pre class="max-h-96 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-300">{JSON.stringify(
				{
					version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
					lastUpdated: Math.floor(Date.now() / 1000),
					members: roster
				},
				null,
				2
			)}</pre>
	</div>
{/if}

<!-- FILTERS COMPONENT -->
<RosterFilters
	bind:filters
	bind:matchAll
	bind:applied={filtersApplied}
	totalCount={roster.length}
	filteredCount={filteredRoster.length}
/>

<!-- ROSTER TABLE -->
<div class="w-full overflow-x-auto rounded-lg border border-gray-700 bg-gray-800/50">
	<table class="w-full min-w-max text-left text-sm">
		<thead class="border-b border-gray-700 bg-gray-800 text-xs text-gray-300 uppercase">
			<tr>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('name')}
						class="flex items-center gap-1 hover:text-white"
					>
						Name
						{#if sortKey === 'name'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('level')}
						class="flex items-center gap-1 hover:text-white"
					>
						Level
						{#if sortKey === 'level'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('class')}
						class="flex items-center gap-1 hover:text-white"
					>
						Class
						{#if sortKey === 'class'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('mainSpec')}
						class="flex items-center gap-1 hover:text-white"
					>
						Main Spec
						{#if sortKey === 'mainSpec'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('mainRole')}
						class="flex items-center gap-1 hover:text-white"
					>
						Main Role
						{#if sortKey === 'mainRole'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('rankName')}
						class="flex items-center gap-1 hover:text-white"
					>
						Rank
						{#if sortKey === 'rankName'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('note')}
						class="flex items-center gap-1 hover:text-white"
					>
						Note
						{#if sortKey === 'note'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="px-4 py-3 whitespace-nowrap">
					<button
						onclick={() => toggleSort('lastOnline')}
						class="flex items-center gap-1 hover:text-white"
					>
						Last Online
						{#if sortKey === 'lastOnline'}
							<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each sortedRoster as member (member.name)}
				{@const specs = WOW_SPECS[member.classFileName] || []}
				{@const classColor = getClassColor(member.classFileName)}
				{@const classIcon = getClassIcon(member.classFileName)}
				{@const specIcon = getSpecIcon(member.classFileName, member.mainSpec || '')}
				<tr class="border-b border-gray-700 hover:bg-gray-700/30">
					<td class="px-4 py-3 font-medium whitespace-nowrap" style="color: {classColor}">
						{member.name}
					</td>
					<td class="px-4 py-3 text-gray-300 whitespace-nowrap">{member.level}</td>
					<td class="px-4 py-3 whitespace-nowrap">
						<div class="flex items-center gap-2">
							{#if classIcon}
								<img src={classIcon} alt={member.class} class="h-5 w-5" />
							{/if}
							<span style="color: {classColor}">{member.class}</span>
						</div>
					</td>
					<td class="px-4 py-3 whitespace-nowrap">
						{#if dev}
							<div class="flex items-center gap-2">
								{#if specIcon}
									<img src={specIcon} alt={member.mainSpec} class="h-5 w-5 rounded" />
								{/if}
								<select
									value={member.mainSpec || ''}
									onchange={(e) => onSpecChange(member, e.currentTarget.value)}
									class="w-full min-w-30 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
								>
									{#if !member.mainSpec}
										<option value="">Select Spec</option>
									{/if}
									{#each specs as spec (spec.name)}
										<option value={spec.name}>{spec.name}</option>
									{/each}
								</select>
							</div>
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
					</td>
					<td class="px-4 py-3 whitespace-nowrap">
						{#if member.mainRole}
							<div class="flex items-center gap-2">
								<img src={ROLE_ICONS[member.mainRole]} alt={member.mainRole} class="h-5 w-5" />
								<span class="{ROLE_COLORS[member.mainRole]} text-sm">{member.mainRole}</span>
							</div>
						{:else}
							<span class="text-sm text-gray-500">-</span>
						{/if}
					</td>
					<td class="px-4 py-3 text-gray-300 whitespace-nowrap">{member.rankName}</td>
					<td class="px-4 py-3 whitespace-nowrap">
						{#if dev}
							<input
								type="text"
								value={member.note}
								oninput={(e) => onNoteChange(member, e.currentTarget.value)}
								placeholder="Add note..."
								class="w-full min-w-32 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
							/>
						{:else}
							<span class="text-xs text-gray-400" title={member.note}>{member.note || '-'}</span>
						{/if}
					</td>
					<td class="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
						{formatLastOnline(member.lastOnline)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
