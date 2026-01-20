import type { Component } from 'svelte';

type Post = {
	slug: string;
	title: string;
	date: string;
	img?: string;
	content?: Component;
};
type PostModule = {
	metadata: Post;
	default: Component;
};

// Import all .svx files in the posts directory
const posts = import.meta.glob<{
	metadata: Post;
}>('/src/lib/posts/*.svx', {
	eager: true
});

/**
 * Normalize date string to UTC midnight
 * Handles dates like '2025-2-18' and converts to proper ISO format
 */
function parsePostDate(dateStr: string): Date {
	const parts = dateStr.split('-');
	if (parts.length !== 3) return new Date(dateStr); // fallback
	
	const year = parts[0];
	const month = parts[1].padStart(2, '0');
	const day = parts[2].padStart(2, '0');
	
	return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

export function getPosts(): Post[] {
	// Get current timestamp for comparison
	const now = new Date();
	
	return Object.entries(posts)
		.map(([path, post]) => {
			const slug = path.split('/').pop()?.replace('.svx', '');
			return {
				...(post as { metadata: Post }).metadata,
				slug: slug || ''
			};
		})
		.filter((post) => post.slug !== 'guildrules')
		// Parse post date as UTC midnight and compare with current time
		.filter((post) => parsePostDate(post.date) <= now)
		.sort((a, b) => (parsePostDate(a.date) < parsePostDate(b.date) ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | undefined> {
	const path = `/src/lib/posts/${slug}.svx`;
	const post = posts[path];

	if (!post) return undefined;

	return {
		...(post as { metadata: Post }).metadata,
		content: (post as PostModule).default,
		slug
	};
}
