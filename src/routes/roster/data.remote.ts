import { query, command } from '$app/server';
import type { RosterMember } from '$lib/types/roster';
import { join } from 'path';
import { dev } from '$app/environment';
import * as v from 'valibot';

// Import the roster data directly - this will be bundled in production
import rosterData from '$lib/data/roster.json';

interface RosterData {
	version?: string;
	lastUpdated?: number;
	members: RosterMember[];
}

function parseLuaAutoExport(luaText: string) {
	try {
		const startMarker = '["autoExportSave"] = "';
		const startIndex = luaText.indexOf(startMarker);
		if (startIndex === -1) return null;

		const jsonStart = startIndex + startMarker.length;
		let jsonEnd = -1;
		let searchPos = jsonStart;

		while (searchPos < luaText.length) {
			const quotePos = luaText.indexOf('",', searchPos);
			if (quotePos === -1) break;

			const nextChars = luaText.substring(quotePos + 2, quotePos + 10);
			if (nextChars.match(/^\s*\[/)) {
				jsonEnd = quotePos;
				break;
			}
			searchPos = quotePos + 2;
		}

		if (jsonEnd === -1) return null;

		let jsonString = luaText.substring(jsonStart, jsonEnd);
		jsonString = jsonString
			.replace(/\\n/g, '')
			.replace(/\\\\/g, '\\')
			.replace(/\\"/g, '"');

		return JSON.parse(jsonString);
	} catch (err) {
		console.error('Error parsing Lua file:', err);
		return null;
	}
}

export const getRoster = query(async () => {
	try {
		let data: RosterData | RosterMember[];

		// In production, use the imported/bundled data
		if (!dev) {
			data = rosterData;
		} else {
			// In dev mode, read from filesystem (allows live updates)
			const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');
			const file = Bun.file(rosterPath);
			const exists = await file.exists();

			if (!exists) {
				// Fallback to bundled data if file doesn't exist
				data = rosterData;
			} else {
				data = await file.json() as RosterData | RosterMember[];
			}
		}

		let members: RosterMember[];
		let lastUpdated: number;
		let version: string;

		if (Array.isArray(data)) {
			members = data;
			lastUpdated = 0;
			version = '1.0.0';
		} else if (data.members && Array.isArray(data.members)) {
			members = data.members;
			lastUpdated = data.lastUpdated || 0;
			version = data.version || '1.0.0';
		} else {
			throw new Error('Invalid roster data format');
		}

		return { members, lastUpdated, version };
	} catch (err) {
		console.error('Error loading roster:', err);
		throw new Error('Failed to load roster data');
	}
});
export const checkForUpdates = query(async () => {
	if (!dev) {
		return { hasUpdate: false, error: 'Only available in dev mode' };
	}

	try {
		const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
		const luaFile = Bun.file(luaPath);

		// Check if file exists
		const exists = await luaFile.exists();
		if (!exists) {
			return { hasUpdate: false, error: 'Lua file not found' };
		}

		const luaText = await luaFile.text();
		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			return { hasUpdate: false, error: 'Could not parse Lua file' };
		}

		const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

		// Read current roster
		const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');
		const rosterFile = Bun.file(rosterPath);
		const rosterData = await rosterFile.json() as RosterData | RosterMember[];

		let currentLastUpdated = 0;
		if (!Array.isArray(rosterData) && rosterData.lastUpdated) {
			currentLastUpdated = rosterData.lastUpdated;
		}

		return {
			hasUpdate: luaLastUpdated > currentLastUpdated,
			luaData,
			luaLastUpdated,
			currentLastUpdated
		};
	} catch (error) {
		console.error('Error checking for updates:', error);
		return { hasUpdate: false, error: 'Failed to check for updates' };
	}
});

export const applyUpdate = command(async () => {
	if (!dev) {
		throw new Error('Only available in dev mode');
	}

	try {
		const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
		const luaFile = Bun.file(luaPath);

		const exists = await luaFile.exists();
		if (!exists) {
			throw new Error('Lua file not found');
		}

		const luaText = await luaFile.text();
		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			throw new Error('Could not parse Lua file');
		}

		const dataDir = join(process.cwd(), 'src', 'lib', 'data');
		const rostersDir = join(dataDir, 'rosters');

		// Ensure directories exist using Bun's mkdir
		await Bun.write(join(dataDir, '.keep'), ''); // Creates dir if it doesn't exist
		await Bun.write(join(rostersDir, '.keep'), ''); // Creates dir if it doesn't exist

		// Read current roster
		const rosterPath = join(dataDir, 'roster.json');
		const rosterFile = Bun.file(rosterPath);
		let currentMembers: RosterMember[] = [];
		let oldRosterData: any = null;

		const rosterExists = await rosterFile.exists();
		if (rosterExists) {
			oldRosterData = await rosterFile.json();

			if (Array.isArray(oldRosterData)) {
				currentMembers = oldRosterData;
			} else if (oldRosterData.members && Array.isArray(oldRosterData.members)) {
				currentMembers = oldRosterData.members;
			}

			// Save historical snapshot
			if (oldRosterData.lastUpdated) {
				const oldTimestamp = new Date(oldRosterData.lastUpdated * 1000)
					.toISOString()
					.replace(/T/, '_')
					.replace(/:/g, '')
					.replace(/\..+/, '')
					.substring(0, 15);

				const historicalPath = join(rostersDir, `${oldTimestamp}.json`);
				const historicalFile = Bun.file(historicalPath);
				const historicalExists = await historicalFile.exists();

				if (!historicalExists) {
					await Bun.write(historicalPath, JSON.stringify(oldRosterData, null, 2));
					console.log(`Saved historical snapshot: ${oldTimestamp}`);
				}
			}
		}

		// Preserve existing roles
		const existingRoles = new Map();
		currentMembers.forEach((member: RosterMember) => {
			if (member.mainSpec && member.mainRole) {
				existingRoles.set(member.name, {
					spec: member.mainSpec,
					role: member.mainRole
				});
			}
		});

		// Merge
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

		const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

		const newRosterData = {
			version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
			lastUpdated: luaLastUpdated,
			members: merged
		};

		await Bun.write(rosterPath, JSON.stringify(newRosterData, null, 2));

		// Refresh the roster query after update
		await getRoster().refresh();

		return {
			success: true,
			memberCount: merged.length,
			rolesPreserved: existingRoles.size,
			lastUpdated: luaLastUpdated,
			historicalSnapshotSaved: !!oldRosterData?.lastUpdated
		};
	} catch (error) {
		console.error('Error updating roster:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to update roster');
	}
});

export const saveRoster = command(
	v.object({
		members: v.array(v.any()),
		lastUpdated: v.number()
	}),
	async ({ members, lastUpdated }) => {
		// Only allow saves in dev mode (production uses bundled data)
		if (!dev) {
			console.warn('Roster editing is only available in development mode');
			// Still update the query cache for optimistic UI
			const rosterData = {
				version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
				lastUpdated: lastUpdated,
				members: members
			};
			getRoster().set(rosterData);
			return { success: true, devOnly: true };
		}

		try {
			const dataDir = join(process.cwd(), 'src', 'lib', 'data');
			const rosterPath = join(dataDir, 'roster.json');

			const rosterData = {
				version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
				lastUpdated: lastUpdated,
				members: members
			};

			await Bun.write(rosterPath, JSON.stringify(rosterData, null, 2));
			getRoster().set(rosterData);

			return { success: true };
		} catch (error) {
			console.error('Error saving roster:', error);
			throw new Error(error instanceof Error ? error.message : 'Failed to save roster');
		}
	}
);
