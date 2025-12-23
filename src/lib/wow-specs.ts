export type Role = 'Tank' | 'DPS' | 'Healer';

export interface Spec {
	name: string;
	role: Role;
	icon: string;
}

export interface ClassSpecs {
	[className: string]: Spec[];
}

export const WOW_SPECS: ClassSpecs = {
	WARRIOR: [
		{ name: 'Arms', role: 'DPS', icon: '/roles/Ability_warrior_savageblow.webp' },
		{ name: 'Fury', role: 'DPS', icon: '/roles/Ability_warrior_innerrage.webp' },
		{ name: 'Protection', role: 'Tank', icon: '/roles/Ability_warrior_defensivestance.webp' }
	],
	PALADIN: [
		{ name: 'Holy', role: 'Healer', icon: '/roles/Spell_holy_holybolt.webp' },
		{ name: 'Protection', role: 'Tank', icon: '/roles/Ability_paladin_shieldofthetemplar.webp' },
		{ name: 'Retribution', role: 'DPS', icon: '/roles/Spell_holy_auraoflight.webp' }
	],
	HUNTER: [
		{ name: 'Beast Mastery', role: 'DPS', icon: '/roles/Ability_hunter_bestialdiscipline.webp' },
		{ name: 'Marksmanship', role: 'DPS', icon: '/roles/Ability_hunter_focusedaim.webp' },
		{ name: 'Survival', role: 'DPS', icon: '/roles/Ability_hunter_camouflage.webp' }
	],
	ROGUE: [
		{ name: 'Assassination', role: 'DPS', icon: '/roles/Ability_rogue_deadlybrew.webp' },
		{ name: 'Outlaw', role: 'DPS', icon: '/roles/Inv_sword_30.webp' },
		{ name: 'Subtlety', role: 'DPS', icon: '/roles/Ability_stealth.webp' }
	],
	PRIEST: [
		{ name: 'Discipline', role: 'Healer', icon: '/roles/Spell_holy_powerwordshield.webp' },
		{ name: 'Holy', role: 'Healer', icon: '/roles/Spell_holy_guardianspirit.webp' },
		{ name: 'Shadow', role: 'DPS', icon: '/roles/Spell_shadow_shadowwordpain.webp' }
	],
	DEATHKNIGHT: [
		{ name: 'Blood', role: 'Tank', icon: '/roles/Spell_deathknight_bloodpresence.webp' },
		{ name: 'Frost', role: 'DPS', icon: '/roles/Spell_deathknight_frostpresence.webp' },
		{ name: 'Unholy', role: 'DPS', icon: '/roles/Spell_deathknight_unholypresence.webp' }
	],
	SHAMAN: [
		{ name: 'Elemental', role: 'DPS', icon: '/roles/Spell_nature_lightning.webp' },
		{ name: 'Enhancement', role: 'DPS', icon: '/roles/Spell_shaman_improvedstormstrike.webp' },
		{ name: 'Restoration', role: 'Healer', icon: '/roles/Spell_nature_magicimmunity.webp' }
	],
	MAGE: [
		{ name: 'Arcane', role: 'DPS', icon: '/roles/Spell_holy_magicalsentry.webp' },
		{ name: 'Fire', role: 'DPS', icon: '/roles/Spell_fire_firebolt02.webp' },
		{ name: 'Frost', role: 'DPS', icon: '/roles/Spell_frost_frostbolt02.webp' }
	],
	WARLOCK: [
		{ name: 'Affliction', role: 'DPS', icon: '/roles/Spell_shadow_deathcoil.webp' },
		{ name: 'Demonology', role: 'DPS', icon: '/roles/Spell_shadow_metamorphosis.webp' },
		{ name: 'Destruction', role: 'DPS', icon: '/roles/Spell_shadow_rainoffire.webp' }
	],
	MONK: [
		{ name: 'Brewmaster', role: 'Tank', icon: '/roles/Spell_monk_brewmaster_spec.webp' },
		{ name: 'Mistweaver', role: 'Healer', icon: '/roles/Spell_monk_mistweaver_spec.webp' },
		{ name: 'Windwalker', role: 'DPS', icon: '/roles/Spell_monk_windwalker_spec.webp' }
	],
	DRUID: [
		{ name: 'Balance', role: 'DPS', icon: '/roles/Spell_nature_starfall.webp' },
		{ name: 'Feral', role: 'DPS', icon: '/roles/Ability_druid_catform.webp' },
		{ name: 'Guardian', role: 'Tank', icon: '/roles/Ability_racial_bearform.webp' },
		{ name: 'Restoration', role: 'Healer', icon: '/roles/Spell_nature_healingtouch.webp' }
	],
	DEMONHUNTER: [
		{ name: 'Havoc', role: 'DPS', icon: '/roles/Ability_demonhunter_specdps.webp' },
		{ name: 'Vengeance', role: 'Tank', icon: '/roles/Ability_demonhunter_spectank.webp' },
		{ name: 'Devourer', role: 'DPS', icon: '/roles/classicon_demonhunter_void.webp' }
	],
	EVOKER: [
		{ name: 'Devastation', role: 'DPS', icon: '/roles/Classicon_evoker_devastation.webp' },
		{ name: 'Preservation', role: 'Healer', icon: '/roles/Classicon_evoker_preservation.webp' },
		{ name: 'Augmentation', role: 'DPS', icon: '/roles/Classicon_evoker_devastation.webp' }
	]
};

