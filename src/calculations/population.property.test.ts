import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import { applyPopulationOverrides, calculatePopulation } from './population';

const houses = fc.integer({ min: 0, max: 100_000 });
const options = fc.record({
  livingSpace: fc.boolean(),
  senate: fc.boolean(),
});

test.prop({
  faction: fc.constantFrom('eco', 'tycoon'),
  houses,
  maxTier: fc.integer({ min: 1, max: 4 }),
  options,
})('returns finite non-negative integers and clears tiers above the selected Eco/Tycoon maximum', ({ faction, houses: residenceCount, maxTier, options }) => {
  const result = calculatePopulation({
    faction,
    houses: residenceCount,
    maxTier,
    ...options,
  });

  expect(result).toHaveLength(4);
  expect(result.every(Number.isSafeInteger)).toBe(true);
  expect(result.every((value) => value >= 0)).toBe(true);
  expect(result.slice(maxTier).every((value) => value === 0)).toBe(true);
});

test.prop({
  houses,
  maxTier: fc.integer({ min: 1, max: 3 }),
  options,
})('returns finite non-negative integers and clears tiers above the selected Tech maximum', ({ houses: residenceCount, maxTier, options }) => {
  const result = calculatePopulation({
    faction: 'tech',
    houses: residenceCount,
    maxTier,
    ...options,
  });

  expect(result).toHaveLength(3);
  expect(result.every(Number.isSafeInteger)).toBe(true);
  expect(result.every((value) => value >= 0)).toBe(true);
  expect(result.slice(maxTier).every((value) => value === 0)).toBe(true);
});

test.prop({
  houses,
  maxTier: fc.integer({ min: 1, max: 4 }),
  options,
})('uses identical residence rules for Eco and Tycoon populations', ({ houses: residenceCount, maxTier, options }) => {
  const eco = calculatePopulation({ faction: 'eco', houses: residenceCount, maxTier, ...options });
  const tycoon = calculatePopulation({ faction: 'tycoon', houses: residenceCount, maxTier, ...options });

  expect(eco).toEqual(tycoon);
});

test.prop({
  faction: fc.constantFrom('eco', 'tycoon'),
  houses,
  maxTier: fc.integer({ min: 1, max: 4 }),
})('living-space and Senate bonuses never reduce Eco or Tycoon population', ({ faction, houses: residenceCount, maxTier }) => {
  const baseline = calculatePopulation({ faction, houses: residenceCount, maxTier, livingSpace: false, senate: false });
  const boosted = calculatePopulation({ faction, houses: residenceCount, maxTier, livingSpace: true, senate: true });

  expect(boosted.reduce((sum, value) => sum + value, 0))
    .toBeGreaterThanOrEqual(baseline.reduce((sum, value) => sum + value, 0));
});

test.prop({
  houses,
  maxTier: fc.integer({ min: 1, max: 3 }),
})('living-space and Senate bonuses never reduce Tech population', ({ houses: residenceCount, maxTier }) => {
  const baseline = calculatePopulation({ faction: 'tech', houses: residenceCount, maxTier, livingSpace: false, senate: false });
  const boosted = calculatePopulation({ faction: 'tech', houses: residenceCount, maxTier, livingSpace: true, senate: true });

  expect(boosted.reduce((sum, value) => sum + value, 0))
    .toBeGreaterThanOrEqual(baseline.reduce((sum, value) => sum + value, 0));
});

test.prop({ faction: fc.constantFrom('eco', 'tycoon', 'tech'), options })(
  'zero houses always produce zero inhabitants',
  ({ faction, options }) => {
    const maxTier = faction === 'tech' ? 3 : 4;
    const result = calculatePopulation({ faction, houses: 0, maxTier, ...options });

    expect(result.every((value) => value === 0)).toBe(true);
  },
);

// House conservation: limiting a tier keeps every house occupied by moving the
// freed houses down one automatic tier. Implied houses (population ÷ capacity
// for automatic tiers, ceil(override ÷ capacity) for pinned ones) must sum to
// the input houses whenever the override needs no more houses than derived.
test.prop([fc.integer({ min: 0, max: 10_000 }), fc.double({ min: 0, max: 1, noNaN: true })])(
  'limiting executives conserves occupied eco houses',
  (houseCount, fraction) => {
    const input = {
      faction: 'eco', houses: houseCount, maxTier: 4, livingSpace: false, senate: false,
    } as const;
    const derived = calculatePopulation(input);
    const override = Math.floor(derived[3] * fraction);
    const result = applyPopulationOverrides(input, [null, null, null, override]);

    const capacities = [8, 15, 25, 40];
    const impliedHouses = result[0] / capacities[0]
      + result[1] / capacities[1]
      + result[2] / capacities[2]
      + Math.ceil(override / capacities[3]);
    expect(impliedHouses).toBe(houseCount);
    expect(result[2]).toBeGreaterThanOrEqual(derived[2]);
    expect(result[0]).toBe(derived[0]);
    expect(result[1]).toBe(derived[1]);
  },
);
