import { Context, PersistedState } from 'runed';
import type { RosterState } from '../roster.state.svelte';
import type { RosterFilter } from '$lib/types/filters';

/**
 * Context for sharing RosterState instance across roster components
 *
 * Usage:
 *
 * Parent component:
 * ```ts
 * const rosterState = new RosterState();
 * rosterContext.set(rosterState);
 * ```
 *
 * Child components:
 * ```ts
 * const rosterState = rosterContext.get();
 * // Access reactive properties: rosterState.roster, rosterState.sortedRoster, etc.
 * ```
 */
export const rosterContext = new Context<RosterState>('roster');
export const filterContext = new Context<PersistedState<{
	filters: RosterFilter[];
	matchAll: boolean;
	filtersEnabled: boolean;
}>>('filters');
