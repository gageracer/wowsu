<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	// Which heading levels to include (typical docs: H2-H3)

	let {
		containerSelector = '#doc-content',
		minLevel,
		maxLevel
	}: { containerSelector: string; minLevel: number; maxLevel: number } = $props();

	type Heading = { id: string; text: string; level: number };

	let headings: Heading[] = $state([]);
	let activeId: string | null = $state(null);

	function slugify(text: string) {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\\s-]/g, '')
			.trim()
			.replace(/\\s+/g, '-')
			.replace(/-+/g, '-');
	}

	let observer: IntersectionObserver | null = $state(null);

	onMount(() => {
		const container = document.querySelector(containerSelector) as HTMLElement | null;
		if (!container) return;

		// Collect headings
		const all = Array.from(
			container.querySelectorAll('h1, h2, h3, h4, h5, h6')
		) as HTMLHeadingElement[];

		// Ensure IDs and filter by level range
		const seen = new SvelteMap<string, number>();
		const inRange = all
			.map((h) => {
				const level = Number(h.tagName.replace('H', ''));
				$inspect('level1:', level);
				if (level < minLevel || level > maxLevel) return null;
				$inspect('level2:', level);

				let id = h.id?.trim();
				if (!id) {
					const base = slugify(h.textContent || '');
					const count = (seen.get(base) ?? 0) + 1;
					seen.set(base, count);
					id = count > 1 ? `${base}-${count}` : base || crypto.randomUUID();
					h.id = id;
				}
				return {
					id,
					text: h.textContent?.trim() || '',
					level
				} as Heading;
			})
			.filter(Boolean) as Heading[];

		headings = inRange;

		// Observe for active section highlighting
		if (observer) observer.disconnect();
		observer = new IntersectionObserver(
			(entries) => {
				// Pick the first heading crossing the viewport
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort(
						(a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop
					);

				if (visible.length) {
					activeId = (visible[0].target as HTMLElement).id;
				} else {
					// Fallback: find the last heading above the viewport
					const scrollY = window.scrollY || document.documentElement.scrollTop;
					let current: string | null = null;
					for (const h of inRange) {
						const el = document.getElementById(h.id);
						if (!el) continue;
						if (el.offsetTop <= scrollY + 80) {
							current = h.id;
						}
					}
					activeId = current;
				}
			},
			{
				// Trigger when heading gets to upper 30% of viewport
				root: null,
				rootMargin: '0px 0px -70% 0px',
				threshold: [0, 1.0]
			}
		);

		for (const h of inRange) {
			const el = document.getElementById(h.id);
			if (el) observer.observe(el);
		}
	});

	onDestroy(() => {
		if (observer) observer.disconnect();
	});

	function onClick(id: string) {
		const el = document.getElementById(id);
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<nav aria-label="İçindekiler" class="text-sm">
	<ul class="space-y-1">
		{#each headings as h, i}
			<li>
				<button
					type="button"
					onclick={() => onClick(h.id)}
					class={`block w-full text-left hover:underline ${
						activeId === h.id ? 'text-secondary' : 'text-text'
					}`}
					style={`padding-left: ${Math.max(0, (h.level - minLevel) * 12)}px`}
				>
					{h.text}
				</button>
			</li>
		{/each}
	</ul>
</nav>
