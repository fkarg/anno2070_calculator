import { describe, expect, test } from 'vitest';

import { calculatePopulation } from './population';

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
