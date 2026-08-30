import { describe, expect, test } from 'vitest';

import {
  calculateMaterial,
  calculatePrimary,
  formatRequirement,
} from './production';

describe('calculatePrimary', () => {
  test('sums demand from every population tier', () => {
    expect(calculatePrimary(
      [250, 364, 571, 800],
      [250, 364, 571, 800],
      100,
      false,
      false,
    )).toBe(4);
  });

  test('skips tiers with no satisfaction value', () => {
    expect(calculatePrimary(
      [0, 571, 800, 1250],
      [1000, 571, 800, 1250],
      100,
      false,
      false,
    )).toBe(3);
  });

  test('reduces recyclable demand for tiers two through four', () => {
    expect(calculatePrimary(
      [0, 571, 800, 1250],
      [0, 571, 800, 1250],
      100,
      true,
      false,
    )).toBeCloseTo(2.55);
  });

  test('divides demand by the productivity multiplier', () => {
    expect(calculatePrimary([100], [100], 200, false, false)).toBe(0.5);
  });

  test('rounds a primary result before it enters downstream chains', () => {
    expect(calculatePrimary([100], [101], 100, false, true)).toBe(2);
  });
});

describe('calculateMaterial', () => {
  test('applies the parent multiplier and productivity', () => {
    expect(calculateMaterial(4, 0.5, 200, false)).toBe(1);
  });

  test('rounds each dependent stage in whole-building mode', () => {
    expect(calculateMaterial(1.01, 2, 100, true)).toBe(3);
  });
});

describe('formatRequirement', () => {
  test.each([
    [0, '0'],
    [1, '1'],
    [1.23, '1.23'],
    [1.23001, '1.24'],
  ] as const)('rounds %s upward to at most two decimals', (value, expected) => {
    expect(formatRequirement(value)).toBe(expected);
  });
});
