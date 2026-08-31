import type { PlanFactionState, TargetIntent } from '../model';
import {
  applyPopulationOverrides,
  calculatePopulation,
  tierCapacities,
  type Faction,
} from './population';

export type ResolvedPopulationTarget = Readonly<{
  intent: TargetIntent;
  houses: number;
  maxTier: number;
  normalPopulations: readonly number[];
  effectivePopulations: readonly number[];
  requested: number | null;
  achieved: number;
  overshoot: number;
  targetMetAfterOverrides: boolean;
}>;

function population(
  faction: Faction,
  state: PlanFactionState,
  houses: number,
  maxTier: number,
): number[] {
  return calculatePopulation({
    faction,
    houses,
    maxTier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  });
}

function minimumHouses(
  faction: Faction,
  state: PlanFactionState,
  tier: number,
  requested: number,
): number | null {
  if (requested === 0) return 0;
  const maximumCapacity = Math.max(...tierCapacities(faction, state.livingSpace));
  const safeLimit = Math.floor(Number.MAX_SAFE_INTEGER / maximumCapacity);
  const at = (houses: number) => population(faction, state, houses, tier)[tier - 1];

  let high = 1;
  while (high < safeLimit && at(high) < requested) high = Math.min(safeLimit, high * 2);
  if (!Number.isSafeInteger(at(high)) || at(high) < requested) return null;

  let low = 0;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (at(middle) >= requested) high = middle;
    else low = middle + 1;
  }
  return low;
}

export function resolvePopulationTarget(
  faction: Faction,
  state: PlanFactionState,
  islandHouses: number | null,
  islandPopulations: readonly number[] | null,
): ResolvedPopulationTarget | null {
  if (state.intent.kind === 'follow') {
    if (islandHouses === null || islandPopulations === null) return null;
    const maxTier = Math.max(
      1,
      islandPopulations.reduce((top, value, tier) => value > 0 ? tier + 1 : top, 1),
    );
    return {
      intent: state.intent,
      houses: islandHouses,
      maxTier,
      normalPopulations: islandPopulations,
      effectivePopulations: islandPopulations,
      requested: null,
      achieved: islandPopulations[maxTier - 1],
      overshoot: 0,
      targetMetAfterOverrides: true,
    };
  }

  if (state.overrides.some((entry) => entry !== null && entry.value === null)) return null;

  const maxTier = state.intent.kind === 'residences' ? state.intent.maxTier : state.intent.tier;
  const houses = state.intent.kind === 'residences'
    ? state.intent.houses.value
    : state.intent.count.value === null
      ? null
      : minimumHouses(faction, state, maxTier, state.intent.count.value);
  if (houses === null) return null;

  const normal = population(faction, state, houses, maxTier);
  if (normal.some((value) => !Number.isSafeInteger(value))) return null;
  const effective = applyPopulationOverrides({
    faction,
    houses,
    maxTier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  }, state.overrides.map((entry) => entry?.value ?? null));
  const requested = state.intent.kind === 'population' ? state.intent.count.value : null;
  const achieved = normal[maxTier - 1];

  return {
    intent: state.intent,
    houses,
    maxTier,
    normalPopulations: normal,
    effectivePopulations: effective,
    requested,
    achieved,
    overshoot: requested === null ? 0 : achieved - requested,
    targetMetAfterOverrides: requested === null || effective[maxTier - 1] >= requested,
  };
}
