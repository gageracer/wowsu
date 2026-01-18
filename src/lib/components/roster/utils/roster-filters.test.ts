import { describe, it, expect } from 'vitest';
import {
	applyFilters,
	sortMembers,
	getRoleCounts,
	getClassCounts,
	type RosterFilter,
	type RosterMember
} from './roster-filters';

// Mock roster members for testing
const mockMembers: RosterMember[] = [
	{
		name: 'Alice',
		class: 'WARRIOR',
		mainRole: 'Tank',
		mainSpec: 'Protection',
		rankName: 'Officer',
		rankIndex: 2,
		level: 80,
		note: 'Main tank',
		officerNote: 'Reliable',
		status: 1,
		classFileName: 'warrior',
		achievementPoints: 10000,
		achievementRank: 1,
		lastOnline: 1704067200,
		realmName: 'TestRealm'
	},
	{
		name: 'Bob',
		class: 'PRIEST',
		mainRole: 'Healer',
		mainSpec: 'Holy',
		rankName: 'Raider',
		rankIndex: 3,
		level: 80,
		note: 'Heals',
		officerNote: '',
		status: 1,
		classFileName: 'priest',
		achievementPoints: 5000,
		achievementRank: 2,
		lastOnline: 1704153600,
		realmName: 'TestRealm'
	},
	{
		name: 'Charlie',
		class: 'MAGE',
		mainRole: 'DPS',
		mainSpec: 'Fire',
		rankName: 'Member',
		rankIndex: 4,
		level: 79,
		note: 'Fire mage',
		officerNote: '',
		status: 1,
		classFileName: 'mage',
		achievementPoints: 3000,
		achievementRank: 3,
		lastOnline: 1704240000,
		realmName: 'TestRealm'
	},
	{
		name: 'Diana',
		class: 'DRUID',
		mainRole: 'DPS',
		mainSpec: 'Feral',
		rankName: 'Member',
		rankIndex: 4,
		level: 80,
		note: '',
		officerNote: 'New member',
		status: 1,
		classFileName: 'druid',
		achievementPoints: 2000,
		achievementRank: 4,
		lastOnline: 1704326400,
		realmName: 'TestRealm'
	}
];

describe('applyFilters', () => {
	it('returns all members when no filters applied', () => {
		const result = applyFilters(mockMembers, []);
		expect(result).toEqual(mockMembers);
	});

	it('filters by equals operator', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'class', operator: 'equals', value: 'WARRIOR' }
		];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Alice');
	});

	it('filters by notEquals operator', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'class', operator: 'notEquals', value: 'WARRIOR' }
		];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(3);
		expect(result.every((m) => m.class !== 'WARRIOR')).toBe(true);
	});

	it('filters by contains operator', () => {
		const filters: RosterFilter[] = [{ id: 1, field: 'note', operator: 'contains', value: 'mage' }];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Charlie');
	});

	it('filters by notContains operator', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'note', operator: 'notContains', value: 'mage' }
		];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(3);
		expect(result.every((m) => !m.note.toLowerCase().includes('mage'))).toBe(true);
	});

	it('filters by greaterThan operator on numbers', () => {
		const filters: RosterFilter[] = [{ id: 1, field: 'level', operator: 'greaterThan', value: 79 }];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(3);
		expect(result.every((m) => m.level > 79)).toBe(true);
	});

	it('filters by lessThan operator on numbers', () => {
		const filters: RosterFilter[] = [{ id: 1, field: 'level', operator: 'lessThan', value: 80 }];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Charlie');
	});

	it('applies multiple filters with matchAll=true (AND logic)', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'mainRole', operator: 'equals', value: 'DPS' },
			{ id: 2, field: 'level', operator: 'equals', value: 80 }
		];
		const result = applyFilters(mockMembers, filters, true);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Diana');
	});

	it('applies multiple filters with matchAll=false (OR logic)', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'class', operator: 'equals', value: 'WARRIOR' },
			{ id: 2, field: 'class', operator: 'equals', value: 'PRIEST' }
		];
		const result = applyFilters(mockMembers, filters, false);
		expect(result).toHaveLength(2);
		expect(result.map((m) => m.name)).toEqual(['Alice', 'Bob']);
	});

	it('handles null/undefined values with notEquals', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'note', operator: 'notEquals', value: 'something' }
		];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(4); // All members pass (including Diana with empty note)
	});

	it('is case-insensitive', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'class', operator: 'equals', value: 'warrior' }
		];
		const result = applyFilters(mockMembers, filters);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Alice');
	});
});

