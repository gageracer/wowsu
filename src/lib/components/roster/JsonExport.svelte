<script lang="ts">
	import type { RosterMember } from '$lib/types/roster';

	let {
		roster,
		onCopy,
		onDownload,
		onClose
	}: {
		roster: RosterMember[];
		onCopy: () => void;
		onDownload: () => void;
		onClose: () => void;
	} = $props();

	const jsonData = $derived({
		version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
		lastUpdated: Math.floor(Date.now() / 1000),
		members: roster
	});
</script>

<div class="mb-4 rounded-lg border border-gray-600 bg-gray-900 p-4">
	<div class="mb-2 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-200">Export JSON</h3>
		<div class="flex gap-2">
			<button
				onclick={onCopy}
				class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
			>
				Copy to Clipboard
			</button>
			<button
				onclick={onDownload}
				class="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
			>
				Download
			</button>
			<button
				onclick={onClose}
				class="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700"
			>
				Close
			</button>
		</div>
	</div>
	<pre class="max-h-96 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-300">{JSON.stringify(jsonData, null, 2)}</pre>
</div>
