<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import '../app.css';
	import { page } from '$app/state';
	import Nav from '$lib/components/Nav.svelte';

	let { children } = $props();
	const home = $derived(page.url.pathname === '/');
	const wide = $derived(page.url.pathname.startsWith('/guildrules'));
	const name = 'The Hive Topluluğu';

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class="bg-mobile md:bg-leather min-h-screen bg-contain text-text">
	<main class="container mx-auto px-4 py-8">
		<div class={`container mx-auto ${wide ? 'max-w-5xl' : 'max-w-2xl'} px-4 py-8`}>
			<header class="flex flex-col items-center">
				{#if home}
					<div class="logo-container mb-4">
						<img
							loading="lazy"
							src="/images/logo-1.avif"
							alt={name}
							class="logo-image h-40 rounded-full"
						/>
					</div>
					<h1 class="site-name text-4xl font-bold">{name}</h1>
				{:else}
					<div class="logo-container mb-4">
						<a href="/">
							<img src="/images/logo-1.avif" alt={name} class="logo-image h-36 rounded-full" />
						</a>
					</div>
					<h2 class="site-name text-2xl font-bold">
						<a href="/" class="text-text hover:no-underline">{name}</a>
					</h2>
				{/if}
			</header>
			{@render children()}
		</div>
	</main>
</div>

<style>
	header {
		view-transition-name: header;
	}
	.logo-container {
		view-transition-name: logo;
	}

	.logo-image {
		view-transition-name: logo-image;
	}
	.site-name {
		view-transition-name: site-name;
	}
	::view-transition-old(site-name),
	::view-transition-new(site-name) {
		mix-blend-mode: normal;
		height: 100%;
		width: 100%;
	}
	::view-transition-old(logo-image),
	::view-transition-new(logo-image) {
		mix-blend-mode: normal;
		height: 100%;
		width: 100%;
		object-fit: cover;
	}
</style>
