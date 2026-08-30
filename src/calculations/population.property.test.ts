import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import { calculatePopulation } from './population';

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
