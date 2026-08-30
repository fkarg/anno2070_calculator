import { describe, expect, test } from 'vitest';

import { createIsland } from '../island';
import type { EditableNumber } from '../model';
import { aggregateBalances, calculateIslandBalance, transferNeeds } from './island-balance';

const editable = (value: number): EditableNumber => ({ raw: String(value), value });

const withOwned = (owned: Record<string, number>, productivity: Record<string, number> = {}) => ({
  ...createIsland('A'),
  owned: Object.fromEntries(Object.entries(owned).map(([id, value]) => [id, editable(value)])),
  productivity: Object.fromEntries(
    Object.entries(productivity).map(([id, value]) => [id, editable(value)]),
  ),
});

describe('calculateIslandBalance', () => {
  test('capacity scales with owned count, producer rate, and productivity', () => {
    const balances = calculateIslandBalance(withOwned({ electronicsRecycler: 2 }, { electronicsRecycler: 50 }));
    // 2 recyclers at 50% at rate 1.5 = 1.5 chip-factory units.
    expect(balances.chipFactory?.capacity).toBeCloseTo(1.5, 9);
  });

  test('owned consumers place intermediate demand on their own island', () => {
    const balances = calculateIslandBalance(withOwned({ chipFactory: 2 }));
    expect(balances.copperMine?.demand).toBeCloseTo(1, 9); // 2 × 0.5
    expect(balances.sandExtractor?.demand).toBeCloseTo(2 / 3, 9);
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });

  test('final demand follows island population and satisfaction', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const balances = calculateIslandBalance(island);
    expect(balances.fishery?.demand).toBeGreaterThan(0);
  });

  test('recycling coverage reduces recyclable final demand by 15% above tier 0', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const covered = {
      ...island,
      factions: { ...island.factions, eco: { ...island.factions.eco, recyclingCoverage: true } },
    };
    const base = calculateIslandBalance(island).electronicsFactory!.demand!;
    const reduced = calculateIslandBalance(covered).electronicsFactory!.demand!;
    expect(reduced).toBeCloseTo(base * 0.85, 9);
    // Fish is not recyclable: unchanged.
    expect(calculateIslandBalance(covered).fishery!.demand!)
      .toBeCloseTo(calculateIslandBalance(island).fishery!.demand!, 9);
  });

  test('invalid entries null only the affected good', () => {
    const island = withOwned({ chipFactory: 2 });
    island.owned.fishery = { raw: 'x', value: null };
    const balances = calculateIslandBalance(island);
    expect(balances.fishery?.capacity).toBeNull();
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });
});

describe('aggregateBalances and transferNeeds', () => {
  test('unsettled islands contribute nothing', () => {
    const settled = withOwned({ fishery: 2 });
    const unsettled = { ...withOwned({ fishery: 5 }), settled: false };
    const empire = aggregateBalances([settled, unsettled]);
    expect(empire.fishery?.capacity).toBeCloseTo(2, 9);
  });

  test('lists surplus and deficit islands per good, skipping one-signed goods', () => {
    const producer = withOwned({ fishery: 2 });
    const consumer = createIsland('B');
    consumer.factions.eco.houses = { raw: '500', value: 500 };
    const needs = transferNeeds([producer, consumer]);
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
    expect(transferNeeds([island]).some((need) => need.goodId === 'fishery')).toBe(false);

    // A visible deficit (-0.02) still registers as an empire-wide shortfall.
    const short = { ...island, productivity: { fishery: editable(30) } };
    const fish = transferNeeds([short]).find((need) => need.goodId === 'fishery')!;
    expect(fish.deficits).toHaveLength(1);
    expect(fish.empireNet).toBeCloseTo(-0.02, 9);
  });
});
