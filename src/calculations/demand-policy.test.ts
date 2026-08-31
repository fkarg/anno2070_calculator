import { describe, expect, test } from 'vitest';

import {
  isDemandIgnored,
  isDemandUnlocked,
  maskSatisfaction,
  type IgnoredDemandSource,
} from './demand-policy';

const ignored: readonly IgnoredDemandSource[] = [
  { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
];

describe('demand policy', () => {
  test('matches all three source dimensions and masks only that tier', () => {
    expect(isDemandIgnored(ignored, 'tech', 2, 'bionicsFactory')).toBe(true);
    expect(isDemandIgnored(ignored, 'tech', 1, 'bionicsFactory')).toBe(false);
    expect(isDemandIgnored(ignored, 'eco', 2, 'bionicsFactory')).toBe(false);
    expect(maskSatisfaction({
      goodId: 'bionicsFactory',
      faction: 'tech',
      satisfaction: [0, 0, 1481],
      unlockAt: 600,
      population: [0, 0, 600],
      ignored,
    }))
      .toEqual([0, 0, 0]);
  });

  test('unlocks at the introducing-tier threshold or when a higher tier proves progression', () => {
    expect(isDemandUnlocked([0, 667, 667], 600, [0, 599, 0])).toBe(false);
    expect(isDemandUnlocked([0, 667, 667], 600, [0, 600, 0])).toBe(true);
    expect(isDemandUnlocked([0, 667, 667], 600, [0, 1, 1])).toBe(true);
  });

  test('masks every tier while its demand root is not unlocked', () => {
    expect(maskSatisfaction({
      goodId: 'bionicsFactory',
      faction: 'tech',
      satisfaction: [0, 0, 1481],
      unlockAt: 600,
      population: [0, 0, 599],
      ignored: [],
    })).toEqual([0, 0, 0]);
  });
});
