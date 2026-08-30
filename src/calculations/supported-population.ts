import { islandProductivity, sumIslandPopulations, type IslandState } from '../island';
import type { BuildingId } from './building-data';
import type { Faction } from './population';
import { CONSUMPTION, GOODS, producedGood, type GoodId } from './goods';
import { aggregateGoodLoads, BALANCE_EPSILON } from './island-balance';

// How much population the actual buildings can feed, assuming the current
// tier distribution scales proportionally. Chain shortages throttle
// downstream producers: a stage's run factor is limited by the worst supply
// ratio of its inputs, with shared inputs treated as evenly short for every
// consumer (a conservative approximation — consumers are assumed to demand
// at full rate).
export type GoodConstraint = Readonly<{
  goodId: GoodId;
  effectiveCapacity: number;
  // Unthrottled owned capacity: 0 means no producer built anywhere, which
  // separates "chain not started" from "built but outgrown or starved".
  nominalCapacity: number;
  intermediateDemand: number;
  finalDemand: number;
  scale: number;
}>;

export type SupportedPopulation = Readonly<{
  scale: number | null;
  limitingGood: GoodId | null;
  supported: Record<Faction, number[] | null>;
  scaleAfterNextBuilding: number | null;
  constraints: readonly GoodConstraint[];
}>;

// Empire-wide nominal capacity per producer building, in good units.
function capacityByBuilding(islands: readonly IslandState[]): Map<BuildingId, number | null> {
  const capacities = new Map<BuildingId, number | null>();
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [ownedId, entry] of Object.entries(island.owned)) {
      const buildingId = ownedId as BuildingId;
      const goodId = producedGood(buildingId);
      if (goodId === null) continue;
      const productivity = islandProductivity(island, buildingId);
      const rate = GOODS.get(goodId)!.producers.find((producer) => producer.buildingId === buildingId)!.rate;
      const output = entry.value === null || productivity === null
        ? null
        : entry.value * (productivity / 100) * rate;
      const current = capacities.get(buildingId);
      capacities.set(buildingId, current === null || output === null ? null : (current ?? 0) + output);
    }
  }
  return capacities;
}

export function effectiveCapacities(islands: readonly IslandState[]): Partial<Record<GoodId, number | null>> {
  const nominal = capacityByBuilding(islands);
  const loads = aggregateGoodLoads(islands);
  const memo = new Map<GoodId, number | null>();

  const effective = (goodId: GoodId): number | null => {
    if (memo.has(goodId)) return memo.get(goodId)!;
    memo.set(goodId, 0); // cycle guard; the production graph is validated acyclic
    let total: number | null = 0;
    for (const producer of GOODS.get(goodId)?.producers ?? []) {
      const capacity = nominal.get(producer.buildingId);
      if (capacity === undefined) continue;
      if (capacity === null || total === null) {
        total = null;
        continue;
      }
      let runFactor: number | null = 1;
      for (const input of CONSUMPTION.get(producer.buildingId) ?? []) {
        const demand = loads[input.goodId]?.intermediateDemand;
        if (demand === undefined || demand === 0) continue;
        if (demand === null) {
          runFactor = null;
          break;
        }
        const supply = effective(input.goodId);
        if (supply === null) {
          runFactor = null;
          break;
        }
        runFactor = Math.min(runFactor, supply / demand);
      }
      total = runFactor === null ? null : total + capacity * runFactor;
    }
    memo.set(goodId, total);
    return total;
  };

  const result: Partial<Record<GoodId, number | null>> = {};
  for (const goodId of GOODS.keys()) {
    if (nominal.size === 0) break;
    const value = effective(goodId);
    if (value !== 0 || goodId in loads) result[goodId] = value;
  }
  return result;
}

export type ThrottleCause = Readonly<{ goodId: GoodId; supply: number; demand: number }>;

