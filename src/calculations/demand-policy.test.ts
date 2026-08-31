import { describe, expect, test } from 'vitest';

import { isDemandIgnored, maskSatisfaction, type IgnoredDemandSource } from './demand-policy';

const ignored: readonly IgnoredDemandSource[] = [
  { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
];

describe('demand policy', () => {
  test('matches all three source dimensions and masks only that tier', () => {
    expect(isDemandIgnored(ignored, 'tech', 2, 'bionicsFactory')).toBe(true);
    expect(isDemandIgnored(ignored, 'tech', 1, 'bionicsFactory')).toBe(false);
    expect(isDemandIgnored(ignored, 'eco', 2, 'bionicsFactory')).toBe(false);
    expect(maskSatisfaction('bionicsFactory', 'tech', [0, 0, 1481], ignored))
      .toEqual([0, 0, 0]);
  });
});
