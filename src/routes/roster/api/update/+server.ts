import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { RosterMember } from '$lib/types/roster';

function parseLuaAutoExport(luaText: string) {
	try {
		// Find the start and end of autoExportSave
		const startMarker = '["autoExportSave"] = "';

		const startIndex = luaText.indexOf(startMarker);
		if (startIndex === -1) {
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

export const GET: RequestHandler = async () => {
	try {
		// Read the Lua file - only exists in dev mode
		const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
		if (!existsSync(luaPath)) {
			return json({ hasUpdate: false, error: 'Lua file not found' });
		}

		const luaText = await readFile(luaPath, 'utf-8');

		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			return json({ hasUpdate: false, error: 'Could not parse Lua file' });
		}

		// Get the most recent lastOnline timestamp
		const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

		// Read current roster to compare from lib folder
		const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');
		let currentLastUpdated = 0;

		if (existsSync(rosterPath)) {
			const rosterText = await readFile(rosterPath, 'utf-8');
			const rosterData = JSON.parse(rosterText);
			currentLastUpdated = rosterData.lastUpdated || 0;
		}

		return json({
			hasUpdate: luaLastUpdated > currentLastUpdated,
			luaData,
			luaLastUpdated,
			currentLastUpdated
		});
	} catch (error) {
		console.error('Error checking for updates:', error);
		return json({ hasUpdate: false, error: 'Failed to check for updates' });
	}
};

export const POST: RequestHandler = async () => {
	try {
		// Read the Lua file - only exists in dev mode
		const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
		if (!existsSync(luaPath)) {
			return json({ success: false, error: 'Lua file not found' }, { status: 404 });
		}

		const luaText = await readFile(luaPath, 'utf-8');

		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			return json({ success: false, error: 'Could not parse Lua file' }, { status: 400 });
		}

		// Ensure data directories exist
		const dataDir = join(process.cwd(), 'src', 'lib', 'data');
		const rostersDir = join(dataDir, 'rosters');

		if (!existsSync(dataDir)) {
			await mkdir(dataDir, { recursive: true });
		}
		if (!existsSync(rostersDir)) {
			await mkdir(rostersDir, { recursive: true });
		}

		// Read current roster to get existing role assignments AND save as historical
		const rosterPath = join(dataDir, 'roster.json');
		let currentMembers: RosterMember[] = [];
		let oldRosterData: any = null;

		if (existsSync(rosterPath)) {
			const rosterText = await readFile(rosterPath, 'utf-8');
			oldRosterData = JSON.parse(rosterText);

			// Handle both old and new format
			if (Array.isArray(oldRosterData)) {
				currentMembers = oldRosterData;
			} else if (oldRosterData.members && Array.isArray(oldRosterData.members)) {
				currentMembers = oldRosterData.members;
			}

			// Save the OLD roster as a historical snapshot BEFORE we overwrite it
			if (oldRosterData.lastUpdated) {
				const oldTimestamp = new Date(oldRosterData.lastUpdated * 1000)
					.toISOString()
					.replace(/T/, '_')
					.replace(/:/g, '')
					.replace(/\..+/, '')
					.substring(0, 15); // YYYY-MM-DD_HHMMSS format

				const historicalPath = join(rostersDir, `${oldTimestamp}.json`);

				// Only save if this timestamp doesn't already exist
				if (!existsSync(historicalPath)) {
					await writeFile(historicalPath, JSON.stringify(oldRosterData, null, 2), 'utf-8');
					console.log(`Saved historical snapshot: ${oldTimestamp}`);
				}
			}
		}

		// Create a map of existing roles
		const existingRoles = new Map();
		currentMembers.forEach((member: RosterMember) => {
			if (member.mainSpec && member.mainRole) {
				existingRoles.set(member.name, {
					spec: member.mainSpec,
					role: member.mainRole
				});
			}
		});

		// Merge: Apply existing roles to new roster
		const merged = luaData.map((newMember: any) => {
			const existingRole = existingRoles.get(newMember.name);
			if (existingRole) {
				return {
					...newMember,
					mainSpec: existingRole.spec,
					mainRole: existingRole.role
				};
			}
			return newMember;
		});

		// Get the most recent lastOnline timestamp
		const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

		// Create the new roster data with metadata
		const newRosterData = {
			version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
			lastUpdated: luaLastUpdated,
			members: merged
		};

		// Write the updated roster to the current roster file
		await writeFile(rosterPath, JSON.stringify(newRosterData, null, 2), 'utf-8');

		return json({
			success: true,
			memberCount: merged.length,
			rolesPreserved: existingRoles.size,
			lastUpdated: luaLastUpdated,
			historicalSnapshotSaved: !!oldRosterData?.lastUpdated
		});
	} catch (error) {
		console.error('Error updating roster:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update roster'
			},
			{ status: 500 }
		);
	}
};
