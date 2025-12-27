export type FilterField =
	| 'name'
	| 'class'
	| 'level'
	| 'rankName'
	| 'mainSpec'
	| 'mainRole'
	| 'zone'
	| 'note'
	| 'achievementPoints'
	| 'lastOnline';

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';

export interface RosterFilter {
	id: number;
	field: FilterField;
	operator: FilterOperator;
	value: string;
}

export interface FilterConfig {
	filters: RosterFilter[];
	matchAll: boolean;
	applied: boolean;
}
