<script lang="ts">
	import RosterTable from '$lib/components/Roster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let roster = $state(data.roster);
</script>

<svelte:head>
	<title>Guild Roster - The Hive Mind</title>
</svelte:head>

<section class="mb-8">
	<h1 class="mb-2 text-center text-3xl font-bold text-gray-100">Guild Roster</h1>
	<p class="mb-6 text-center text-sm text-gray-400">
		Total Members: {roster.length}
	</p>
</section>

<section class="mb-8">
	<RosterTable bind:roster={roster} />
</section>

<section class="mt-8 text-center">
	<p class="text-xs text-gray-500">
		Click column headers to sort the roster • Click "Edit" to set main spec
	</p>
</section>
