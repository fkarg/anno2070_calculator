import { describe, expect, test } from 'vitest';

import { createIsland } from '../island';
import { calculateSupportedPopulation, effectiveCapacities, throttleCause } from './supported-population';

const editable = (value: number) => ({ raw: String(value), value });

function withOwned(owned: Record<string, number>) {
  const island = createIsland('A');
  island.owned = Object.fromEntries(Object.entries(owned).map(([id, value]) => [id, editable(value)]));
  return island;
}

describe('effectiveCapacities', () => {
  test('input shortages throttle downstream stages through the whole chain', () => {
    // 1 grain farm feeds a flour mill needing 3 grain units -> mill runs at 1/3.
    // The mill's 1/3 flour covers only 1/3 of two pasta kitchens' demand (1),
    // while their vegetable supply (2 farms) is ample -> pasta runs at 1/3.
    const island = withOwned({
      pastaProduction: 2, flourMill: 1, grainFarm: 1, farmhouse: 2,
    });
    const capacities = effectiveCapacities([island], []);
    expect(capacities.grainFarm).toBeCloseTo(1, 9);
    expect(capacities.flourMill).toBeCloseTo(1 / 3, 9);
    expect(capacities.farmhouse).toBeCloseTo(2, 9);
    expect(capacities.pastaProduction).toBeCloseTo(2 / 3, 9);
  });

  test('producers without inputs run at full capacity', () => {
    const capacities = effectiveCapacities([withOwned({ fishery: 4 })], []);
    expect(capacities.fishery).toBeCloseTo(4, 9);
  });

  test('alternative producers without inputs are not throttled by the canonical route', () => {
    // Recyclers make chips from nothing; chip factories are limited by copper.
    const island = withOwned({ chipFactory: 2, electronicsRecycler: 2, sandExtractor: 1 });
    const capacities = effectiveCapacities([island], []);
    // Chip factories: no copper at all -> factor 0; recyclers contribute 2 × 1.5.
    expect(capacities.chipFactory).toBeCloseTo(3, 9);
  });
});

describe('throttleCause', () => {
  test('names the deepest under-supplied input of a throttled good', () => {
    // 2 plastic factories + 1 carbon factory both draw refined oil: demand 3
    // vs 2 refineries -> the plastics fleet runs at 2/3. The cause is oil.
    const island = withOwned({ plasticsFactory: 2, oilRefinery: 2, oilRig: 3, carbonFactory: 1 });
    expect(throttleCause([island], 'plasticsFactory', []))
      .toEqual({ goodId: 'oilRefinery', supply: 2, demand: 3 });
    // The refineries themselves are crude-fed adequately (3 rigs vs 2 needed).
    expect(throttleCause([island], 'oilRefinery', [])).toBeNull();
  });
});

describe('calculateSupportedPopulation', () => {
  test('the scarcest final good limits the supported population', () => {
    const island = withOwned({ fishery: 4, teaPlantation: 4 });
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 1; // workers only: fish (250) and tea (375)

    const result = calculateSupportedPopulation([island], []);
    // Workers: 800. Fish demand 3.2 buildings, tea demand 2.133.
    expect(result.scale).toBeCloseTo(4 / 3.2, 9);
    expect(result.limitingGood).toBe('fishery');
    expect(result.supported.eco![0]).toBe(1000);
    expect(result.supported.tycoon).toEqual([0, 0, 0, 0]);
    // One more fishery lifts the fish constraint to 5 / 3.2.
    expect(result.scaleAfterNextBuilding).toBeCloseTo(5 / 3.2, 9);
    // Tea is the next constraint in line.
    expect(result.constraints[0]?.goodId).toBe('fishery');
    expect(result.constraints[1]?.goodId).toBe('teaPlantation');
    expect(result.constraints[1]?.scale).toBeCloseTo(4 / (800 / 375), 9);
  });

  test('nominal capacity separates unbuilt chains from outgrown ones', () => {
    const island = withOwned({ fishery: 2 });
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 1;

    const result = calculateSupportedPopulation([island], []);
    const fish = result.constraints.find((constraint) => constraint.goodId === 'fishery')!;
    const tea = result.constraints.find((constraint) => constraint.goodId === 'teaPlantation')!;
    expect(fish.nominalCapacity).toBeCloseTo(2, 9);
    expect(tea.nominalCapacity).toBe(0);
  });

  test('intermediate consumption is reserved before feeding the population', () => {
    // Owned chip factories eat copper; the population also never eats copper,
    // so copper appears as a constraint only through the chips chain.
    const island = withOwned({ fishery: 10, teaPlantation: 10, copperMine: 1, chipFactory: 2 });
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 1;

    const result = calculateSupportedPopulation([island], []);
    // Copper has no final demand: it must not be a constraint entry itself.
    expect(result.constraints.some((constraint) => constraint.goodId === 'copperMine')).toBe(false);
    expect(result.scale).not.toBeNull();
  });

  test('no population means no constraints and no scale', () => {
    const result = calculateSupportedPopulation([withOwned({ fishery: 3 })], []);
    expect(result.scale).toBeNull();
    expect(result.limitingGood).toBeNull();
    expect(result.constraints).toEqual([]);
  });

  test('invalid inputs make the result unavailable', () => {
    const island = withOwned({ fishery: 3 });
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 1;
    island.owned.teaPlantation = { raw: 'x', value: null };
    expect(calculateSupportedPopulation([island], []).scale).toBeNull();
  });
});
