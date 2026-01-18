import type { RosterMember } from '$lib/types/roster';
import type { Role } from '$lib/wow-specs';
import type { RosterFilter } from '$lib/types/filters';

export interface ColumnConfig {
	key: keyof RosterMember | 'daysOffline';
	label: string;
	visible: boolean;
	alwaysVisible?: boolean;
	sortable: boolean;
}

export interface MergePreview {
	merged: RosterMember[];
	rolesPreserved: number;
	newPlayers: number;
	changes: Array<{ name: string; classFileName: string; message: string }>;
	lastUpdated: number;
}

/**
 * RosterState - Reactive state manager for roster data
 *
 * This class uses Svelte 5's $state runes to manage all roster-related state.
 * When passed through Context, the reactivity is preserved - all properties
 * and derived values automatically update across all consuming components.
 *
 * Pattern:
 * 1. Create instance: `const rosterState = new RosterState()`
 * 2. Set in context: `rosterContext.set(rosterState)`
 * 3. Get in children: `const rosterState = rosterContext.get()`
 * 4. Use properties: `rosterState.roster` - automatically reactive!
 */
export class RosterState {
	// ===== Core Data =====
	roster: RosterMember[] = $state([]);
	lastUpdated: number = $state(0);

	// ===== UI State =====
	isTyping: boolean = $state(false);
	showColumnManager: boolean = $state(false);
	showJsonExport: boolean = $state(false);
	showMergePanel: boolean = $state(false);

	// ===== Filter State =====
	filters: RosterFilter[] = $state([]);
	matchAll: boolean = $state(false);
	filtersEnabled: boolean = $state(true);

	// ===== Sort State =====
	sortKey: keyof RosterMember | 'daysOffline' = $state('name');
	sortDirection: 'asc' | 'desc' = $state('asc');

	// ===== Column State =====
	columns: ColumnConfig[] = $state([
		{ key: 'name', label: 'Name', visible: true, alwaysVisible: true, sortable: true },
		{ key: 'level', label: 'Level', visible: true, sortable: true },
		{ key: 'class', label: 'Class', visible: true, sortable: true },
		{ key: 'mainSpec', label: 'Spec', visible: true, sortable: true },
		{ key: 'mainRole', label: 'Role', visible: true, sortable: true },
		{ key: 'rankName', label: 'Rank', visible: true, sortable: true },
		{ key: 'note', label: 'Note', visible: true, sortable: true },
		{ key: 'lastOnline', label: 'Last Online', visible: true, sortable: true },
		{ key: 'zone', label: 'Zone', visible: true, sortable: true },
		{ key: 'achievementPoints', label: 'Achievement Points', visible: true, sortable: true },
		{ key: 'daysOffline', label: 'Days Offline', visible: true, sortable: true },
		{ key: 'realmName', label: 'Realm', visible: true, sortable: true },
		{ key: 'rioMythicPlusScore', label: 'M+ Score', visible: false, sortable: true },
		{ key: 'rioRaidProgress', label: 'Raid Progress', visible: false, sortable: true },
		{ key: 'rioLastCrawled', label: 'Last Crawled', visible: false, sortable: true }
	]);

	// ===== Merge State =====
	newRosterJson: string = $state('');
	mergeError: string | null = $state(null);
	mergePreview: MergePreview | null = $state(null);

	// ===== Derived Values (Computed Reactively) =====

	visibleColumns = $derived(this.columns.filter((col) => col.visible));

	filteredRoster = $derived.by(() => {
		if (!this.filtersEnabled || this.filters.length === 0) {
			return this.roster;
		}

		return this.roster.filter((member) => {
			if (this.matchAll) {
				return this.filters.every((filter) => this.matchFilter(member, filter));
			} else {
				return this.filters.some((filter) => this.matchFilter(member, filter));
			}
		});
	});

