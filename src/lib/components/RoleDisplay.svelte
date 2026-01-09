<script lang="ts">
	import type { Role } from '$lib/wow-specs';
	import { ROLE_COLORS, ROLE_ICONS } from '$lib/wow-specs';

	let {
		role = undefined
	}: {
		role: Role | undefined;
	} = $props();

	const roleIcon = $derived(role ? ROLE_ICONS[role] : null);
</script>

{#if role}
	<div class="flex items-center gap-2">
		{#if roleIcon}
			<img
				src={roleIcon}
				alt={role}
				class="h-5 w-5"
			/>
		{/if}
		<span class="{ROLE_COLORS[role]} text-sm">
			{role}
		</span>
	</div>
{:else}
	<span class="text-sm text-gray-500">-</span>
{/if}
