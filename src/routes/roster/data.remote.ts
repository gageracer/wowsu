import { query, command } from '$app/server';
import type { RosterMember } from '$lib/types/roster';
import { dev } from '$app/environment';
import * as v from 'valibot';

// Import the roster data directly - this will be bundled in production
import rosterData from '$lib/data/roster.json';

// Raider.IO Role mapping
const RIO_ROLE_MAP: Record<string, 'Tank' | 'DPS' | 'Healer'> = {
	TANK: 'Tank',
	DPS: 'DPS',
	HEALING: 'Healer'
};

// Define Valibot schema for RosterMember
const RosterMemberSchema = v.looseObject({
	name: v.string(),
	rankName: v.string(),
	rankIndex: v.number(),
	level: v.number(),
	class: v.string(),
	zone: v.optional(v.nullable(v.string())),
	note: v.string(),
	officerNote: v.string(),
	status: v.number(),
	classFileName: v.string(),
	achievementPoints: v.number(),
	achievementRank: v.number(),
	lastOnline: v.number(),
	realmName: v.string(),
	mainSpec: v.optional(v.nullable(v.string())),
	mainRole: v.optional(
		v.nullable(v.union([v.literal('Tank'), v.literal('DPS'), v.literal('Healer')]))
	),
	// Raider.IO fields
	rioMythicPlusScore: v.optional(v.nullable(v.number())),
	rioRaidProgress: v.optional(v.nullable(v.string())),
	rioActiveSpecName: v.optional(v.nullable(v.string())),
	rioActiveSpecRole: v.optional(v.nullable(v.string())),
	rioProfileUrl: v.optional(v.nullable(v.string())),
	rioLastCrawled: v.optional(v.nullable(v.string()))
});

interface RosterData {
	version?: string;
	lastUpdated?: number;
	members: RosterMember[];
}
const luaPath = `${process.cwd()}/static/GuildRosterExport.lua`;
const dataDir = `${process.cwd()}/src/lib/data`;
const rosterPath = `${process.cwd()}/src/lib/data/roster.json`;

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
		jsonString = jsonString.replace(/\\n/g, '').replace(/\\\\/g, '\\').replace(/\\"/g, '"');

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
			const file = Bun.file(rosterPath);
			const exists = await file.exists();

			if (!exists) {
				// Fallback to bundled data if file doesn't exist
				data = rosterData;
			} else {
				data = (await file.json()) as RosterData | RosterMember[];
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
		const rosterFile = Bun.file(rosterPath);
		const rosterData = (await rosterFile.json()) as RosterData | RosterMember[];

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

		const rostersDir = `${dataDir}/rosters`;

		// Ensure directories exist using Bun's mkdir
		await Bun.write(`${dataDir}.keep`, ''); // Creates dir if it doesn't exist
		await Bun.write(`${rostersDir}.keep`, ''); // Creates dir if it doesn't exist

		// Read current roster
		const rosterFile = Bun.file(rosterPath);
		let currentMembers: RosterMember[] = [];
		let oldRosterData: RosterData;

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

				const historicalPath = `${rostersDir}/${oldTimestamp}.json`;
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
		members: v.array(RosterMemberSchema),
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
				members: members as RosterMember[]
			};
			getRoster().set(rosterData);
			return { success: true, devOnly: true };
		}

		try {
			const rosterData = {
				version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
				lastUpdated: lastUpdated,
				members: members
			};

			await Bun.write(rosterPath, JSON.stringify(rosterData, null, 2));
			getRoster().set(rosterData as RosterData);

			return { success: true };
		} catch (error) {
			console.error('Error saving roster:', error);
			throw new Error(error instanceof Error ? error.message : 'Failed to save roster');
		}
	}
);

