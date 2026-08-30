import { islandPopulation, islandProductivity, type IslandState } from '../island';
import type { BuildingId } from './building-data';
import { CONSUMPTION, GOODS, producedGood, type GoodId } from './goods';

export const BALANCE_EPSILON = 1e-9;

export type GoodBalance = { capacity: number | null; demand: number | null; balance: number | null };
export type IslandBalances = Partial<Record<GoodId, GoodBalance>>;
export type TransferNeed = Readonly<{
  goodId: GoodId;
  surpluses: readonly Readonly<{ islandId: string; amount: number }>[];
  deficits: readonly Readonly<{ islandId: string; amount: number }>[];
  empireNet: number | null;
}>;

const add = (current: number | null | undefined, amount: number | null): number | null => {
  if (amount === null || current === null) return null;
  return (current ?? 0) + amount;
};

// The three separated components of a good's situation: what owned producers
// can make, what owned consumer buildings eat, and what the population eats.
export type GoodLoad = {
  capacity: number | null;
  intermediateDemand: number | null;
  finalDemand: number | null;
};
export type GoodLoads = Partial<Record<GoodId, GoodLoad>>;

export function islandGoodLoads(island: IslandState): GoodLoads {
  const capacity: Partial<Record<GoodId, number | null>> = {};
  const intermediate: Partial<Record<GoodId, number | null>> = {};
  const final: Partial<Record<GoodId, number | null>> = {};

  for (const [ownedId, entry] of Object.entries(island.owned)) {
    const buildingId = ownedId as BuildingId;
    const goodId = producedGood(buildingId);
    if (goodId === null) continue;
    const productivity = islandProductivity(island, buildingId);
    const output = entry.value === null || productivity === null
      ? null
      : entry.value * (productivity / 100)
        * GOODS.get(goodId)!.producers.find((producer) => producer.buildingId === buildingId)!.rate;
    capacity[goodId] = add(capacity[goodId], output);

    for (const input of CONSUMPTION.get(buildingId) ?? []) {
      const consumed = entry.value === null || productivity === null
        ? null
        : entry.value * (productivity / 100) * input.rate;
      intermediate[input.goodId] = add(intermediate[input.goodId], consumed);
    }
  }

  for (const good of GOODS.values()) {
    for (const finalDemand of good.finalDemands) {
      if (finalDemand.satisfaction.every((value) => value === 0)) continue;
      const population = islandPopulation(island, finalDemand.faction);
      const amount = population === null ? null : finalDemand.satisfaction.reduce((total, satisfied, tier) => {
        if (satisfied === 0) return total;
        const coverage = island.factions[finalDemand.faction].recyclingCoverage;
        const recyclingMultiplier = coverage && finalDemand.recyclable && tier > 0 ? 0.85 : 1;
        return total + population[tier] * recyclingMultiplier / satisfied;
      }, 0);
      if (amount === null || amount > 0) final[good.id] = add(final[good.id], amount);
    }
  }

  const loads: GoodLoads = {};
  for (const goodId of new Set([...Object.keys(capacity), ...Object.keys(intermediate), ...Object.keys(final)] as GoodId[])) {
    // undefined means untouched (0); null means invalid input and must survive.
    loads[goodId] = {
      capacity: capacity[goodId] === undefined ? 0 : capacity[goodId]!,
      intermediateDemand: intermediate[goodId] === undefined ? 0 : intermediate[goodId]!,
      finalDemand: final[goodId] === undefined ? 0 : final[goodId]!,
    };
  }
  return loads;
}

export function aggregateGoodLoads(islands: readonly IslandState[]): GoodLoads {
  const empire: GoodLoads = {};
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [goodId, load] of Object.entries(islandGoodLoads(island)) as [GoodId, GoodLoad][]) {
      const current = empire[goodId] ?? { capacity: 0, intermediateDemand: 0, finalDemand: 0 };
      empire[goodId] = {
        capacity: add(current.capacity, load.capacity),
        intermediateDemand: add(current.intermediateDemand, load.intermediateDemand),
        finalDemand: add(current.finalDemand, load.finalDemand),
      };
    }
  }
  return empire;
}

export function calculateIslandBalance(island: IslandState): IslandBalances {
  const balances: IslandBalances = {};
  for (const [goodId, load] of Object.entries(islandGoodLoads(island)) as [GoodId, GoodLoad][]) {
    const demand = add(load.intermediateDemand, load.finalDemand);
    balances[goodId] = {
      capacity: load.capacity,
      demand,
      balance: load.capacity === null || demand === null ? null : load.capacity - demand,
    };
  }
  return balances;
}

export function aggregateBalances(islands: readonly IslandState[]): IslandBalances {
  const empire: IslandBalances = {};
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [goodId, balance] of Object.entries(calculateIslandBalance(island)) as [GoodId, GoodBalance][]) {
      const current = empire[goodId] ?? { capacity: 0, demand: 0, balance: 0 };
      empire[goodId] = {
        capacity: add(current.capacity, balance.capacity),
        demand: add(current.demand, balance.demand),
        balance: add(current.balance, balance.balance),
      };
    }
  }
  return empire;
}

export function transferNeeds(islands: readonly IslandState[]): readonly TransferNeed[] {
  const perIsland = islands
    .filter((island) => island.settled)
    .map((island) => ({ island, balances: calculateIslandBalance(island) }));
  const goodIds = new Set(perIsland.flatMap(({ balances }) => Object.keys(balances)) as GoodId[]);

  const needs: TransferNeed[] = [];
  for (const goodId of goodIds) {
    const surpluses: { islandId: string; amount: number }[] = [];
    const deficits: { islandId: string; amount: number }[] = [];
    let empireNet: number | null = 0;
    for (const { island, balances } of perIsland) {
      const balance = balances[goodId]?.balance;
      if (balance === undefined) continue;
      empireNet = add(empireNet, balance);
      if (balance === null) continue;
      if (balance > BALANCE_EPSILON) surpluses.push({ islandId: island.id, amount: balance });
      if (balance < -BALANCE_EPSILON) deficits.push({ islandId: island.id, amount: -balance });
    }
    if (deficits.length > 0 && (surpluses.length > 0 || empireNet === null || empireNet < -BALANCE_EPSILON)) {
      needs.push({ goodId, surpluses, deficits, empireNet });
    }
  }
  return needs;
}
