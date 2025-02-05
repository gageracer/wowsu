type Post = {
	slug: string;
	title: string;
	date: string;
	img?: string;
	content?: string;
};

// Import all .svx files in the posts directory
const posts = import.meta.glob<{
  metadata: Post;
}>("/src/lib/posts/*.svx", {
	eager: true,
});

export function getPosts(): Post[] {
	return Object.entries(posts)
		.map(([path, post]) => {
			const slug = path.split("/").pop()?.replace(".svx", "");
			return {
				slug,
				...(post as { metadata: Post }).metadata,
			};
		})
		.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | undefined> {
	const path = `/src/lib/posts/${slug}.svx`;
	const post = posts[path];

	if (!post) return undefined;


	return {
		slug,
		content: post.default,
		...(post.metadata as any),
	};
}
