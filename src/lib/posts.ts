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

export function getPosts(): Post[] {
 	const now = new Date();
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	return Object.entries(posts)
		.map(([path, post]) => {
			const slug = path.split('/').pop()?.replace('.svx', '');
			return {
				...(post as { metadata: Post }).metadata,
				slug: slug || ''
			};
		})
		.filter((post) => post.slug !== 'guildrules')
		.filter((post) => new Date(`${post.date}T00:00:00Z`) <= nowUTC)
		.sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1));
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
