<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();
	const home = $derived(page.url.pathname === '/');
	const wide = $derived(page.url.pathname.startsWith('/roster'));
	const dc = $derived(page.url.pathname.startsWith('/dc'));

	const name = 'The Hive Topluluğu';
	const hrDates = [new Date('2026-1-19')]

	const midnight = $derived(new Date()>= hrDates[0] ? '-midnight' : '');
	const icon = $derived(new Date()>= hrDates[0] ? '/images/midnight-logo-1.avif' : '/images/logo-1.avif');
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

<div class={`bg-mobile${midnight} md:bg-leather${midnight} min-h-screen bg-contain text-text`}>
	<main class="container mx-auto px-4 py-8">
		{#if !dc}
		<div class={['container mx-auto px-4 py-8', wide ? 'max-w-5xl' : 'max-w-2xl']}>
			<header class="flex flex-col items-center">
				{#if home}
					<div class="logo-container mb-4">
						<img
							loading="lazy"
							src={icon}
							alt={name}
							class="logo-image h-40 rounded-full"
						/>
					</div>
					<h1 class={`site-name text-4xl font-bold text-secondary${midnight}`}>{name}</h1>
				{:else}
					<div class="logo-container mb-4">
						<a href={resolve("/")}>
							<img src={icon} alt={name} class="logo-image h-36 rounded-full" />
						</a>
					</div>
					<h2 class="site-name text-2xl font-bold">
						<a href={resolve('/')} class={`hover:no-underline text-secondary${midnight}`}>{name}</a>
					</h2>
				{/if}
			</header>
		</div>
		{/if}
			{@render children()}
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
