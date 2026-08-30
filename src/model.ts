import { calculatePopulation, type Faction } from './calculations/population';
import { PRODUCTION_NODES } from './calculations/production-data';

export type EditableNumber = {
  raw: string;
  value: number | null;
};

export type PopulationOverride = EditableNumber | null;

export type FactionState = {
  houses: EditableNumber;
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
  overrides: PopulationOverride[];
};

export type CalculatorState = {
  factions: Record<Faction, FactionState>;
  productivity: Record<string, EditableNumber>;
  recycling: boolean;
  wholeBuildings: boolean;
};

export type FactionConfig = {
  id: Faction;
  label: string;
  houseImage: string;
  tierLabels: readonly string[];
  tierImages: readonly string[];
  livingSpaceImage: string;
  livingSpaceLabel: string;
  senateImage: string;
  senateLabel: string;
};

const asset = (filename: string) => `/assets/${filename}`;

export const FACTION_CONFIGS: Record<Faction, FactionConfig> = {
  eco: {
    id: 'eco',
    label: 'Eco',
    houseImage: asset('house_eco_Qoor.png'),
    tierLabels: ['Workers', 'Employees', 'Engineers', 'Executives'],
    tierImages: ['eco_01_Qoor.png', 'eco_02_Qoor.png', 'eco_03_Qoor.png', 'eco_04_Qoor.png'].map(asset),
    livingSpaceImage: asset('channel_eco_5_Qoor.png'),
    livingSpaceLabel: '+12% living space',
    senateImage: asset('senate_eco_Qoor.png'),
    senateLabel: 'Increase Executives +5% (Senate bonus)',
  },
  tycoon: {
    id: 'tycoon',
    label: 'Tycoon',
    houseImage: asset('house_tycoon_Qoor.png'),
    tierLabels: ['Workers', 'Employees', 'Engineers', 'Executives'],
    tierImages: ['tycoon_01_Qoor.png', 'tycoon_02_Qoor.png', 'tycoon_03_Qoor.png', 'tycoon_04_Qoor.png'].map(asset),
    livingSpaceImage: asset('channel_tycoon_5_Qoor.png'),
    livingSpaceLabel: '+12% living space',
    senateImage: asset('senate_tycoon_Qoor.png'),
    senateLabel: 'Increase Executives +5% (Senate bonus)',
  },
  tech: {
    id: 'tech',
    label: 'Tech',
    houseImage: asset('house_tech_Qoor.png'),
    tierLabels: ['Lab Assistants', 'Researchers', 'Geniuses'],
    tierImages: ['tech_01_Qoor.png', 'tech_02_Qoor.png', 'tech_03_Qoor.png'].map(asset),
    livingSpaceImage: asset('channel_tech_5_Qoor.png'),
    livingSpaceLabel: '+12% living space',
    senateImage: asset('senate_tech_Qoor.png'),
    senateLabel: 'Increase Geniuses +5% (Senate bonus)',
  },
};

export const FACTIONS: readonly Faction[] = ['eco', 'tycoon', 'tech'];

export function parseNonNegativeInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function parsePositiveNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function createInitialState(): CalculatorState {
  return {
    factions: {
      eco: createFactionState('eco'),
      tycoon: createFactionState('tycoon'),
      tech: createFactionState('tech'),
    },
    productivity: Object.fromEntries(
      PRODUCTION_NODES.map((node) => [node.id, { raw: '100', value: 100 }]),
    ),
    recycling: false,
    wholeBuildings: false,
  };
}

function createFactionState(faction: Faction): FactionState {
  const tierCount = FACTION_CONFIGS[faction].tierLabels.length;
  return {
    houses: { raw: '0', value: 0 },
    maxTier: tierCount,
    livingSpace: false,
    senate: false,
    overrides: Array.from({ length: tierCount }, () => null),
  };
}

export function derivePopulation(faction: Faction, state: FactionState): number[] | null {
  if (state.houses.value === null) return null;
  return calculatePopulation({
    faction,
    houses: state.houses.value,
    maxTier: state.maxTier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  });
}

export function effectivePopulation(
  faction: Faction,
  state: FactionState,
): number[] | null {
  const derived = derivePopulation(faction, state);
  if (derived === null) return null;

  return derived.map((value, index) => {
    const override = state.overrides[index];
    return override === null ? value : override.value;
  }).every((value): value is number => value !== null)
    ? derived.map((value, index) => state.overrides[index]?.value ?? value)
    : null;
}

export function effectivePopulations(
  state: CalculatorState,
): Record<Faction, readonly number[]> | null {
  const eco = effectivePopulation('eco', state.factions.eco);
  const tycoon = effectivePopulation('tycoon', state.factions.tycoon);
  const tech = effectivePopulation('tech', state.factions.tech);

  return eco && tycoon && tech ? { eco, tycoon, tech } : null;
}
