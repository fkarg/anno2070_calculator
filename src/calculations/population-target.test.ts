import { describe, expect, test } from 'vitest';

import { createPlanFactionState } from '../model';
import { resolvePopulationTarget } from './population-target';

const editable = (value: number) => ({ raw: String(value), value });

describe('resolvePopulationTarget', () => {
  test('finds the minimum residences for a Tech population goal', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
    };

    const result = resolvePopulationTarget('tech', state, 0, [0, 0, 0]);

    expect(result).toMatchObject({
      houses: 279,
      maxTier: 3,
      requested: 2500,
      achieved: 2500,
      overshoot: 0,
    });
    expect(result?.normalPopulations).toEqual([560, 3510, 2500]);
  });

  test('reports unavoidable whole-house overshoot and proves minimality', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'population' as const, tier: 3, count: editable(2501) },
    };

    expect(resolvePopulationTarget('tech', state, 0, [0, 0, 0])).toMatchObject({
      houses: 284,
      requested: 2501,
      achieved: 2550,
      overshoot: 49,
    });
  });

  test('recomputes minimum houses through living-space bonuses', () => {
    const state = {
      ...createPlanFactionState('tech'),
      livingSpace: true,
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
    };

    expect(resolvePopulationTarget('tech', state, 0, [0, 0, 0])?.houses).toBe(250);
  });

  test('follows island totals without storing derived target data', () => {
    const result = resolvePopulationTarget(
      'eco',
      createPlanFactionState('eco'),
      12,
      [16, 75, 25, 0],
    );

    expect(result).toMatchObject({ houses: 12, maxTier: 3, requested: null, overshoot: 0 });
    expect(result?.effectivePopulations).toEqual([16, 75, 25, 0]);
  });

  test('ignores retained target overrides while following island actuals', () => {
    const state = {
      ...createPlanFactionState('eco'),
      overrides: [null, null, null, editable(999)],
    };

    const result = resolvePopulationTarget('eco', state, 20, [96, 60, 75, 40]);

    expect(result?.normalPopulations).toEqual([96, 60, 75, 40]);
    expect(result?.effectivePopulations).toEqual([96, 60, 75, 40]);
  });

  test('projects followed houses through the full Tech ladder when unrestricted', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'follow' as const, tierMode: 'unrestricted' as const },
    };

    const result = resolvePopulationTarget('tech', state, 100, [200, 900, 0]);

    expect(result).toMatchObject({ houses: 100, maxTier: 3 });
    expect(result?.normalPopulations).toEqual([200, 1260, 900]);
    expect(result?.effectivePopulations).toEqual([200, 1260, 900]);
  });

  test('applies global bonuses but not retained overrides to unrestricted follow', () => {
    const state = {
      ...createPlanFactionState('tech'),
      livingSpace: true,
      senate: true,
      overrides: [null, null, editable(1)],
      intent: { kind: 'follow' as const, tierMode: 'unrestricted' as const },
    };

    expect(resolvePopulationTarget('tech', state, 100, [200, 900, 0])?.effectivePopulations)
      .toEqual([200, 1287, 1176]);
  });

  test('advanced overrides take precedence and can leave the normal goal unmet', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
      overrides: [null, null, editable(2000)],
    };

    expect(resolvePopulationTarget('tech', state, 0, [0, 0, 0])).toMatchObject({
      achieved: 2500,
      targetMetAfterOverrides: false,
      effectivePopulations: [560, 3810, 2000],
    });
  });

  test('returns null for invalid inputs instead of NaN', () => {
    const state = {
      ...createPlanFactionState('eco'),
      intent: { kind: 'population' as const, tier: 4, count: { raw: 'x', value: null } },
    };

    expect(resolvePopulationTarget('eco', state, 0, [0, 0, 0, 0])).toBeNull();
  });
});
