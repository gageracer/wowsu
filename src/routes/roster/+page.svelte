<script lang="ts">
	import RosterTable from '$lib/components/Roster.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let roster = $state(data.members);
	let lastUpdated = $state(data.lastUpdated);
	let showUpdateNotification = $state(data.hasUpdate || false);
	let isUpdating = $state(false);
	let updateError = $state<string | null>(null);

	// Watch for changes in data and update local state
	$effect(() => {
		roster = data.members;
		lastUpdated = data.lastUpdated;
	});

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

	async function applyUpdate() {
		isUpdating = true;
		updateError = null;

		try {
			const response = await fetch('/roster/api/update', {
				method: 'POST'
			});

			if (!response.ok) {
				const text = await response.text();
				console.error('Server error:', text);
				updateError = `Server error: ${response.status} ${response.statusText}`;
				return;
			}

			const result = await response.json();

			if (result.success) {
				// Reload the page data to get the updated roster
				await invalidateAll();

				showUpdateNotification = false;
				alert(
					`Roster updated successfully!\n\n` +
					`• ${result.memberCount} members loaded\n` +
					`• ${result.rolesPreserved} roles preserved\n` +
					`• File saved to static/roster.json\n\n` +
					`You can now commit and push the changes to GitHub!`
				);
			} else {
				updateError = result.error || 'Failed to update roster';
			}
		} catch (error) {
			console.error('Error applying update:', error);
			updateError = error instanceof Error ? error.message : 'Failed to update roster. Check console for details.';
		} finally {
			isUpdating = false;
		}
	}

	// Check for updates periodically (every 5 minutes)
	onMount(() => {
		const interval = setInterval(async () => {
			try {
				const response = await fetch('/roster/api/update');
				const result = await response.json();
				if (result.hasUpdate) {
					showUpdateNotification = true;
					data.luaData = result.luaData;
					data.luaLastUpdated = result.luaLastUpdated;
				}
			} catch (error) {
				console.error('Error checking for updates:', error);
			}
		}, 5 * 60 * 1000); // 5 minutes

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
						{data.luaLastUpdated ? formatDate(data.luaLastUpdated) : 'Unknown'})
					</p>
				</div>
			</div>
			<div class="flex gap-2">
				<button
					onclick={applyUpdate}
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

<section class="mt-8 text-center">
	<p class="text-xs text-gray-500">
		Click column headers to sort the roster • Updates checked automatically every 5 minutes
	</p>
</section>
