<script lang="ts">
	import RosterTable from '$lib/components/Roster.svelte';
	import { onMount, tick } from 'svelte';
	import { getRoster, checkForUpdates, applyUpdate, saveRoster,  applyRaiderIOData } from './data.remote';
	import { RosterState } from '$lib/components/roster/roster.state.svelte';
	import { rosterContext } from '$lib/components/roster/context/roster';

	// Call the query - it returns a reactive object
	const rosterQuery = getRoster();

	// Create RosterState instance
	const rosterState = new RosterState();

	// Set roster context for child components
	rosterContext.set(rosterState);

	let hasScrolled = $state(false);
	let rosterSection: HTMLElement | undefined = $state();

	// Sync query data to roster state
    $effect(() => {
  		if (rosterQuery.current) {
 			const newData = rosterQuery.current.members;

 			// Only sync if data is actually different (deep comparison)
 			if (JSON.stringify(rosterState.roster) !== JSON.stringify(newData)) {
  				rosterState.setRoster(newData, rosterQuery.current.lastUpdated);
 			}

 			// Scroll to roster when data loads (only once)
 			if (!hasScrolled && rosterSection) {
  				tick().then(() => {
 					rosterSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 					hasScrolled = true;
  				});
            }
  		}
    });

    // Auto-save state
    let isSaving = $state(false);
    let saveError = $state<string | null>(null);
    let lastSavedSnapshot = $state<string | null>(null);
    let hasInitiallyLoaded = $state(false);

    // Simple debounced auto-save with $effect
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    $effect(() => {
	const currentSnapshot = JSON.stringify(rosterState.roster);

	// Skip initial load - wait until we've loaded data at least once
	if (!hasInitiallyLoaded) {
		if (rosterState.roster.length > 0) {
			hasInitiallyLoaded = true;
			lastSavedSnapshot = currentSnapshot;
		}
		return;
	}

	// Skip if typing, saving, or data hasn't changed
	if (rosterState.isTyping || isSaving || currentSnapshot === lastSavedSnapshot) {
		return;
	}

	// Skip if this is initial load (no previous snapshot)
	if (lastSavedSnapshot === null) {
		lastSavedSnapshot = currentSnapshot;
		return;
	}

	// Debounce the save
	if (saveTimer) clearTimeout(saveTimer);

	saveTimer = setTimeout(async () => {
		isSaving = true;
		saveError = null;

		try {
			await saveRoster({ members: [...rosterState.roster], lastUpdated: rosterState.lastUpdated });
			lastSavedSnapshot = currentSnapshot;
			console.log('Roster auto-saved');

			setTimeout(() => {
				isSaving = false;
			}, 500);
		} catch (error) {
			console.error('Error auto-saving:', error);
			saveError = error instanceof Error ? error.message : 'Failed to save';
			isSaving = false;
		}
	}, 2000);
    });


	let showUpdateNotification = $state(false);
	let isUpdating = $state(false);
	let updateError = $state<string | null>(null);
	let updateData = $state<Record<string, unknown> | null>(null);

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
	const updateChecker = (async () => {
		try {
			const result = await checkForUpdates();
			if (result.hasUpdate) {
				showUpdateNotification = true;
				updateData = result;
			}
		} catch (error) {
			console.error('Error checking for updates:', error);
		}
	})

	// Check for updates periodically
	onMount(() => {
		// Check immediately on mount
		updateChecker();

		// Scroll to roster when the component mounts (only once)
		if (!hasScrolled) {
			tick().then(() => {
				rosterSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
				hasScrolled = true;
			});
		}

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

<!-- Save indicator -->
{#if isSaving}
	<div class="fixed right-4 top-4 z-50 rounded-lg bg-blue-900/90 px-4 py-2 text-sm text-blue-100 shadow-lg">
		💾 Saving...
	</div>
{/if}

{#if saveError}
	<div class="fixed right-4 top-4 z-50 rounded-lg bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-lg">
		❌ Save failed: {saveError}
	</div>
{/if}

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
	<section class="mb-8" bind:this={rosterSection}>
		<h1 class="mb-2 text-center text-3xl font-bold text-gray-100">Guild Roster</h1>
		<div class="flex justify-center gap-4 text-sm text-gray-400">
			<p>Total Members: <span class="font-semibold text-gray-300">{rosterState.roster.length}</span></p>
			<span class="text-gray-600">•</span>
			<p>
				Last Updated: <span class="font-semibold text-gray-300">{formatDate(rosterState.lastUpdated)}</span>
			</p>
		</div>
	</section>

	<section class="mb-8">
		<RosterTable {applyRaiderIOData} />
	</section>
{/if}

<section class="mt-8 text-center">
	<p class="text-xs text-gray-500">
		Click column headers to sort the roster • Updates checked automatically every 5 minutes
	</p>
</section>
