<script lang="ts">
	let {
		newRosterJson = $bindable(''),
		mergeError,
		onPreview,
		onCancel
	}: {
		newRosterJson: string;
		mergeError: string | null;
		onPreview: () => void;
		onCancel: () => void;
	} = $props();
</script>

<div class="mb-4 rounded-lg border border-orange-600 bg-gray-900 p-4">
	<h3 class="mb-2 text-lg font-semibold text-orange-400">Merge Roster from JSON</h3>
	<p class="mb-3 text-sm text-gray-400">
		Paste roster JSON array below. Existing main specs and roles will be preserved for matching
		players.
	</p>
	<textarea
		bind:value={newRosterJson}
		placeholder="Paste roster JSON here..."
		class="mb-2 w-full rounded border border-gray-600 bg-gray-800 p-2 text-sm text-gray-200 placeholder-gray-500 focus:border-orange-500 focus:outline-none"
		rows="10"
	></textarea>
	<div class="flex gap-2">
		<button
			onclick={onPreview}
			class="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={!newRosterJson.trim()}
		>
			Preview Merge
		</button>
		<button
			onclick={onCancel}
			class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
		>
			Cancel
		</button>
	</div>
	{#if mergeError}
		<div class="mt-3 rounded bg-red-900/50 p-3 text-sm text-red-300">
			{mergeError}
		</div>
	{/if}
</div>
