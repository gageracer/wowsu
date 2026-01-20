<script lang="ts">
	import { resolve } from '$app/paths';
	import Layout from '$lib/components/Layout.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { getPosts } from '$lib/posts';

	const posts = getPosts();

	// Use UTC midnight for consistent timezone handling
	const hrDates = [new Date('2026-01-01T00:00:00Z')]
	const midnight = $derived(new Date() >= hrDates[0] ? '-midnight' : '');

	/**
	 * Parse date string with zero-padding for Bun compatibility
	 * Handles dates like '2025-2-18' and converts to proper ISO format
	 */
	function parsePostDate(dateStr: string): Date {
		const parts = dateStr.split('-');
		if (parts.length !== 3) return new Date(dateStr); // fallback

		const year = parts[0];
		const month = parts[1].padStart(2, '0');
		const day = parts[2].padStart(2, '0');

		return new Date(`${year}-${month}-${day}T00:00:00Z`);
	}

	function isAfterCutoff(dateStr: string) {
		// Parse the date string as UTC midnight for consistent comparison
		return parsePostDate(dateStr) > hrDates[0];
	}

</script>

<Layout>
	<section class="mb-8">
		<h2 class={`text-center text-2xl font-bold text-secondary${midnight}`}>Önemli Linkler</h2>
		<Nav />
	</section>
	<section class="flex flex-col items-center">
		<h2 class={`mb-6 text-center text-2xl font-bold text-secondary${midnight}`} >Rehber ve Yazılar</h2>
		<ul class="mx-auto grid gap-4">
			{#each posts as post, index (post.slug)}
				<li class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
					<a
						href={resolve(`/posts/${post.slug}`)}
						class={`flex items-center gap-4 text-secondary${midnight} sm:w-80`}
					>
						{#if post.img}
							<img
								loading="lazy"
								src={`/images/${post.img}`}
								alt="Logo"
								class="h-12 w-12 object-contain"
							/>
						{/if}
						<span class="text-sm leading-tight">{post.title}</span>
					</a>
					<span class="text-xs whitespace-nowrap text-gray-200">{post.date}</span>
				</li>
				{#if (index !== posts.length - 1 && !isAfterCutoff(posts[index + 1].date)) && isAfterCutoff(post.date)}
				    <hr class="text-secondary-midnight">
				{/if}
			{/each}
		</ul>
	</section>
</Layout>