describe('sortMembers', () => {
	it('sorts by name ascending by default', () => {
		const result = sortMembers(mockMembers);
		expect(result.map((m) => m.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
	});

	it('sorts by name descending', () => {
		const result = sortMembers(mockMembers, 'name', 'desc');
		expect(result.map((m) => m.name)).toEqual(['Diana', 'Charlie', 'Bob', 'Alice']);
	});

	it('sorts by level ascending', () => {
		const result = sortMembers(mockMembers, 'level', 'asc');
		expect(result.map((m) => m.name)).toEqual(['Charlie', 'Alice', 'Bob', 'Diana']);
	});

	it('sorts by level descending', () => {
		const result = sortMembers(mockMembers, 'level', 'desc');
		expect(result[0].level).toBe(80);
		expect(result[result.length - 1].level).toBe(79);
	});

	it('sorts by rankIndex ascending', () => {
		const result = sortMembers(mockMembers, 'rankIndex', 'asc');
		expect(result[0].rankIndex).toBe(2);
		expect(result[result.length - 1].rankIndex).toBe(4);
	});

	it('sorts by class alphabetically', () => {
		const result = sortMembers(mockMembers, 'class', 'asc');
		expect(result[0].class).toBe('DRUID');
		expect(result[result.length - 1].class).toBe('WARRIOR');
	});

	it('sorts by mainRole', () => {
		const result = sortMembers(mockMembers, 'mainRole', 'asc');
		expect(result[0].mainRole).toBe('DPS');
		expect(result[result.length - 1].mainRole).toBe('Tank');
	});

	it('sorts by lastOnline', () => {
		const result = sortMembers(mockMembers, 'lastOnline', 'asc');
		expect(result[0].name).toBe('Alice'); // Oldest
		expect(result[result.length - 1].name).toBe('Diana'); // Most recent
	});

	it('does not mutate original array', () => {
		const original = [...mockMembers];
		sortMembers(mockMembers, 'name', 'desc');
		expect(mockMembers).toEqual(original);
	});

	it('handles null/undefined values by sorting to end', () => {
		const membersWithNull = [
			...mockMembers,
			{
				...mockMembers[0],
				name: 'Zed',
				mainRole: undefined as any
			}
		];
		const result = sortMembers(membersWithNull, 'mainRole', 'asc');
		expect(result[result.length - 1].name).toBe('Zed');
	});
});

describe('getRoleCounts', () => {
	it('counts members by role', () => {
		const counts = getRoleCounts(mockMembers);
		expect(counts.Tank).toBe(1);
		expect(counts.Healer).toBe(1);
		expect(counts.DPS).toBe(2);
	});

	it('returns zeros for empty array', () => {
		const counts = getRoleCounts([]);
		expect(counts.Tank).toBe(0);
		expect(counts.Healer).toBe(0);
		expect(counts.DPS).toBe(0);
	});

	it('handles members without roles', () => {
		const membersWithoutRoles = [{ ...mockMembers[0], mainRole: undefined }] as any;
		const counts = getRoleCounts(membersWithoutRoles);
		expect(counts.Tank).toBe(0);
		expect(counts.Healer).toBe(0);
		expect(counts.DPS).toBe(0);
	});
});

describe('getClassCounts', () => {
	it('counts members by class', () => {
		const counts = getClassCounts(mockMembers);
		expect(counts.WARRIOR).toBe(1);
		expect(counts.PRIEST).toBe(1);
		expect(counts.MAGE).toBe(1);
		expect(counts.DRUID).toBe(1);
	});

	it('returns empty object for empty array', () => {
		const counts = getClassCounts([]);
		expect(Object.keys(counts)).toHaveLength(0);
	});

	it('handles duplicate classes', () => {
		const duplicates = [...mockMembers, mockMembers[0]];
		const counts = getClassCounts(duplicates);
		expect(counts.WARRIOR).toBe(2);
	});
});

describe('complex filter scenarios', () => {
	it('filters and sorts correctly together (integration)', () => {
		const filters: RosterFilter[] = [{ id: 1, field: 'level', operator: 'equals', value: 80 }];
		const filtered = applyFilters(mockMembers, filters);
		const sorted = sortMembers(filtered, 'name', 'asc');

		expect(sorted).toHaveLength(3);
		expect(sorted.map((m) => m.name)).toEqual(['Alice', 'Bob', 'Diana']);
	});

	it('filters by role and sorts by name', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'mainRole', operator: 'equals', value: 'DPS' }
		];
		const filtered = applyFilters(mockMembers, filters);
		const sorted = sortMembers(filtered, 'name', 'desc');

		expect(sorted.map((m) => m.name)).toEqual(['Diana', 'Charlie']);
	});

	it('handles complex multi-filter scenarios', () => {
		const filters: RosterFilter[] = [
			{ id: 1, field: 'level', operator: 'greaterThan', value: 78 },
			{ id: 2, field: 'rankName', operator: 'notEquals', value: 'Officer' },
			{ id: 3, field: 'note', operator: 'notContains', value: 'tank' }
		];
		const result = applyFilters(mockMembers, filters, true);

		expect(result).toHaveLength(3); // Bob, Charlie, Diana (all level > 78, not Officer, note doesn't contain 'tank')
		expect(result.every((m) => m.level > 78)).toBe(true);
		expect(result.every((m) => m.rankName !== 'Officer')).toBe(true);
	});
});
