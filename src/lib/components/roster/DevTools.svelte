<script lang="ts">
	import { rosterContext } from './context/roster';
	import MergePanel from './MergePanel.svelte';
	import MergePreview from './MergePreview.svelte';
	import JsonExport from './JsonExport.svelte';
	import { dev } from '$app/environment';

	// Placeholder for applyRaiderIOData - passed from parent
	let { applyRaiderIOData = (() => {}) }: { applyRaiderIOData?: () => void } = $props();

	// Get roster state from context - ONLY for roster data
	const rosterState = rosterContext.get();

	function copyToClipboard() {
		const rosterData = rosterState.getExportData();
		const jsonText = JSON.stringify(rosterData, null, 2);
		navigator.clipboard.writeText(jsonText).then(() => {
			alert('JSON copied to clipboard!');
		});
	}

	function downloadJson() {
		const rosterData = rosterState.getExportData();
		const jsonText = JSON.stringify(rosterData, null, 2);
		const blob = new Blob([jsonText], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'roster-updated.json';
		a.click();
		URL.revokeObjectURL(url);
	}


</script>

{#if dev}
	<div class="mb-4 flex flex-wrap gap-2">
		<button
			onclick={() => rosterState.toggleJsonExport()}
			class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
		>
			{rosterState.showJsonExport ? 'Hide' : 'Show'} JSON Export
		</button>
		<button
			onclick={() => rosterState.toggleMergePanel()}
			class="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
		>
			{rosterState.showMergePanel ? 'Hide' : 'Show'} Merge Panel
		</button>
		<button
			onclick={applyRaiderIOData}
			class="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
		>
			Apply Raider.IO Data
		</button>
	</div>
	{#if rosterState.mergePreview}
		<MergePreview
			preview={rosterState.mergePreview}
			onApply={() => rosterState.applyMerge()}
			onCancel={() => rosterState.cancelMerge()}
		/>
	{/if}
	{#if rosterState.showJsonExport}
		<JsonExport
			roster={rosterState.roster}
			onCopy={copyToClipboard}
			onDownload={downloadJson}
			onClose={() => rosterState.toggleJsonExport()}
		/>
	{/if}
	{#if rosterState.showMergePanel}
		<MergePanel
			bind:newRosterJson={rosterState.newRosterJson}
			mergeError={rosterState.mergeError}
			onPreview={() => rosterState.mergeRosters()}
			onCancel={() => rosterState.toggleMergePanel()}
		/>
	{/if}
{/if}
