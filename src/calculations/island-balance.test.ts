import { describe, expect, test } from 'vitest';

import { createIsland, sumIslandPopulations, type IslandState } from '../island';
import type { EditableNumber } from '../model';
import type { IgnoredDemandSource } from './demand-policy';
import { aggregateBalances, aggregateGoodLoads, calculateIslandBalance, islandGoodLoads, transferNeeds } from './island-balance';

const editable = (value: number): EditableNumber => ({ raw: String(value), value });
const ignoredBionics = [
  { faction: 'tech' as const, tier: 2, goodId: 'bionicsFactory' as const },
];

const withOwned = (owned: Record<string, number>, productivity: Record<string, number> = {}) => ({
  ...createIsland('A'),
  owned: Object.fromEntries(Object.entries(owned).map(([id, value]) => [id, editable(value)])),
  productivity: Object.fromEntries(
    Object.entries(productivity).map(([id, value]) => [id, editable(value)]),
  ),
});
const balance = (island: IslandState, ignored: readonly IgnoredDemandSource[] = []) => (
  calculateIslandBalance(island, sumIslandPopulations([island]), ignored)
);

describe('calculateIslandBalance', () => {
  test('capacity scales with owned count, producer rate, and productivity', () => {
    const balances = balance(withOwned({ electronicsRecycler: 2 }, { electronicsRecycler: 50 }));
    // 2 recyclers at 50% at rate 1.5 = 1.5 chip-factory units.
    expect(balances.chipFactory?.capacity).toBeCloseTo(1.5, 9);
  });

  test('owned consumers place intermediate demand on their own island', () => {
    const balances = balance(withOwned({ chipFactory: 2 }));
    expect(balances.copperMine?.demand).toBeCloseTo(1, 9); // 2 × 0.5
    expect(balances.sandExtractor?.demand).toBeCloseTo(2 / 3, 9);
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });

  test('coal power stations burn coal as productivity-independent fuel demand', () => {
    // 2 stations = 2 rotary-excavator-equivalents = 1 coal mine unit; the
    // Energy-output and mine productivity entries must not leak onto the
    // station's fixed fuel demand.
    const balances = balance(withOwned(
      { coalPowerStation: 2, coalMine: 1 },
      { coalPowerStation: 135, coalMine: 50 },
    ));
    expect(balances.coalMine?.demand).toBeCloseTo(1, 9);
    expect(balances.coalMine?.capacity).toBeCloseTo(0.5, 9);
    expect(balances.coalMine?.balance).toBeCloseTo(-0.5, 9);
    expect(balance(withOwned({ coalPowerStation: 2 }), [
      { faction: 'eco', tier: 0, goodId: 'fishery' },
    ]).coalMine?.demand).toBeCloseTo(1, 9);
  });

  test('nuclear plants demand fuel rods; material chains demand their inputs', () => {
    const balances = balance(withOwned({
      nuclearPowerPlant: 1, fuelElementFactory: 1, uraniumMine: 1, carbonFactory: 2,
    }));
    expect(balances.fuelElementFactory).toEqual({ capacity: 1, demand: 1, balance: 0 });
    expect(balances.uraniumMine).toEqual({ capacity: 1, demand: 1, balance: 0 });
    // 2 carbon factories: 2 oil refinery units and 1 coal mine unit demanded.
    expect(balances.oilRefinery?.demand).toBeCloseTo(2, 9);
    expect(balances.coalMine?.demand).toBeCloseTo(1, 9);
  });

  test('final demand follows island population and satisfaction', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const balances = balance(island);
    expect(balances.fishery?.demand).toBeGreaterThan(0);
  });

  test('removes one final-demand source while retaining owned intermediate demand', () => {
    const island = createIsland('Geniuses');
    island.factions.tech.houses = editable(100);
    island.factions.tech.maxTier = 3;
    island.owned.bionicsFactory = editable(1);

    const active = balance(island);
    const ignored = balance(island, ignoredBionics);

    expect(active.bionicsFactory!.demand).toBeGreaterThan(0);
    expect(ignored.bionicsFactory!.demand).toBe(0);
    expect(ignored.biopolymerFactory!.demand).toBe(active.biopolymerFactory!.demand);
  });

  test('applies one ignored source across every island', () => {
    const first = createIsland('One');
    const second = createIsland('Two');
    for (const island of [first, second]) {
      island.factions.tech.houses = editable(100);
      island.factions.tech.maxTier = 3;
    }

    expect(aggregateGoodLoads([first, second], ignoredBionics).bionicsFactory?.finalDemand ?? 0)
      .toBe(0);
  });

  test('retains another faction demand for the same good', () => {
    const island = createIsland('Shared fish');
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 1;
    island.factions.tycoon.houses = editable(100);
    island.factions.tycoon.maxTier = 1;

    const loads = islandGoodLoads(island, sumIslandPopulations([island]), [
      { faction: 'eco', tier: 0, goodId: 'fishery' },
    ]);

    expect(loads.fishery?.finalDemand).toBeCloseTo(800 / 250, 9);
  });

  test('restoration recalculates from the current population', () => {
    const island = createIsland('Growing Geniuses');
    island.factions.tech.houses = editable(100);
    island.factions.tech.maxTier = 3;
    const before = balance(island).bionicsFactory!.demand!;
    expect(balance(island, ignoredBionics).bionicsFactory?.demand ?? 0).toBe(0);

    island.factions.tech.houses = editable(200);
    const restored = balance(island).bionicsFactory!.demand!;

    expect(restored).toBeCloseTo(before * 2, 9);
  });

  test('recycling coverage reduces recyclable final demand by 15% above tier 0', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const covered = {
      ...island,
      factions: { ...island.factions, eco: { ...island.factions.eco, recyclingCoverage: true } },
    };
    const base = balance(island).electronicsFactory!.demand!;
    const reduced = balance(covered).electronicsFactory!.demand!;
    expect(reduced).toBeCloseTo(base * 0.85, 9);
    // Fish is not recyclable: unchanged.
    expect(balance(covered).fishery!.demand!)
      .toBeCloseTo(balance(island).fishery!.demand!, 9);
  });

  test('invalid entries null only the affected good', () => {
    const island = withOwned({ chipFactory: 2 });
    island.owned.fishery = { raw: 'x', value: null };
    const balances = balance(island);
    expect(balances.fishery?.capacity).toBeNull();
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });
});

