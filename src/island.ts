import {
  BUILDING_PLACEMENTS,
  BUILDING_REQUIREMENTS,
  ISLAND_REQUIREMENTS,
  OPEN_FERTILITY_SLOT,
  type BuildingId,
} from './calculations/building-data';
import type { Faction } from './calculations/population';
import {
  createFactionState,
  createInitialState,
  effectivePopulation,
  FACTION_CONFIGS,
  type CalculatorState,
  type EditableNumber,
  type FactionState,
} from './model';

export type IslandFactionState = FactionState & { recyclingCoverage: boolean };

export type IslandState = {
  id: string;
  name: string;
  settled: boolean;
  underwater: boolean;
  // Present fertility/deposit ids, plus OPEN_FERTILITY_SLOT when the island
  // still has a free slot a seed item can fill.
  fertilities: string[];
  factions: Record<Faction, IslandFactionState>;
  owned: Record<string, EditableNumber>;
  productivity: Record<string, EditableNumber>;
};

const islandFaction = (faction: Faction): IslandFactionState => ({
  ...createFactionState(faction),
  recyclingCoverage: false,
});

export function createIsland(name: string): IslandState {
  return {
    id: crypto.randomUUID(),
    name,
    settled: true,
    underwater: false,
    fertilities: [],
    factions: { eco: islandFaction('eco'), tycoon: islandFaction('tycoon'), tech: islandFaction('tech') },
    owned: {},
    productivity: {},
  };
}

const requirementById = new Map(ISLAND_REQUIREMENTS.map((requirement) => [requirement.id, requirement]));

export function canBuildOn(island: IslandState, buildingId: BuildingId): boolean {
  const placement = BUILDING_PLACEMENTS[buildingId];
  if (placement !== 'any'
    && (island.underwater ? placement !== 'underwater' : placement === 'underwater')) return false;
  const requirementId = BUILDING_REQUIREMENTS[buildingId];
  if (requirementId === undefined) return true;
  if (island.fertilities.includes(requirementId)) return true;
  // An open slot can be seeded with any land fertility.
  return requirementById.get(requirementId)!.seedable
    && island.fertilities.includes(OPEN_FERTILITY_SLOT);
}

export type AppState = { plan: CalculatorState; islands: IslandState[] };

export function createInitialAppState(): AppState {
  return { plan: createInitialState(), islands: [] };
}

export function ownedCount(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.owned[buildingId];
  return entry === undefined ? 0 : entry.value;
}

export function stepOwnedBuilding(
  island: IslandState,
  buildingId: BuildingId,
  delta: number,
): IslandState {
  const value = Math.max(0, (island.owned[buildingId]?.value ?? 0) + delta);
  return {
    ...island,
    owned: { ...island.owned, [buildingId]: { raw: String(value), value } },
  };
}

export function islandProductivity(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.productivity[buildingId];
  return entry === undefined ? 100 : entry.value;
}

export function islandPopulation(island: IslandState, faction: Faction): number[] | null {
  return effectivePopulation(faction, island.factions[faction]);
}

// Per-tier effective populations summed over settled islands — this is what
// feeds the plan's Auto values, so island tier limits and overrides propagate
// into global demand. Null per faction when any island's inputs are invalid.
export function sumIslandPopulations(islands: readonly IslandState[]): Record<Faction, number[] | null> {
  const sums: Record<Faction, number[] | null> = {
    eco: new Array<number>(FACTION_CONFIGS.eco.tierLabels.length).fill(0),
    tycoon: new Array<number>(FACTION_CONFIGS.tycoon.tierLabels.length).fill(0),
    tech: new Array<number>(FACTION_CONFIGS.tech.tierLabels.length).fill(0),
  };
  for (const island of islands) {
    if (!island.settled) continue;
    for (const faction of ['eco', 'tycoon', 'tech'] as const) {
      const current = sums[faction];
      if (current === null) continue;
      const population = islandPopulation(island, faction);
      sums[faction] = population === null
        ? null
        : current.map((total, tier) => total + population[tier]);
    }
  }
  return sums;
}

export function sumIslandHouses(islands: readonly IslandState[]): Record<Faction, number | null> {
  const sums: Record<Faction, number | null> = { eco: 0, tycoon: 0, tech: 0 };
  for (const island of islands) {
    if (!island.settled) continue;
    for (const faction of ['eco', 'tycoon', 'tech'] as const) {
      const value = island.factions[faction].houses?.value ?? null;
      sums[faction] = sums[faction] === null || value === null ? null : sums[faction] + value;
    }
  }
  return sums;
}
