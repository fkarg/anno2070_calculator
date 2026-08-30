import { describe, expect, test } from 'vitest';

import { applyPopulationOverrides, calculatePopulation } from './population';

describe('calculatePopulation', () => {
  test.each([
    [1, [800, 0, 0, 0]],
    [2, [160, 1200, 0, 0]],
    [3, [160, 480, 1200, 0]],
    [4, [160, 480, 725, 760]],
  ] as const)('calculates Eco maximum tier %s', (maxTier, expected) => {
    expect(calculatePopulation({
      faction: 'eco',
      houses: 100,
      maxTier,
      livingSpace: false,
      senate: false,
    })).toEqual(expected);
  });

  test('uses the same population rules for Tycoon residences', () => {
    expect(calculatePopulation({
      faction: 'tycoon',
      houses: 100,
      maxTier: 4,
      livingSpace: true,
      senate: true,
    })).toEqual([160, 512, 756, 924]);
  });

  test.each([
    [1, [500, 0, 0]],
    [2, [200, 1800, 0]],
    [3, [200, 1260, 900]],
  ] as const)('calculates Tech maximum tier %s', (maxTier, expected) => {
    expect(calculatePopulation({
      faction: 'tech',
      houses: 100,
      maxTier,
      livingSpace: false,
      senate: false,
    })).toEqual(expected);
  });

  test('applies Tech living-space and Senate bonuses in legacy order', () => {
    expect(calculatePopulation({
      faction: 'tech',
      houses: 100,
      maxTier: 3,
      livingSpace: true,
      senate: true,
    })).toEqual([200, 1287, 1176]);
  });

  test.each(['eco', 'tycoon', 'tech'] as const)('returns zero populations for zero %s houses', (faction) => {
    expect(calculatePopulation({
      faction,
      houses: 0,
      maxTier: faction === 'tech' ? 3 : 4,
      livingSpace: true,
      senate: true,
    })).toEqual(faction === 'tech' ? [0, 0, 0] : [0, 0, 0, 0]);
  });
});

// Overrides pin population counts, but the houses behind a limited tier stay
// built: they fill the next automatic lower tier, as in the game when
// ascension rights are limited. Distribution is by houses, not counts.
describe('applyPopulationOverrides', () => {
  // 100 eco houses, tier 4: allocations are 20/32/29/19 houses.
  const eco100 = {
    faction: 'eco', houses: 100, maxTier: 4, livingSpace: false, senate: false,
  } as const;

  test('limiting a tier fills the next lower tier with the freed houses', () => {
    // All 19 executive houses fall back to engineers: 48 houses × 25.
    expect(applyPopulationOverrides(eco100, [null, null, null, 0])).toEqual([160, 480, 1200, 0]);
  });

  test('partial limits free only the houses the override does not need', () => {
    // ceil(400 / 40) = 10 executive houses stay; 9 fall to engineers.
    expect(applyPopulationOverrides(eco100, [null, null, null, 400])).toEqual([160, 480, 950, 400]);
  });

  test('cascades past overridden tiers to the nearest automatic one', () => {
    // Engineer and executive houses (29 + 19) all land on employees: 80 × 15.
    expect(applyPopulationOverrides(eco100, [null, null, 0, 0])).toEqual([160, 1200, 0, 0]);
  });

  test('freed houses below the lowest tier stay unoccupied', () => {
    expect(applyPopulationOverrides(eco100, [0, null, null, null])).toEqual([0, 480, 725, 760]);
  });

  test('raising a tier pins the count without pulling houses upward', () => {
    expect(applyPopulationOverrides(eco100, [null, null, null, 800])).toEqual([160, 480, 725, 800]);
  });

  test('no overrides reproduces the automatic distribution exactly', () => {
    expect(applyPopulationOverrides(eco100, [null, null, null, null])).toEqual(calculatePopulation(eco100));
  });

  test('redistributes Tech houses the same way', () => {
    // 18 genius houses fall back to researchers: 60 houses × 30.
    expect(applyPopulationOverrides(
      { faction: 'tech', houses: 100, maxTier: 3, livingSpace: false, senate: false },
      [null, null, 0],
    )).toEqual([200, 1800, 0]);
  });
});
