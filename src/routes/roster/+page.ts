import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { RosterData, RosterMember } from '$lib/types/roster';

function parseLuaAutoExport(luaText: string): RosterMember[] | null {
	try {
		// Find the start and end of autoExportSave
		const startMarker = '["autoExportSave"] = "';

		const startIndex = luaText.indexOf(startMarker);
		if (startIndex === -1) {
			console.warn('Could not find autoExportSave in Lua file');
			return null;
		}

		const jsonStart = startIndex + startMarker.length;

		// Look for the end - search for ",\n[" pattern
		let jsonEnd = -1;
		let searchPos = jsonStart;

		while (searchPos < luaText.length) {
			const quotePos = luaText.indexOf('",', searchPos);
			if (quotePos === -1) break;

			// Check if the next non-whitespace character after ", is a [
			const nextChars = luaText.substring(quotePos + 2, quotePos + 10);
			if (nextChars.match(/^\s*\[/)) {
				jsonEnd = quotePos;
				break;
			}

			searchPos = quotePos + 2;
		}

		if (jsonEnd === -1) {
			console.warn('Could not find end of autoExportSave');
			return null;
		}

		// Extract the JSON string
		let jsonString = luaText.substring(jsonStart, jsonEnd);

		// Handle Lua escaping
		jsonString = jsonString
			.replace(/\\n/g, '') // Remove \n markers
			.replace(/\\\\/g, '\\') // Replace \\\\ with \\
			.replace(/\\"/g, '"'); // Replace \" with "

		// Parse the JSON
		const data = JSON.parse(jsonString);
		return data;
	} catch (err) {
		console.error('Error parsing Lua file:', err);
		return null;
	}
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Load current roster
		const rosterResponse = await fetch('/roster.json');
		if (!rosterResponse.ok) {
			throw new Error('Failed to load roster data');
		}
		const rosterData = await rosterResponse.json();

		// Handle both old and new format
		let members: RosterMember[];
		let lastUpdated: number;
		let version: string;

		if (Array.isArray(rosterData)) {
			// Old format: just an array
			members = rosterData as RosterMember[];
			lastUpdated = 0;
			version = '1.0.0';
		} else if (rosterData.members && Array.isArray(rosterData.members)) {
			// New format: object with metadata
			members = rosterData.members as RosterMember[];
			lastUpdated = rosterData.lastUpdated || 0;
			version = rosterData.version || '1.0.0';
		} else {
			throw new Error('Invalid roster data format');
		}

		// Try to load Lua file for update checking
		let luaData: RosterMember[] | null = null;
		let luaLastUpdated: number | null = null;

		try {
			const luaResponse = await fetch('/GuildRosterExport.lua');
			if (luaResponse.ok) {
				const luaText = await luaResponse.text();
				luaData = parseLuaAutoExport(luaText);

				// Get the most recent lastOnline timestamp
				if (luaData && luaData.length > 0) {
					luaLastUpdated = Math.max(...luaData.map((m) => m.lastOnline));
				}
			}
		} catch (luaError) {
			console.warn('Could not load Lua file for update checking:', luaError);
		}

		return {
			members,
			lastUpdated,
			version,
			luaData,
			luaLastUpdated,
			hasUpdate: !!(luaLastUpdated && luaLastUpdated > lastUpdated)
		};
	} catch (err) {
		console.error('Error loading roster:', err);
		throw error(500, 'Failed to load roster data');
	}
};
