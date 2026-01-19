import type { RosterMember } from '$lib/types/roster';
import type { Role } from '$lib/wow-specs';

// Re-export for convenience
export type { RosterMember } from '$lib/types/roster';

export type FilterOperator =
	| 'equals'
	| 'notEquals'
	| 'contains'
	| 'notContains'
	| 'greaterThan'
	| 'lessThan';

export type FilterField =
	| 'name'
	| 'class'
	| 'mainRole'
	| 'mainSpec'
	| 'rankName'
	| 'level'
	| 'note'
	| 'officerNote';

export interface RosterFilter {
	id: number;
	field: FilterField;
	operator: FilterOperator;
	value: string | number;
}

export type SortField = 'name' | 'class' | 'mainRole' | 'rankIndex' | 'level' | 'lastOnline';

export type SortDirection = 'asc' | 'desc';

/**
 * Apply a single filter to a member
 */
function memberMatchesFilter(member: RosterMember, filter: RosterFilter): boolean {
	const fieldValue = member[filter.field as keyof RosterMember];
	const filterValue = filter.value;

	// Handle null/undefined values
	if (fieldValue === null || fieldValue === undefined) {
		return filter.operator === 'notEquals' || filter.operator === 'notContains';
	}

	const memberValue = String(fieldValue).toLowerCase();
	const compareValue = String(filterValue).toLowerCase();

	switch (filter.operator) {
		case 'equals':
			return memberValue === compareValue;

		case 'notEquals':
			return memberValue !== compareValue;

		case 'contains':
			return memberValue.includes(compareValue);

		case 'notContains':
			return !memberValue.includes(compareValue);

		case 'greaterThan':
			if (typeof fieldValue === 'number' && typeof filterValue === 'number') {
				return fieldValue > filterValue;
			}
			return memberValue > compareValue;

		case 'lessThan':
			if (typeof fieldValue === 'number' && typeof filterValue === 'number') {
				return fieldValue < filterValue;
			}
			return memberValue < compareValue;

		default:
			return false;
	}
}

/**
 * Apply multiple filters to members list
 */
export function applyFilters(
	members: RosterMember[],
	filters: RosterFilter[],
	matchAll: boolean = true
): RosterMember[] {
	if (filters.length === 0) {
		return members;
	}

	return members.filter((member) => {
		if (matchAll) {
			// All filters must match (AND logic)
			return filters.every((filter) => memberMatchesFilter(member, filter));
		} else {
			// At least one filter must match (OR logic)
			return filters.some((filter) => memberMatchesFilter(member, filter));
		}
	});
}

/**
 * Sort members by specified field and direction
 */
export function sortMembers(
	members: RosterMember[],
	field: SortField = 'name',
	direction: SortDirection = 'asc'
): RosterMember[] {
	const sorted = [...members].sort((a, b) => {
		const aValue = a[field as keyof RosterMember];
		const bValue = b[field as keyof RosterMember];

		// Handle null/undefined values (always sort to end)
		if (aValue === null || aValue === undefined) return 1;
		if (bValue === null || bValue === undefined) return -1;

		// String comparison
		if (typeof aValue === 'string' && typeof bValue === 'string') {
			const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
			return direction === 'asc' ? comparison : -comparison;
		}

		// Number comparison
		if (typeof aValue === 'number' && typeof bValue === 'number') {
			return direction === 'asc' ? aValue - bValue : bValue - aValue;
		}

		// Fallback
		return 0;
	});

	return sorted;
}

/**
 * Get count of members by role
 */
export function getRoleCounts(members: RosterMember[]): Record<Role, number> {
	const counts: Record<string, number> = {
		Tank: 0,
		Healer: 0,
		DPS: 0
	};

	members.forEach((member) => {
		if (member.mainRole) {
			counts[member.mainRole] = (counts[member.mainRole] || 0) + 1;
		}
	});

	return counts as Record<Role, number>;
}

/**
 * Get count of members by class
 */
export function getClassCounts(members: RosterMember[]): Record<string, number> {
	const counts: Record<string, number> = {};

	members.forEach((member) => {
		counts[member.class] = (counts[member.class] || 0) + 1;
	});

	return counts;
}

/**
 * Filter options for dropdowns
 */
export const FILTER_FIELDS: { value: FilterField; label: string }[] = [
	{ value: 'name', label: 'Name' },
	{ value: 'class', label: 'Class' },
	{ value: 'mainRole', label: 'Role' },
	{ value: 'mainSpec', label: 'Spec' },
	{ value: 'rankName', label: 'Rank' },
	{ value: 'level', label: 'Level' },
	{ value: 'note', label: 'Note' },
	{ value: 'officerNote', label: 'Officer Note' }
];

export const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
	{ value: 'equals', label: 'Equals' },
	{ value: 'notEquals', label: 'Not Equals' },
	{ value: 'contains', label: 'Contains' },
	{ value: 'notContains', label: 'Does Not Contain' },
	{ value: 'greaterThan', label: 'Greater Than' },
	{ value: 'lessThan', label: 'Less Than' }
];