describe('aggregateBalances and transferNeeds', () => {
  test('uses empire population to unlock demand while keeping consumption island-local', () => {
    const first = createIsland('One');
    const second = createIsland('Two');
    for (const island of [first, second]) {
      island.factions.tech.houses = editable(20);
      island.factions.tech.maxTier = 2;
      island.factions.tech.overrides[0] = editable(0);
      island.factions.tech.overrides[1] = editable(300);
    }

    const loads = aggregateGoodLoads([first, second], []);

    expect(loads.cyberneticFactory?.finalDemand).toBeCloseTo(600 / 667, 9);
  });

  test('unsettled islands contribute nothing', () => {
    const settled = withOwned({ fishery: 2 });
    const unsettled = { ...withOwned({ fishery: 5 }), settled: false };
    const empire = aggregateBalances([settled, unsettled], []);
    expect(empire.fishery?.capacity).toBeCloseTo(2, 9);
  });

  test('lists surplus and deficit islands per good, skipping one-signed goods', () => {
    const producer = withOwned({ fishery: 2 });
    const consumer = createIsland('B');
    consumer.factions.eco.houses = { raw: '500', value: 500 };
    const needs = transferNeeds([producer, consumer], []);
    const fish = needs.find((need) => need.goodId === 'fishery')!;
    expect(fish.surpluses.map((entry) => entry.islandId)).toEqual([producer.id]);
    expect(fish.deficits.map((entry) => entry.islandId)).toEqual([consumer.id]);
    // A good only one island touches, with no counterpart, is not a transfer need.
    expect(needs.some((need) => need.goodId === 'chipFactory')).toBe(false);
  });

  test('imbalances below display precision are not transfer needs', () => {
    // 80 workers demand 0.32 fish buildings; one fishery at 31.9% delivers
    // 0.319 — a -0.001 deficit that renders as 0 and must stay silent.
    const island = withOwned({ fishery: 1 }, { fishery: 31.9 });
    island.factions.eco.houses = editable(10);
    island.factions.eco.maxTier = 1;
    // (Tea stays a genuine deficit; only the fish noise must vanish.)
    expect(transferNeeds([island], []).some((need) => need.goodId === 'fishery')).toBe(false);

    // A visible deficit (-0.02) still registers as an empire-wide shortfall.
    const short = { ...island, productivity: { fishery: editable(30) } };
    const fish = transferNeeds([short], []).find((need) => need.goodId === 'fishery')!;
    expect(fish.deficits).toHaveLength(1);
    expect(fish.empireNet).toBeCloseTo(-0.02, 9);
  });
});
