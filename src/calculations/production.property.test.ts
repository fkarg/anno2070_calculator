import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import { calculateMaterial, calculatePrimary } from './production';

const tierValues = fc.array(fc.integer({ min: 0, max: 100_000 }), {
  minLength: 4,
  maxLength: 4,
});
const satisfactionValues = fc.array(fc.integer({ min: 1, max: 2_000 }), {
  minLength: 4,
  maxLength: 4,
});
const productivity = fc.integer({ min: 1, max: 999 });

test.prop({ satisfaction: satisfactionValues, population: tierValues, productivity })(
  'returns finite non-negative primary requirements',
  ({ satisfaction, population, productivity }) => {
    const result = calculatePrimary(satisfaction, population, productivity, false, false);

    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  },
);

test.prop({ satisfaction: satisfactionValues, population: tierValues, productivity })(
  'zero population produces zero primary demand',
  ({ satisfaction, productivity }) => {
    expect(calculatePrimary(satisfaction, [0, 0, 0, 0], productivity, false, false)).toBe(0);
  },
);

test.prop({
  satisfaction: satisfactionValues,
  population: tierValues,
  increases: tierValues,
  productivity,
})('increasing population never reduces primary demand', ({ satisfaction, population, increases, productivity }) => {
  const increasedPopulation = population.map((value, index) => value + increases[index]);
  const baseline = calculatePrimary(satisfaction, population, productivity, false, false);
  const increased = calculatePrimary(satisfaction, increasedPopulation, productivity, false, false);

  expect(increased).toBeGreaterThanOrEqual(baseline);
});

test.prop({
  satisfaction: satisfactionValues,
  population: tierValues,
  lowProductivity: fc.integer({ min: 1, max: 998 }),
  productivityIncrease: fc.integer({ min: 1, max: 999 }),
})('increasing productivity never increases primary demand', ({ satisfaction, population, lowProductivity, productivityIncrease }) => {
  const highProductivity = lowProductivity + productivityIncrease;
  const baseline = calculatePrimary(satisfaction, population, lowProductivity, false, false);
  const improved = calculatePrimary(satisfaction, population, highProductivity, false, false);

  expect(improved).toBeLessThanOrEqual(baseline);
});

test.prop({ satisfaction: satisfactionValues, population: tierValues, productivity })(
  'recycling never increases primary demand',
  ({ satisfaction, population, productivity }) => {
    const baseline = calculatePrimary(satisfaction, population, productivity, false, false);
    const recycled = calculatePrimary(satisfaction, population, productivity, true, false);

    expect(recycled).toBeLessThanOrEqual(baseline);
  },
);

test.prop({ satisfaction: satisfactionValues, population: tierValues, productivity })(
  'whole-building primary results are integral and cover fractional demand',
  ({ satisfaction, population, productivity }) => {
    const fractional = calculatePrimary(satisfaction, population, productivity, false, false);
    const whole = calculatePrimary(satisfaction, population, productivity, false, true);

    expect(Number.isSafeInteger(whole)).toBe(true);
    expect(whole).toBeGreaterThanOrEqual(fractional);
  },
);

test.prop({ satisfaction: satisfactionValues, population: tierValues, productivity })(
  'fractional primary production is linear in population',
  ({ satisfaction, population, productivity }) => {
    const baseline = calculatePrimary(satisfaction, population, productivity, false, false);
    const doubled = calculatePrimary(satisfaction, population.map((value) => value * 2), productivity, false, false);

    expect(doubled).toBeCloseTo(baseline * 2, 8);
  },
);

test.prop({
  parent: fc.double({ min: 0, max: 100_000, noNaN: true }),
  multiplier: fc.double({ min: 0, max: 10, noNaN: true }),
  productivity,
})('dependent material calculations stay finite, non-negative, and round upward', ({ parent, multiplier, productivity }) => {
  const fractional = calculateMaterial(parent, multiplier, productivity, false);
  const whole = calculateMaterial(parent, multiplier, productivity, true);

  expect(Number.isFinite(fractional)).toBe(true);
  expect(fractional).toBeGreaterThanOrEqual(0);
  expect(Number.isSafeInteger(whole)).toBe(true);
  expect(whole).toBeGreaterThanOrEqual(fractional);
});
