import { sumIslandPopulations, type IslandState } from '../island';
import type { BuildingId } from './building-data';
import {
  isDemandIgnored,
  maskSatisfaction,
  type IgnoredDemandSource,
} from './demand-policy';
import { tierCapacities, type Faction } from './population';
import { GOODS, producedGood, type GoodId } from './goods';
import { aggregateGoodLoads } from './island-balance';
import { demandUnlocks } from './progression';
import { effectiveCapacities } from './supported-population';

// Coverage: how well actuals cover current demand, per good. Surplus: what is
// left for *additional* population after both intermediate and current final
// demand are served — the basis of headroom and ascension support. Marginal
// demands use unreduced rates (no recycling assumption for new inhabitants).

export type GoodCoverage = Readonly<{
  goodId: GoodId;
  available: number;      // effective capacity minus intermediate demand
  finalDemand: number;
  coverage: number;       // available / finalDemand, capped at 1
  ratio: number;          // uncapped
}>;

type Surplus = Partial<Record<GoodId, number | null>>;

function surpluses(
  islands: readonly IslandState[],
  ignoredDemands: readonly IgnoredDemandSource[],
): Surplus {
  const loads = aggregateGoodLoads(islands, ignoredDemands);
  const capacities = effectiveCapacities(islands, ignoredDemands);
  const result: Surplus = {};
  for (const [goodId, load] of Object.entries(loads) as [GoodId, NonNullable<typeof loads[GoodId]>][]) {
    const capacity = goodId in capacities ? capacities[goodId]! : 0;
    result[goodId] = capacity === null || load.intermediateDemand === null || load.finalDemand === null
      ? null
      : Math.max(0, capacity - load.intermediateDemand - load.finalDemand);
  }
  return result;
}

export function calculateCoverage(
  islands: readonly IslandState[],
  ignoredDemands: readonly IgnoredDemandSource[],
): Partial<Record<GoodId, GoodCoverage | null>> {
  const loads = aggregateGoodLoads(islands, ignoredDemands);
  const capacities = effectiveCapacities(islands, ignoredDemands);
  const result: Partial<Record<GoodId, GoodCoverage | null>> = {};
  for (const [goodId, load] of Object.entries(loads) as [GoodId, NonNullable<typeof loads[GoodId]>][]) {
    if (load.finalDemand === 0) continue;
    const capacity = goodId in capacities ? capacities[goodId]! : 0;
    if (capacity === null || load.intermediateDemand === null || load.finalDemand === null) {
      result[goodId] = null;
      continue;
    }
    const available = Math.max(0, capacity - load.intermediateDemand);
    const ratio = available / load.finalDemand;
    result[goodId] = { goodId, available, finalDemand: load.finalDemand, coverage: Math.min(1, ratio), ratio };
  }
  return result;
}

// Marginal demand of one inhabitant of the tier, per good, in good units.
function perInhabitantDemands(
  faction: Faction,
  tier: number,
  population: readonly number[] | null,
  ignoredDemands: readonly IgnoredDemandSource[],
): Map<GoodId, number> | null {
  if (population === null) return null;
  const demands = new Map<GoodId, number>();
  for (const good of GOODS.values()) {
    for (const finalDemand of good.finalDemands) {
      if (finalDemand.faction !== faction) continue;
      const satisfaction = maskSatisfaction({
        goodId: good.id,
        faction: finalDemand.faction,
        satisfaction: finalDemand.satisfaction,
        unlockAt: finalDemand.unlockAt,
        population,
        ignored: ignoredDemands,
      });
      const satisfied = satisfaction[tier];
      if (satisfied !== undefined && satisfied > 0) demands.set(good.id, 1 / satisfied);
    }
  }
  return demands;
}

export type TierHeadroom = Readonly<{
  additional: number;
  limitingGood: GoodId;
  reason: 'capacity' | 'unlock';
}>;

