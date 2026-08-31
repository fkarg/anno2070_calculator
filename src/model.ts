import { applyPopulationOverrides, type Faction } from './calculations/population';
import type { IgnoredDemandSource } from './calculations/demand-policy';
import { PRODUCTION_NODES } from './calculations/production-data';

export type EditableNumber = {
  raw: string;
  value: number | null;
};

export type PopulationOverride = EditableNumber | null;

export type PopulationSettings = {
  livingSpace: boolean;
  senate: boolean;
  overrides: PopulationOverride[];
};

export type ResidenceFactionState = PopulationSettings & {
  houses: EditableNumber;
  maxTier: number;
};

export type FollowTierMode = 'mirror' | 'unrestricted';

export type TargetIntent =
  | Readonly<{ kind: 'follow'; tierMode: FollowTierMode }>
  | Readonly<{ kind: 'residences'; houses: EditableNumber; maxTier: number }>
  | Readonly<{ kind: 'population'; tier: number; count: EditableNumber }>;

export type PlanFactionState = PopulationSettings & { intent: TargetIntent };

export type FactionState = {
  houses: EditableNumber | null; // null = Auto: follow settled-island actuals
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
  overrides: PopulationOverride[];
};

export type FactionHouses = Record<Faction, number | null>;

export const NO_ISLAND_HOUSES: FactionHouses = { eco: 0, tycoon: 0, tech: 0 };

export function resolveHouses(state: FactionState, settledIslandHouses: number | null): EditableNumber {
  if (state.houses !== null) return state.houses;
  return settledIslandHouses === null
    ? { raw: '', value: null }
    : { raw: String(settledIslandHouses), value: settledIslandHouses };
}

export type CalculatorState = {
  factions: Record<Faction, PlanFactionState>;
  ignoredDemands: readonly IgnoredDemandSource[];
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
      eco: createPlanFactionState('eco'),
      tycoon: createPlanFactionState('tycoon'),
      tech: createPlanFactionState('tech'),
    },
    ignoredDemands: [],
    productivity: Object.fromEntries(
      PRODUCTION_NODES.map((node) => [node.id, { raw: '100', value: 100 }]),
    ),
    recycling: false,
    wholeBuildings: false,
  };
}

export function createFactionState(faction: Faction): FactionState {
  const tierCount = FACTION_CONFIGS[faction].tierLabels.length;
  return {
    houses: { raw: '0', value: 0 },
    maxTier: tierCount,
    livingSpace: false,
    senate: false,
    overrides: Array.from({ length: tierCount }, () => null),
  };
}

export function createResidenceFactionState(faction: Faction): ResidenceFactionState {
  const state = createFactionState(faction);
  return { ...state, houses: state.houses! };
}

export function createPlanFactionState(faction: Faction): PlanFactionState {
  const { livingSpace, senate, overrides } = createFactionState(faction);
  return { intent: { kind: 'follow', tierMode: 'mirror' }, livingSpace, senate, overrides };
}

export function effectivePopulation(
  faction: Faction,
  state: FactionState,
  settledIslandHouses: number | null = 0,
  settledIslandPopulation?: readonly number[] | null,
): number[] | null {
  if (state.overrides.some((override) => override !== null && override.value === null)) return null;

  // In Auto mode with island data, the per-tier island populations are the
  // base — island tier limits and overrides propagate into the plan. Plan
  // overrides pin counts only; house redistribution happens on the islands.
  if (state.houses === null && settledIslandPopulation !== undefined) {
    if (settledIslandPopulation === null) return null;
    return settledIslandPopulation.map((value, index) => state.overrides[index]?.value ?? value);
  }

  const houses = resolveHouses(state, settledIslandHouses);
  if (houses.value === null) return null;

  return applyPopulationOverrides({
    faction,
    houses: houses.value,
    maxTier: state.maxTier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  }, state.overrides.map((override) => override === null ? null : override.value));
}