	sortedRoster = $derived.by(() => {
		const toSort = this.filteredRoster.slice();

		return toSort.sort((a, b) => {
			let aVal: string | number | undefined;
			let bVal: string | number | undefined;

			if (this.sortKey === 'daysOffline') {
				aVal = this.getDaysAgo(a.lastOnline);
				bVal = this.getDaysAgo(b.lastOnline);
			} else {
				aVal = a[this.sortKey as keyof RosterMember];
				bVal = b[this.sortKey as keyof RosterMember];
			}

			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal === undefined || bVal === undefined) return 0;
			if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	// ===== Public Methods =====

	/**
	 * Initialize or update roster data
	 */
	setRoster(members: RosterMember[], lastUpdated: number) {
		this.roster = members;
		this.lastUpdated = lastUpdated;
	}

	/**
	 * Update roster members
	 */
	updateRoster(members: RosterMember[]) {
		this.roster = members;
	}

	/**
	 * Set typing state (for auto-save debouncing)
	 */
	setIsTyping(typing: boolean) {
		this.isTyping = typing;
	}

	/**
	 * Toggle sort direction or change sort key
	 */
	toggleSort(key: keyof RosterMember | 'daysOffline') {
		if (this.sortKey === key) {
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			this.sortKey = key;
			this.sortDirection = 'asc';
		}
	}

	/**
	 * Toggle column manager visibility
	 */
	toggleColumnManager() {
		this.showColumnManager = !this.showColumnManager;
	}

	/**
	 * Reset columns to default visibility
	 */
	resetColumns() {
		this.columns = [
			{ key: 'name', label: 'Name', visible: true, alwaysVisible: true, sortable: true },
			{ key: 'level', label: 'Level', visible: true, sortable: true },
			{ key: 'class', label: 'Class', visible: true, sortable: true },
			{ key: 'mainSpec', label: 'Spec', visible: true, sortable: true },
			{ key: 'mainRole', label: 'Role', visible: true, sortable: true },
			{ key: 'rankName', label: 'Rank', visible: true, sortable: true },
			{ key: 'note', label: 'Note', visible: true, sortable: true },
			{ key: 'lastOnline', label: 'Last Online', visible: true, sortable: true },
			{ key: 'zone', label: 'Zone', visible: true, sortable: true },
			{ key: 'achievementPoints', label: 'Achievement Points', visible: true, sortable: true },
			{ key: 'daysOffline', label: 'Days Offline', visible: true, sortable: true },
			{ key: 'realmName', label: 'Realm', visible: true, sortable: true },
			{ key: 'rioMythicPlusScore', label: 'M+ Score', visible: false, sortable: true },
			{ key: 'rioRaidProgress', label: 'Raid Progress', visible: false, sortable: true },
			{ key: 'rioLastCrawled', label: 'Last Crawled', visible: false, sortable: true }
		];
	}

	/**
	 * Toggle filters on/off
	 */
	toggleFilters() {
		this.filtersEnabled = !this.filtersEnabled;
	}

	/**
	 * Update filter configuration
	 */
	updateFilters(filters: RosterFilter[], matchAll: boolean) {
		this.filters = filters;
		this.matchAll = matchAll;
	}

	/**
	 * Update a member's spec and role
	 */
	updateMemberSpec(member: RosterMember, spec: string, role: Role) {
		this.roster = this.roster.map((m) =>
			m.name === member.name && m.realmName === member.realmName
				? { ...m, mainSpec: spec, mainRole: role }
				: m
		);
	}

	/**
	 * Update a member's note
	 */
	updateMemberNote(member: RosterMember, note: string) {
		this.roster = this.roster.map((m) =>
			m.name === member.name && m.realmName === member.realmName ? { ...m, note } : m
		);
	}

	/**
	 * Toggle merge panel visibility
	 */
	toggleMergePanel() {
		this.showMergePanel = !this.showMergePanel;
	}

	/**
	 * Prepare roster merge preview
	 */
	mergeRosters(newLastUpdated?: number) {
		this.mergeError = null;
		try {
			const newRoster: RosterMember[] = JSON.parse(this.newRosterJson);

			if (!Array.isArray(newRoster)) {
				this.mergeError = 'Invalid JSON: Expected an array of roster members';
				return;
			}

			const existingRoles = new Map<string, { spec: string; role: Role }>();
			this.roster.forEach((member) => {
				if (member.mainSpec && member.mainRole) {
					existingRoles.set(member.name, {
						spec: member.mainSpec,
						role: member.mainRole
					});
				}
			});

			const existingNames = new Set(this.roster.map((m) => m.name));
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

			this.mergePreview = {
				merged,
				rolesPreserved,
				newPlayers,
				changes,
				lastUpdated: updateTimestamp
			};
		} catch (error) {
			this.mergeError = `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	/**
	 * Apply the merge preview
	 */
	applyMerge() {
		if (this.mergePreview) {
			this.roster = this.mergePreview.merged;
			this.lastUpdated = this.mergePreview.lastUpdated;
			this.mergePreview = null;
			this.newRosterJson = '';
			this.showMergePanel = false;
		}
	}

	/**
	 * Cancel merge preview
	 */
	cancelMerge() {
		this.mergePreview = null;
		this.mergeError = null;
	}

	/**
	 * Toggle JSON export panel
	 */
	toggleJsonExport() {
		this.showJsonExport = !this.showJsonExport;
	}

	/**
	 * Get export data for JSON download
	 */
	getExportData() {
		return {
			version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
			lastUpdated: this.lastUpdated,
			members: this.roster
		};
	}

	// ===== Utility Methods =====

	/**
	 * Calculate days since last online
	 */
	getDaysAgo(lastOnline: number): number {
		if (!lastOnline) return -1;
		const date = new Date(lastOnline * 1000);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	/**
	 * Format last online timestamp as human-readable string
	 */
	formatLastOnline(lastOnline: number): string {
		if (!lastOnline) return 'Never';
		const date = new Date(lastOnline * 1000);
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

	/**
	 * Get cell value for display
	 */
	getCellValue(
		member: RosterMember,
		key: keyof RosterMember | 'daysOffline'
	): string | number | undefined {
		if (key === 'daysOffline') {
			return this.getDaysAgo(member.lastOnline);
		}
		return member[key as keyof RosterMember];
	}

	// ===== Private Methods =====

	/**
	 * Check if a member matches a filter
	 */
	private matchFilter(member: RosterMember, filter: RosterFilter): boolean {
		const { field, operator, value } = filter;

		let fieldValue: string | number | undefined | null;

		if (field === 'daysOffline') {
			fieldValue = this.getDaysAgo(member.lastOnline);
		} else {
			fieldValue = member[field as keyof RosterMember] as string | number | undefined;
		}

		const isEmpty =
			fieldValue === undefined ||
			fieldValue === null ||
			fieldValue === '' ||
			(typeof fieldValue === 'string' && fieldValue.trim() === '');

		// Handle numeric fields
		const numericFields = ['level', 'achievementPoints', 'rioMythicPlusScore', 'daysOffline'];
		const isNumericField = numericFields.includes(field);

		let memberValue: number | string | null = fieldValue ?? null;

		if (operator === 'isEmpty') {
			return isEmpty;
		}

		if (operator === 'isNotEmpty') {
			return !isEmpty;
		}

		if (isEmpty && operator !== 'isEmpty' && operator !== 'isNotEmpty') {
			return false;
		}

		if (isNumericField) {
			memberValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));
			if (isNaN(memberValue as number)) {
				return false;
			}
		} else {
			memberValue = String(fieldValue).toLowerCase();
		}

		let compareValue: number | string;
		if (isNumericField) {
			compareValue = parseFloat(value);
			if (isNaN(compareValue)) {
				return false;
			}
		} else {
			compareValue = value.toLowerCase();
		}

		switch (operator) {
			case 'equals':
				return memberValue === compareValue;
			case 'notEquals':
				return memberValue !== compareValue;
			case 'contains':
				return (
					typeof memberValue === 'string' &&
					typeof compareValue === 'string' &&
					memberValue.includes(compareValue)
				);
			case 'notContains':
				return (
					typeof memberValue === 'string' &&
					typeof compareValue === 'string' &&
					!memberValue.includes(compareValue)
				);
			case 'startsWith':
				return (
					typeof memberValue === 'string' &&
					typeof compareValue === 'string' &&
					memberValue.startsWith(compareValue)
				);
			case 'endsWith':
				return (
					typeof memberValue === 'string' &&
					typeof compareValue === 'string' &&
					memberValue.endsWith(compareValue)
				);
			case 'greaterThan':
				return (
					typeof memberValue === 'number' &&
					typeof compareValue === 'number' &&
					memberValue > compareValue
				);
			case 'lessThan':
				return (
					typeof memberValue === 'number' &&
					typeof compareValue === 'number' &&
					memberValue < compareValue
				);
			case 'greaterThanOrEqual':
				return (
					typeof memberValue === 'number' &&
					typeof compareValue === 'number' &&
					memberValue >= compareValue
				);
			case 'lessThanOrEqual':
				return (
					typeof memberValue === 'number' &&
					typeof compareValue === 'number' &&
					memberValue <= compareValue
				);
			default:
				return false;
		}
	}
}