export const CLASS_ICONS: Record<string, string> = {
	DEATHKNIGHT: '/roles/ClassIcon_deathknight.webp',
	DEMONHUNTER: '/roles/ClassIcon_demon_hunter.webp',
	DRUID: '/roles/ClassIcon_druid.webp',
	EVOKER: '/roles/ClassIcon_evoker.webp',
	HUNTER: '/roles/ClassIcon_hunter.webp',
	MAGE: '/roles/ClassIcon_mage.webp',
	MONK: '/roles/ClassIcon_monk.webp',
	PALADIN: '/roles/ClassIcon_paladin.webp',
	PRIEST: '/roles/ClassIcon_priest.webp',
	ROGUE: '/roles/ClassIcon_rogue.webp',
	SHAMAN: '/roles/ClassIcon_shaman.webp',
	WARLOCK: '/roles/ClassIcon_warlock.webp',
	WARRIOR: '/roles/ClassIcon_warrior.webp'
};

export const ROLE_COLORS: Record<Role, string> = {
	Tank: 'text-blue-400',
	DPS: 'text-red-400',
	Healer: 'text-green-400'
};

export const ROLE_ICONS: Record<Role, string> = {
	Tank: '/roles/Tank_icon.webp',
	DPS: '/roles/Dps_icon.webp',
	Healer: '/roles/Healer_icon.webp'
};

// Class colors from Wowpedia: https://wowpedia.fandom.com/wiki/Class_colors
export const CLASS_COLORS: Record<string, string> = {
	DEATHKNIGHT: '#C41E3A',
	DEMONHUNTER: '#A330C9',
	DRUID: '#FF7C0A',
	EVOKER: '#33937F',
	HUNTER: '#AAD372',
	MAGE: '#3FC7EB',
	MONK: '#00FF98',
	PALADIN: '#F48CBA',
	PRIEST: '#FFFFFF',
	ROGUE: '#FFF468',
	SHAMAN: '#0070DD',
	WARLOCK: '#8788EE',
	WARRIOR: '#C69B6D'
};

export function getSpecsForClass(className: string): Spec[] {
	return WOW_SPECS[className.toUpperCase()] || [];
}

export function getRoleForSpec(className: string, specName: string): Role | null {
	const specs = getSpecsForClass(className);
	const spec = specs.find((s) => s.name === specName);
	return spec?.role || null;
}

export function getSpecIcon(className: string, specName: string): string | null {
	const specs = getSpecsForClass(className);
	const spec = specs.find((s) => s.name === specName);
	return spec?.icon || null;
}

export function getClassIcon(className: string): string {
	return CLASS_ICONS[className.toUpperCase()] || '';
}

export function getClassColor(className: string): string {
	return CLASS_COLORS[className.toUpperCase()] || '#FFFFFF';
}
