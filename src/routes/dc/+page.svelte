<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { linear,sineIn, expoOut } from 'svelte/easing';

	// Use Svelte's tweened for smooth animation with LINEAR easing
	const scale = tweened(1, {
		duration: 120000, // 60 seconds - nice and slow like the SpongeBob scene
		easing: sineIn
	});

	let growing = $state(true);

	function stopGrowingAndRedirect() {
		growing = false;
		scale.set($scale, { duration: 0 }); // Stop the animation
		// Redirect to Discord
		window.location.href = 'https://discord.gg/JRXv5XMZGy';
	}

	// Start growing when mounted
	$effect(() => {
		if (growing) {
			// Calculate scale to fill viewport
			// Icon starts at w-6 (24px), we want it to fill ~1000px viewport = scale ~40x
			scale.set(75);
		}
	});
</script>

<svelte:head>
	<title>Discord - Wowsu</title>
</svelte:head>

<div class="h-screen flex items-center justify-center">
	<a
		href="https://discord.gg/JRXv5XMZGy"
		class="inline-block"
		style:transform="scale({$scale})"
		style:transform-origin="center center"
		onclick={(e) => {
			e.preventDefault();
			stopGrowingAndRedirect();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				stopGrowingAndRedirect();
			}
		}}
	>
		<img
			src="/images/svgs/discord.svg"
			alt="Discord"
			class="select-none pointer-events-none w-6"
		/>
	</a>
</div>


<style>
	:global(body) {
		overflow: hidden;
	}
</style>
