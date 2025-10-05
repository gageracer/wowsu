<script lang="ts">
	import GuildRules, { metadata } from '$lib/posts/guildrules.svx';
	import Toc from '$lib/components/Toc.svelte';
</script>

<svelte:head>
	<title>{metadata.title}</title>
</svelte:head>

<!-- Mobile TOC (collapsible) -->
<div class="mb-4 md:hidden">
	<details class="rounded border border-text/20 bg-black/20 p-3">
		<summary class="cursor-pointer font-semibold select-none">İçindekiler</summary>
		<div class="mt-2">
			<Toc containerSelector="#doc-content" minLevel={1} maxLevel={3} />
		</div>
	</details>
</div>

<!-- Desktop: two-column layout -->
<div class="md:grid md:grid-cols-12 md:gap-2">
	<aside class="relative hidden md:col-span-4 md:block lg:col-span-3">
		<div
			class="sticky top-24 h-[calc(100vh-6rem)] overflow-auto border-r border-text/20 pr-3 md:pl-4"
		>
			<Toc containerSelector="#doc-content" minLevel={1} maxLevel={2} />
		</div>
	</aside>

	<article id="doc-content" class="prose max-w-none prose-invert md:col-span-8 lg:col-span-9">
		<GuildRules />
	</article>
</div>
