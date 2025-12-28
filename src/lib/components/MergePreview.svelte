<script lang="ts">
	import type { RosterMember } from '$lib/types/roster';
	import { getClassColor } from '$lib/wow-specs';

	interface MergePreviewData {
		merged: RosterMember[];
		rolesPreserved: number;
		newPlayers: number;
		changes: Array<{ name: string; classFileName: string; message: string }>;
		lastUpdated: number;
	}

	let {
		preview,
		onApply,
		onCancel
	}: {
		preview: MergePreviewData;
		onApply: () => void;
		onCancel: () => void;
	} = $props();
</script>

<div class="mb-4 rounded-lg border border-green-600 bg-gray-900 p-4">
	<h3 class="mb-2 text-lg font-semibold text-green-400">Merge Preview</h3>
	<div class="mb-3 grid grid-cols-3 gap-4 text-sm">
		<div class="rounded bg-blue-900/30 p-3">
			<div class="font-semibold text-blue-400">Total Members</div>
			<div class="text-2xl text-gray-200">{preview.merged.length}</div>
		</div>
		<div class="rounded bg-green-900/30 p-3">
			<div class="font-semibold text-green-400">Roles Preserved</div>
			<div class="text-2xl text-gray-200">{preview.rolesPreserved}</div>
		</div>
		<div class="rounded bg-orange-900/30 p-3">
			<div class="font-semibold text-orange-400">New Players</div>
			<div class="text-2xl text-gray-200">{preview.newPlayers}</div>
		</div>
	</div>
	<div class="mb-3 max-h-64 overflow-auto rounded bg-gray-950 p-3">
		<h4 class="mb-2 text-sm font-semibold text-gray-400">Changes:</h4>
		<ul class="space-y-1 text-xs text-gray-300">
			{#each preview.changes as change (change.name)}
				<li class="flex items-center gap-2">
					<span class="text-gray-500">•</span>
					<span class="font-medium" style="color: {getClassColor(change.classFileName)}">
						{change.name}
					</span>
					<span class="text-gray-500">→</span>
					<span class="text-gray-400">{change.message}</span>
				</li>
			{/each}
		</ul>
	</div>
	<div class="flex gap-2">
		<button
			onclick={onApply}
			class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
		>
			Apply Merge
		</button>
		<button
			onclick={onCancel}
			class="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
		>
			Cancel
		</button>
	</div>
</div>
