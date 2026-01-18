<script lang="ts">
	import { rosterContext } from './roster/context/roster';
	import RosterTable from './roster/RosterTable.svelte';

	// Get the RosterState from context
	// This component just passes context down to RosterTable
	const rosterState = rosterContext.get();
</script>

<RosterTable />
