import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Note: This approach won't work in production on Vercel (read-only filesystem)
// You'll need a database or external storage for production
// For now, this will work in development

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, mainSpec, mainRole } = await request.json();

		if (!name || !mainSpec || !mainRole) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// In development, we can use fs, but in production on Vercel this won't work
		if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
			const { readFile, writeFile } = await import('fs/promises');
			const { join } = await import('path');

			const ROSTER_PATH = join(process.cwd(), 'static', 'roster.json');

			// Read current roster
			const rosterData = await readFile(ROSTER_PATH, 'utf-8');
			const roster = JSON.parse(rosterData);

			// Find and update the member
			const memberIndex = roster.findIndex((m: any) => m.name === name);

			if (memberIndex === -1) {
				return json({ error: 'Member not found' }, { status: 404 });
			}

			// Update the member
			roster[memberIndex] = {
				...roster[memberIndex],
				mainSpec,
				mainRole
			};

			// Write back to file
			await writeFile(ROSTER_PATH, JSON.stringify(roster, null, 2), 'utf-8');

			return json({ success: true, member: roster[memberIndex] });
		}

		return json({ error: 'Not supported in production. Use a database.' }, { status: 501 });
	} catch (err) {
		console.error('Error updating roster:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
