<script lang="ts">
	let { siteTitle = 'The Hive Mind Topluluğu', children } = $props();
</script>

<svelte:head>
	<title>{siteTitle}</title>
</svelte:head>
<div class="container mx-auto max-w-2xl px-4 py-8">
	<section class="prose prose-invert mb-8">
		<p>
			The Hive Guild'inin gizli defterine hoş geldin. Taktikler, bilgiler ve rehberler sana
			yolculuğunda yardımcı olacak. Raid için gerekenler, Boss bilgileri, hangi Addon'lar gibi
			soruların cevaplarıyla emrindeyim.
		</p>
		<p>
			Sol altta ya da sayfanın sonundaki ikonlara basarak daha fazla bilgi edinebileceğin sitelerin
			linklerini sakladım.
		</p>
	</section>

	{@render children()}
</div>