// Goods with at least one owned producer anywhere. Unbuilt chains are known
// future work (listed separately); headroom answers how far the chains the
// player actually operates can carry additional population.
function builtGoods(islands: readonly IslandState[]): ReadonlySet<GoodId> {
  const built = new Set<GoodId>();
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned)) {
      const goodId = producedGood(buildingId as BuildingId);
      if (goodId !== null && entry.value !== 0) built.add(goodId);
    }
  }
  return built;
}

export function tierHeadroom(
  islands: readonly IslandState[],
  faction: Faction,
  tier: number,
  ignoredDemands: readonly IgnoredDemandSource[],
): TierHeadroom | null {
  const population = sumIslandPopulations(islands)[faction];
  const demands = perInhabitantDemands(
    faction,
    tier,
    population,
    ignoredDemands,
  );
  if (demands === null) return null;
  if (demands.size === 0) return null;
  const surplus = surpluses(islands, ignoredDemands);
  const built = builtGoods(islands);

  let additional = Infinity;
  let limitingGood: GoodId | null = null;
  let reason: TierHeadroom['reason'] = 'capacity';
  for (const [goodId, perInhabitant] of demands) {
    if (!built.has(goodId)) continue;
    const available = goodId in surplus ? surplus[goodId]! : 0;
    if (available === null) return null;
    const supportable = available / perInhabitant;
    if (supportable < additional) {
      additional = supportable;
      limitingGood = goodId;
    }
  }
  if (limitingGood === null || population === null) return null;

  const higherTierOccupied = population.slice(tier + 1).some((value) => value > 0);
  if (!higherTierOccupied) {
    for (const unlock of demandUnlocks(faction, tier + 1)) {
      if (isDemandIgnored(ignoredDemands, faction, tier, unlock.goodId)) continue;
      const untilUnlock = unlock.population - population[tier];
      if (untilUnlock > 0 && untilUnlock < additional) {
        additional = untilUnlock;
        limitingGood = unlock.goodId;
        reason = 'unlock';
      }
    }
  }
  return { additional, limitingGood, reason };
}

export type AscensionSupport = Readonly<{ ascensions: number; limitingGood: GoodId | null }>;

// The global living-space bonus is mirrored onto every island's faction state,
// so any settled island carries the authoritative flag.
function globalLivingSpace(islands: readonly IslandState[], faction: Faction): boolean {
  return islands[0]?.factions[faction].livingSpace ?? false;
}

export function supportedAscensions(
  islands: readonly IslandState[],
  faction: Faction,
  fromTier: number,
  ignoredDemands: readonly IgnoredDemandSource[],
): AscensionSupport | null {
  const capacities = tierCapacities(faction, globalLivingSpace(islands, faction));
  if (fromTier + 1 >= capacities.length) return null;
  const population = sumIslandPopulations(islands)[faction];
  const from = perInhabitantDemands(faction, fromTier, population, ignoredDemands);
  const to = perInhabitantDemands(faction, fromTier + 1, population, ignoredDemands);
  if (from === null || to === null) return null;

  // Net demand change per ascending house, per good.
  const deltas = new Map<GoodId, number>();
  for (const [goodId, perInhabitant] of to) {
    deltas.set(goodId, perInhabitant * capacities[fromTier + 1]);
  }
  for (const [goodId, perInhabitant] of from) {
    deltas.set(goodId, (deltas.get(goodId) ?? 0) - perInhabitant * capacities[fromTier]);
  }

  const surplus = surpluses(islands, ignoredDemands);
  let ascensions = Infinity;
  let limitingGood: GoodId | null = null;
  for (const [goodId, delta] of deltas) {
    if (delta <= 0) continue;
    const available = goodId in surplus ? surplus[goodId]! : 0;
    if (available === null) return null;
    const supportable = available / delta;
    if (supportable < ascensions) {
      ascensions = supportable;
      limitingGood = goodId;
    }
  }
  if (ascensions === Infinity) return { ascensions: Infinity, limitingGood: null };
  return { ascensions: Math.floor(ascensions + 1e-9), limitingGood };
}
