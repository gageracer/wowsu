<script lang="ts">
	import { resolve } from '$app/paths';
	import Layout from '$lib/components/Layout.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { getPosts } from '$lib/posts';

	const posts = getPosts();

	const hrDates = [new Date('2025-12-31')]

	function isAfterCutoff(dateStr: string) {
			return new Date(dateStr) > hrDates[0];
	}

</script>

<Layout>
	<section class="mb-8">
		<h2 class="text-center text-2xl font-bold">Önemli Linkler</h2>
		<Nav />
	</section>
	<section class="flex flex-col items-center">
		<h2 class="mb-6 text-center text-2xl font-bold">Rehber ve Yazılar</h2>
		<ul class="mx-auto grid gap-4">
			{#each posts as post, index (post.slug)}
				<li class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
					<a
						href={resolve(`/posts/${post.slug}`)}
						class="flex items-center gap-4 text-secondary sm:w-80"
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
				    <hr>
				{/if}
			{/each}
		</ul>
	</section>
</Layout>
