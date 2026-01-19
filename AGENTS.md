## btca

When you need up-to-date information about technologies used in this project, use btca to query source repositories directly.

**Available resources**: svelte, svelteKit, tailwindcss, vite, typescript, runed, valibot, vitest, playwright, mdsvex

### Usage

```bash
btca ask -r <resource> -q "<question>"
```

Use multiple `-r` flags to query multiple resources at once:

```bash
btca ask -r svelte -r runed -q "How do I use Svelte 5 runes with runed utilities?"
```

### Examples

```bash
# Query Svelte 5 documentation
btca ask -r svelte -q "How do snippets work in Svelte 5?"

# Query SvelteKit routing
btca ask -r svelteKit -q "How do I create dynamic routes with multiple parameters?"

# Query Tailwind CSS v4
btca ask -r tailwindcss -q "What's new in Tailwind CSS v4?"

# Query multiple resources
btca ask -r valibot -r typescript -q "How do I infer TypeScript types from Valibot schemas?"
```