// When a good's producers are chain-throttled (effective < nominal capacity),
// name the under-supplied input responsible — walked to the deepest shortage,
// so the fix ("build one of these") lands at the true bottleneck.
export function throttleCause(
  islands: readonly IslandState[],
  goodId: GoodId,
): ThrottleCause | null {
  const nominal = capacityByBuilding(islands);
  const loads = aggregateGoodLoads(islands);
  const capacities = effectiveCapacities(islands);

  const visit = (id: GoodId, seen: Set<GoodId>): ThrottleCause | null => {
    if (seen.has(id)) return null;
    seen.add(id);
    let worst: ThrottleCause | null = null;
    let worstRatio = 1;
    for (const producer of GOODS.get(id)?.producers ?? []) {
      if (!nominal.has(producer.buildingId)) continue;
      for (const input of CONSUMPTION.get(producer.buildingId) ?? []) {
        const demand = loads[input.goodId]?.intermediateDemand;
        if (demand === undefined || demand === null || demand === 0) continue;
        const supply = input.goodId in capacities ? capacities[input.goodId] : 0;
        if (supply === null || supply === undefined) continue;
        const ratio = supply / demand;
        if (ratio < worstRatio - BALANCE_EPSILON) {
          worstRatio = ratio;
          worst = { goodId: input.goodId, supply, demand };
        }
      }
    }
    if (worst === null) return null;
    return visit(worst.goodId, seen) ?? worst;
  };
  return visit(goodId, new Set());
}

export function calculateSupportedPopulation(islands: readonly IslandState[]): SupportedPopulation {
  const populations = sumIslandPopulations(islands);
  const unavailable: SupportedPopulation = {
    scale: null,
    limitingGood: null,
    supported: { eco: null, tycoon: null, tech: null },
    scaleAfterNextBuilding: null,
    constraints: [],
  };

  const loads = aggregateGoodLoads(islands);
  const capacities = effectiveCapacities(islands);

  // A null building count on a constraint good makes its effective capacity
  // null and bails to unavailable below, so skipping nulls here is safe.
  const nominal = new Map<GoodId, number>();
  for (const [buildingId, capacity] of capacityByBuilding(islands)) {
    if (capacity === null) continue;
    const goodId = producedGood(buildingId)!;
    nominal.set(goodId, (nominal.get(goodId) ?? 0) + capacity);
  }

  const constraints: GoodConstraint[] = [];
  for (const [goodId, load] of Object.entries(loads) as [GoodId, typeof loads[GoodId] & object][]) {
    if (load.finalDemand === 0) continue;
    // In-check: undefined means no producers (0); null means invalid input.
    const capacity = goodId in capacities ? capacities[goodId]! : 0;
    if (load.finalDemand === null || load.intermediateDemand === null || capacity === null) {
      return unavailable;
    }
    const available = Math.max(0, capacity - load.intermediateDemand);
    constraints.push({
      goodId,
      effectiveCapacity: capacity,
      nominalCapacity: nominal.get(goodId) ?? 0,
      intermediateDemand: load.intermediateDemand,
      finalDemand: load.finalDemand,
      scale: available / load.finalDemand,
    });
  }
  constraints.sort((left, right) => left.scale - right.scale);

  if (constraints.length === 0) return unavailable;

  const limiting = constraints[0];
  const scale = limiting.scale;

  const supported: Record<Faction, number[] | null> = { eco: null, tycoon: null, tech: null };
  for (const faction of ['eco', 'tycoon', 'tech'] as const) {
    const population = populations[faction];
    supported[faction] = population === null
      ? null
      : population.map((value) => Math.floor(value * scale + BALANCE_EPSILON));
  }

  // One more canonical producer of the limiting good adds one good unit —
  // but the bottleneck may then move to the next constraint in line.
  const nextAvailable = Math.max(0, limiting.effectiveCapacity + 1 - limiting.intermediateDemand);
  const relaxedScale = nextAvailable / limiting.finalDemand;
  const scaleAfterNextBuilding = constraints.length > 1
    ? Math.min(relaxedScale, constraints[1].scale)
    : relaxedScale;

  return {
    scale,
    limitingGood: limiting.goodId,
    supported,
    scaleAfterNextBuilding,
    constraints,
  };
}
