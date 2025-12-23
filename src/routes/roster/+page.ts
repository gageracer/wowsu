import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/roster.json');
		if (!response.ok) {
			throw new Error('Failed to load roster data');
		}
		const roster = await response.json();
		return { roster };
	} catch (err) {
		console.error('Error loading roster:', err);
		throw error(500, 'Failed to load roster data');
	}
};
