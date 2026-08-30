import { describe, expect, test } from 'vitest';

import { createIsland } from '../island';
import { calculateCoverage, supportedAscensions, tierHeadroom } from './coverage';

const editable = (value: number) => ({ raw: String(value), value });

function island(owned: Record<string, number>, ecoHouses = 0, maxTier = 4) {
  const result = createIsland('A');
  result.owned = Object.fromEntries(Object.entries(owned).map(([id, value]) => [id, editable(value)]));
  result.factions.eco.houses = editable(ecoHouses);
  result.factions.eco.maxTier = maxTier;
  return result;
}

describe('calculateCoverage', () => {
  test('reports capped coverage and uncapped ratio per demanded good', () => {
    // Workers only: fish demand 800/250 = 3.2, tea demand 800/375.
    const coverage = calculateCoverage([island({ fishery: 2, teaPlantation: 4 }, 100, 1)]);
    expect(coverage.fishery?.coverage).toBeCloseTo(2 / 3.2, 9);
    expect(coverage.fishery?.ratio).toBeCloseTo(2 / 3.2, 9);
    expect(coverage.teaPlantation?.coverage).toBe(1);
    expect(coverage.teaPlantation?.ratio).toBeCloseTo(4 / (800 / 375), 9);
  });

  test('intermediate demand is reserved before covering the population', () => {
    // 2 chip factories eat 1 copper unit; the population never eats copper,
    // so copper carries no coverage entry, but chips capacity is throttled
    // by the copper shortage when computing effective capacity elsewhere.
    const coverage = calculateCoverage([island({ fishery: 4, chipFactory: 2 }, 100, 1)]);
    expect(coverage.copperMine).toBeUndefined();
    expect(coverage.fishery?.coverage).toBe(1);
  });

  test('invalid inputs null the affected good only', () => {
    const subject = island({ fishery: 2 }, 100, 1);
    subject.owned.teaPlantation = { raw: 'x', value: null };
    const coverage = calculateCoverage([subject]);
    expect(coverage.teaPlantation).toBeNull();
    expect(coverage.fishery?.coverage).toBeCloseTo(2 / 3.2, 9);
  });
});

describe('tierHeadroom', () => {
  test('surplus capacity converts into additional inhabitants of the tier', () => {
    // Workers: fish surplus 4 − 3.2 = 0.8 buildings × 250 = 200 workers;
    // tea surplus 4 − 2.1333 = 1.8667 × 375 = 700 workers. Fish limits.
    const headroom = tierHeadroom([island({ fishery: 4, teaPlantation: 4 }, 100, 1)], 'eco', 0);
    expect(headroom?.additional).toBeCloseTo(200, 6);
    expect(headroom?.limitingGood).toBe('fishery');
  });

  test('unbuilt chains do not zero the headroom; built goods limit it', () => {
    // Tea is unbuilt — known future work, listed separately. Fish alone
    // limits: surplus 4 − 3.2 = 0.8 buildings × 250 = 200 workers.
    const headroom = tierHeadroom([island({ fishery: 4 }, 100, 1)], 'eco', 0);
    expect(headroom?.additional).toBeCloseTo(200, 6);
    expect(headroom?.limitingGood).toBe('fishery');
    // Nothing built at all: there is no headroom statement to make.
    expect(tierHeadroom([island({}, 100, 1)], 'eco', 0)).toBeNull();
  });
});

describe('supportedAscensions', () => {
  test('reports how many houses can ascend before a good runs out', () => {
    // No population: full effective capacities are surplus. Ascending
    // Workers→Employees adds per house: fish 15/364−8/250, tea 7/375, health
    // food 15/667, communicators 15/571. Chains must be complete or the
    // factories are throttled to zero: health food gets its farms, the
    // electronics factory gets chips from a recycler (1 recycler = 1.5 chip
    // units, no inputs). Communicators limit: floor(571/15) = 38.
    const result = supportedAscensions(
      [island({
        fishery: 10, teaPlantation: 10,
        healthFoodFactory: 1, farmhouse: 2, riceFarm: 1,
        electronicsFactory: 1, electronicsRecycler: 1,
      })],
      'eco',
      0,
    );
    expect(result?.ascensions).toBe(38);
    expect(result?.limitingGood).toBe('electronicsFactory');
  });

  test('zero surplus supports zero ascensions', () => {
    const result = supportedAscensions([island({}, 100, 1)], 'eco', 0);
    expect(result?.ascensions).toBe(0);
  });

  test('invalid inputs make the result unavailable', () => {
    const subject = island({ fishery: 2 }, 100, 1);
    subject.owned.electronicsFactory = { raw: 'x', value: null };
    expect(supportedAscensions([subject], 'eco', 0)).toBeNull();
  });
});

describe('living space and ascension support', () => {
  test('the global living-space bonus raises per-house ascension demand', () => {
    // Regression: ascension math used a bonus-blind capacity table. With
    // living space, an Employee house holds 16, so one electronics factory
    // (571 per building) covers floor(571/16) = 35 ascensions, not 38.
    const base = island({
      fishery: 10, teaPlantation: 10,
      healthFoodFactory: 1, farmhouse: 2, riceFarm: 1,
      electronicsFactory: 1, electronicsRecycler: 1,
    });
    const boosted = {
      ...base,
      factions: {
        ...base.factions,
        eco: { ...base.factions.eco, livingSpace: true },
      },
    };
    expect(supportedAscensions([base], 'eco', 0)?.ascensions).toBe(38);
    expect(supportedAscensions([boosted], 'eco', 0)?.ascensions).toBe(35);
  });
});
