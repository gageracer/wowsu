<script lang="ts">
	import { formatDate } from '$lib/utils';

	let { title, date, children } = $props();
</script>

<br />
<article class="mx-auto prose prose-invert">
	<h1>{title}</h1>
	{#if date}
		<div class="text-gray-400">
			<time datetime={date}>{formatDate(date)}</time>
		</div>
	{/if}
	{@render children()}
</article>
<br />
<a href="/" class="flex items-center space-x-4 text-secondary">← Geri</a>
