<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { getPosts } from '$lib/posts';

	const posts = getPosts();
</script>

<Layout>
	<section class="mb-8">
		<h2 class="text-center text-2xl font-bold">Önemli Linkler</h2>
		<Nav />
	</section>
	<section>
		<h2 class="mb-6 text-center text-2xl font-bold">Rehber ve Yazılar</h2>
		<ul class="space-y-4 lg:px-16">
			{#each posts as post, index}
				<li class="flex items-center space-x-4">
					<a href={`/posts/${post.slug}`} class="flex items-center space-x-4 text-secondary">
						{#if post.img}
							<img
								loading="lazy"
								src={`/images/${post.img}`}
								alt="Logo"
								class="h-12 w-12 object-contain"
							/>
						{/if}
						<span>{post.title}</span>
					</a>
					<span class="text-xs text-gray-200">{post.date}</span>
				</li>
			{/each}
		</ul>
	</section>
</Layout>
