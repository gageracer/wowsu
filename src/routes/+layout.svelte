<script lang="ts">
import { onNavigate } from "$app/navigation";
import "../app.css";
import { page } from "$app/state";

let { children } = $props();
const home = $derived(page.url.pathname === "/");

const name = "The Hive";

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

<div class="min-h-screen bg-mobile md:bg-leather bg-contain text-text">
  <main class="container mx-auto px-4 py-8">
      <div class="container mx-auto max-w-2xl px-4 py-8">
        <header class="flex flex-col items-center">
          {#if home}
            <div class="mb-4 logo-container">
              <img
                src="/images/logo-1.avif"
                alt={name}
                class="h-40 rounded-full logo-image"
              />
            </div>
            <h1 class="text-4xl font-bold site-name">{name}</h1>
          {:else}
            <div class="mb-4 logo-container">
              <a href="/">
                <img
                src="/images/logo-1.avif"
                  alt={name}
                  class="h-36 rounded-full logo-image"
                />
              </a>
            </div>
            <h2 class="text-2xl font-bold site-name">
              <a href="/" class="text-text hover:no-underline">{name}</a>
            </h2>
          {/if}
        </header>
    {@render children()}
  </main>
</div>

<style>
header{
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
