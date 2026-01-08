import { query, command } from '$app/server';
import { read } from '$app/server';
import type { RosterMember } from '$lib/types/roster';
import rosterFile from '$lib/data/roster.json?url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { dev } from '$app/environment';
import * as v from 'valibot';

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
		const asset = read(rosterFile);
		const text = await asset.text();
		const rosterData = JSON.parse(text) as RosterData | RosterMember[];

		let members: RosterMember[];
		let lastUpdated: number;
		let version: string;

		if (Array.isArray(rosterData)) {
			members = rosterData;
			lastUpdated = 0;
			version = '1.0.0';
		} else if (rosterData.members && Array.isArray(rosterData.members)) {
			members = rosterData.members;
			lastUpdated = rosterData.lastUpdated || 0;
			version = rosterData.version || '1.0.0';
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
		if (!existsSync(luaPath)) {
			return { hasUpdate: false, error: 'Lua file not found' };
		}

		const luaText = await readFile(luaPath, 'utf-8');
		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			return { hasUpdate: false, error: 'Could not parse Lua file' };
		}

		const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

		// Read current roster
		const asset = read(rosterFile);
		const text = await asset.text();
		const rosterData = JSON.parse(text) as RosterData | RosterMember[];
		
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
		if (!existsSync(luaPath)) {
			throw new Error('Lua file not found');
		}

		const luaText = await readFile(luaPath, 'utf-8');
		const luaData = parseLuaAutoExport(luaText);

		if (!luaData) {
			throw new Error('Could not parse Lua file');
		}

		const dataDir = join(process.cwd(), 'src', 'lib', 'data');
		const rostersDir = join(dataDir, 'rosters');

		if (!existsSync(dataDir)) {
			await mkdir(dataDir, { recursive: true });
		}
		if (!existsSync(rostersDir)) {
			await mkdir(rostersDir, { recursive: true });
		}

		// Read current roster
		const rosterPath = join(dataDir, 'roster.json');
		let currentMembers: RosterMember[] = [];
		let oldRosterData: any = null;

		if (existsSync(rosterPath)) {
			const rosterText = await readFile(rosterPath, 'utf-8');
			oldRosterData = JSON.parse(rosterText);

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

				if (!existsSync(historicalPath)) {
					await writeFile(historicalPath, JSON.stringify(oldRosterData, null, 2), 'utf-8');
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

		await writeFile(rosterPath, JSON.stringify(newRosterData, null, 2), 'utf-8');

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
		try {
			const dataDir = join(process.cwd(), 'src', 'lib', 'data');
			const rosterPath = join(dataDir, 'roster.json');

			const rosterData = {
				version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
				lastUpdated: lastUpdated,
				members: members
			};

			await writeFile(rosterPath, JSON.stringify(rosterData, null, 2), 'utf-8');

			// Update the query with the new data directly (no need to re-read from disk)
			getRoster().set(rosterData);

			return { success: true };
		} catch (error) {
			console.error('Error saving roster:', error);
			throw new Error(error instanceof Error ? error.message : 'Failed to save roster');
		}
	}
);

