<script lang="ts">
	import RosterTable from '$lib/components/Roster.svelte';
	import { onMount, untrack } from 'svelte';
	import { getRoster, checkForUpdates, applyUpdate, saveRoster } from './data.remote';
	import type { RosterMember } from '$lib/types/roster';

	// Call the query - it returns a reactive object
	const rosterQuery = getRoster();

	// Create bindable state from query result
	let roster = $state<RosterMember[]>([]);
	let lastUpdated = $state(0);
	let initialLoad = $state(true);

	// Sync query data to bindable state
	$effect(() => {
		if (rosterQuery.current) {
			roster = rosterQuery.current.members;
			lastUpdated = rosterQuery.current.lastUpdated;
			// Mark that we've done the initial load
			setTimeout(() => initialLoad = false, 100);
		}
	});

	// Auto-save when roster changes (but not on initial load)
	let saveTimeout: number | null = null;
	$effect(() => {
		// Track roster changes
		roster;

		// Don't save on initial load
		if (initialLoad) return;

		// Debounce the save
		untrack(() => {
			if (saveTimeout) clearTimeout(saveTimeout);

			saveTimeout = setTimeout(async () => {
				try {
					console.log('Auto-saving roster...');
					await saveRoster({ members: roster, lastUpdated });
					console.log('Roster saved successfully');
				} catch (error) {
					console.error('Error auto-saving roster:', error);
				}
			}, 1000); // Save 1 second after changes stop
		});
	});

	let showUpdateNotification = $state(false);
	let isUpdating = $state(false);
	let updateError = $state<string | null>(null);
	let updateData = $state<any>(null);

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

	async function handleApplyUpdate() {
		isUpdating = true;
		updateError = null;

		try {
			// This will refresh rosterQuery automatically
			const result = await applyUpdate().updates(rosterQuery);

			if (result.success) {
				showUpdateNotification = false;
				alert(
					`Roster updated successfully!\n\n` +
					`• ${result.memberCount} members loaded\n` +
					`• ${result.rolesPreserved} roles preserved\n` +
					`• File saved to src/lib/data/roster.json\n\n` +
					`• Historical snapshot saved to src/lib/data/rosters/\n\n` +
					`You can now commit and push the changes to GitHub!`
				);
			}
		} catch (error) {
			console.error('Error applying update:', error);
			updateError = error instanceof Error ? error.message : 'Failed to update roster. Check console for details.';
		} finally {
			isUpdating = false;
		}
	}

	// Check for updates periodically
	onMount(() => {
		// Check immediately on mount
		(async () => {
			try {
				const result = await checkForUpdates();
				if (result.hasUpdate) {
					showUpdateNotification = true;
					updateData = result;
				}
			} catch (error) {
				console.error('Error checking for updates:', error);
			}
		})();

		// Then check every 5 minutes
		const interval = setInterval(async () => {
			try {
				const result = await checkForUpdates();
				if (result.hasUpdate) {
					showUpdateNotification = true;
					updateData = result;
				}
			} catch (error) {
				console.error('Error checking for updates:', error);
			}
		}, 5 * 60 * 1000);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Guild Roster - The Hive Mind</title>
</svelte:head>

{#if showUpdateNotification}
	<div class="mb-4 rounded-lg border-2 border-green-500 bg-green-900/30 p-4 shadow-lg">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-500 p-2">
					<svg
						class="h-6 w-6 text-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-green-100">Roster Update Available!</h3>
					<p class="text-sm text-green-200">
						New data detected in GuildRosterExport.lua (last activity:{' '}
						{updateData?.luaLastUpdated ? formatDate(updateData.luaLastUpdated) : 'Unknown'})
					</p>
				</div>
			</div>
			<div class="flex gap-2">
				<button
					onclick={handleApplyUpdate}
					disabled={isUpdating}
					class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUpdating ? 'Updating...' : 'Update & Save'}
				</button>
				<button
					onclick={() => (showUpdateNotification = false)}
					class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
				>
					Dismiss
				</button>
			</div>
		</div>
		{#if updateError}
			<div class="mt-3 rounded bg-red-900/50 p-3 text-sm text-red-300">
				{updateError}
			</div>
		{/if}
	</div>
{/if}

{#if rosterQuery.error}
	<div class="rounded-lg border-2 border-red-500 bg-red-900/30 p-6 text-center">
		<p class="mb-4 text-red-300">Failed to load roster: {rosterQuery.error.message}</p>
		<button onclick={() => rosterQuery.refresh()} class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">
			Try Again
		</button>
	</div>
{:else if rosterQuery.loading}
	<div class="flex items-center justify-center py-24">
		<div class="text-center">
			<div class="mb-4 text-gray-400">Loading roster...</div>
			<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500"></div>
		</div>
	</div>
{:else}
	<section class="mb-8">
		<h1 class="mb-2 text-center text-3xl font-bold text-gray-100">Guild Roster</h1>
		<div class="flex justify-center gap-4 text-sm text-gray-400">
			<p>Total Members: <span class="font-semibold text-gray-300">{roster.length}</span></p>
			<span class="text-gray-600">•</span>
			<p>
				Last Updated: <span class="font-semibold text-gray-300">{formatDate(lastUpdated)}</span>
			</p>
		</div>
	</section>

	<section class="mb-8">
		<RosterTable bind:roster={roster} bind:lastUpdated={lastUpdated} />
	</section>
{/if}

<section class="mt-8 text-center">
	<p class="text-xs text-gray-500">
		Click column headers to sort the roster • Updates checked automatically every 5 minutes
	</p>
</section>
