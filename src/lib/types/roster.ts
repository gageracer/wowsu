import type { Role } from '$lib/wow-specs';

export interface RosterMember {
	name: string;
	rankName: string;
	rankIndex: number;
	level: number;
	class: string;
	zone?: string;
	note: string;
	officerNote: string;
	status: number;
	classFileName: string;
	achievementPoints: number;
	achievementRank: number;
	lastOnline: number;
	realmName: string;
	mainSpec?: string;
	mainRole?: Role;
	// Raider.IO fields
	rioMythicPlusScore?: number;
	rioRaidProgress?: string;
	rioActiveSpecName?: string;
	rioActiveSpecRole?: string;
	rioProfileUrl?: string;
	rioLastCrawled?: string;
}

export interface RosterData {
	version: string;
	lastUpdated: number; // Unix timestamp
	members: RosterMember[];
}
