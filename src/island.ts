import type { BuildingId } from './calculations/building-data';
import type { Faction } from './calculations/population';
import {
  createFactionState,
  effectivePopulation,
  type EditableNumber,
  type FactionState,
} from './model';

export type FertilityState = 'present' | 'absent'; // missing key = unknown

export type IslandFactionState = FactionState & { recyclingCoverage: boolean };

export type IslandState = {
  id: string;
  name: string;
  settled: boolean;
  fertilities: Record<string, FertilityState>;
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
    fertilities: {},
    factions: { eco: islandFaction('eco'), tycoon: islandFaction('tycoon'), tech: islandFaction('tech') },
    owned: {},
    productivity: {},
  };
}

export function ownedCount(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.owned[buildingId];
  return entry === undefined ? 0 : entry.value;
}

export function islandProductivity(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.productivity[buildingId];
  return entry === undefined ? 100 : entry.value;
}

export function islandPopulation(island: IslandState, faction: Faction): number[] | null {
  return effectivePopulation(faction, island.factions[faction]);
}
