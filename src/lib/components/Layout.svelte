<script lang="ts">
	import { resolve } from "$app/paths";

	let { siteTitle = 'The Hive Mind Topluluğu', children } = $props();
</script>

<svelte:head>
	<title>{siteTitle}</title>
</svelte:head>
<div class="container mx-auto max-w-2xl p-12">
	<section class="prose mb-8 text-center prose-invert">
		<p>
			The Hive Guild'inin gizli defterine hoş geldin. Taktikler, bilgiler ve rehberler sana
			yolculuğunda yardımcı olacak. Raid için gerekenler, Boss bilgileri, hangi Addon'lar gibi
			soruların cevaplarıyla emrindeyim.
		</p>
		<p>
			Sol altta ya da sayfanın sonundaki ikonlara basarak daha fazla bilgi edinebileceğin sitelerin
			linklerini sakladım. Guild <a href={resolve("/kurallar")} title="Guild Kuralları">kuralları</a> burada.
		</p>
	</section>

	{@render children()}
</div>