// New function to fetch Raider.IO guild data
export const fetchRaiderIOGuildData = query(async () => {
	if (!dev) {
		return { success: false, error: 'Only available in dev mode' };
	}

	try {
		const apiKey = process.env.RAIDERIO_API_KEY;
		const region = process.env.RAIDERIO_GUILD_REGION || 'eu';
		const realm = process.env.RAIDERIO_GUILD_REALM || 'Executus';
		const guildName = process.env.RAIDERIO_GUILD_NAME || 'The Hive';

		if (!apiKey) {
			throw new Error('RAIDERIO_API_KEY not found in environment variables');
		}

		const url = `https://raider.io/api/v1/guilds/profile?access_key=${apiKey}&region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(guildName)}&fields=members`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Raider.IO API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		if (!data.members || !Array.isArray(data.members)) {
			throw new Error('Invalid response from Raider.IO API');
		}

		console.log(`Fetched ${data.members.length} members from Raider.IO`);

		return {
			success: true,
			members: data.members,
			lastCrawled: data.last_crawled_at
		};
	} catch (error) {
		console.error('Error fetching Raider.IO data:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch Raider.IO data'
		};
	}
});

// New command to apply Raider.IO data to roster
export const applyRaiderIOData = command(async () => {
	if (!dev) {
		throw new Error('Only available in dev mode');
	}

	try {
		// Fetch Raider.IO data
		const rioResult = await fetchRaiderIOGuildData();

		if (!rioResult.success || !rioResult.members) {
			throw new Error(rioResult.error || 'Failed to fetch Raider.IO data');
		}

		// Read current roster
		const rosterFile = Bun.file(rosterPath);
		const exists = await rosterFile.exists();

		if (!exists) {
			throw new Error('Roster file not found');
		}

		const currentRoster = (await rosterFile.json()) as RosterData;
		if (!currentRoster.members || !Array.isArray(currentRoster.members)) {
			throw new Error('Invalid roster data');
		}

		// Create a map of Raider.IO data by character name
		const rioDataMap = new Map();
		rioResult.members.forEach((rioMember: any) => {
			const char = rioMember.character;
			if (char && char.name) {
				rioDataMap.set(char.name.toLowerCase(), {
					rioActiveSpecName: char.active_spec_name,
					rioActiveSpecRole: char.active_spec_role,
					rioProfileUrl: char.profile_url,
					rioLastCrawled: char.last_crawled_at
					// Note: M+ score and raid progress would need additional API calls
					// with more specific fields in the query
				});
			}
		});

		// Merge Raider.IO data into roster
		let updatedCount = 0;
		let roleUpdatedCount = 0;

		const updatedMembers = currentRoster.members.map((member) => {
			const rioData = rioDataMap.get(member.name.toLowerCase());

			if (rioData) {
				updatedCount++;

				// Update mainRole and mainSpec from Raider.IO if not set
				const shouldUpdateRole = !member.mainRole && rioData.rioActiveSpecRole;
				if (shouldUpdateRole) {
					const mappedRole = RIO_ROLE_MAP[rioData.rioActiveSpecRole];
					if (mappedRole) {
						member.mainRole = mappedRole;
						roleUpdatedCount++;
					}
				}

				if (!member.mainSpec && rioData.rioActiveSpecName) {
					member.mainSpec = rioData.rioActiveSpecName;
				}

				return {
					...member,
					...rioData
				};
			}

			return member;
		});

		// Save updated roster
		const updatedRosterData = {
			...currentRoster,
			members: updatedMembers,
			lastUpdated: currentRoster.lastUpdated || Math.floor(Date.now() / 1000)
		};

		await Bun.write(rosterPath, JSON.stringify(updatedRosterData, null, 2));

		// Refresh the roster query
		await getRoster().refresh();

		return {
			success: true,
			updatedCount,
			roleUpdatedCount,
			totalMembers: updatedMembers.length,
			rioMembersFound: rioDataMap.size,
			lastCrawled: rioResult.lastCrawled
		};
	} catch (error) {
		console.error('Error applying Raider.IO data:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to apply Raider.IO data');
	}
});
