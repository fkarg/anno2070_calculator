import { describe, expect, test } from 'vitest';

import { createInitialAppState, createIsland } from '../island';
import type { EditableNumber } from '../model';
import { calculateGrowthPlanning } from './planning';

const editable = (value: number): EditableNumber => ({ raw: String(value), value });

describe('Growth planning', () => {
  test('emits a tier-one expansion with canonical full-demand gaps', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: editable(10), maxTier: 1,
    };

    const result = calculateGrowthPlanning(state.plan, state.islands);

    expect(result?.milestones).toHaveLength(1);
    expect(result?.milestones[0]).toMatchObject({
      kind: 'expand', faction: 'eco', tier: 1, current: true,
    });
    expect(result?.milestones[0].gaps.find((gap) => gap.goodId === 'fishery')?.required)
      .toBeCloseTo(80 / 250);
  });

  test('carries shared Fish demand cumulatively across factions', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };

    const milestones = calculateGrowthPlanning(state.plan, [])!.milestones;

    expect(milestones[0].gaps.find((gap) => gap.goodId === 'fishery')?.required)
      .toBeCloseTo(0.32);
    expect(milestones[1].gaps.find((gap) => gap.goodId === 'fishery')?.required)
      .toBeCloseTo(0.64);
  });

  test('masks overrides above an earlier ascension checkpoint', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 4 };
    state.plan.factions.eco.overrides[3] = editable(800);

    const milestones = calculateGrowthPlanning(state.plan, [])!.milestones;

    expect(milestones.find((step) => step.tier === 2)?.populationAfter.eco[3]).toBe(0);
  });

  test('orders supply-chain inputs before their consuming good', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };

    const employeeStep = calculateGrowthPlanning(state.plan, [])!.milestones
      .find((step) => step.tier === 2)!;

    expect(employeeStep.gaps.findIndex((gap) => gap.goodId === 'riceFarm'))
      .toBeLessThan(employeeStep.gaps.findIndex((gap) => gap.goodId === 'healthFoodFactory'));
  });

  test('uses alternative producer rate and island productivity as canonical capacity', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };
    const underwater = {
      ...createIsland('Deep'),
      underwater: true,
      owned: { electronicsRecycler: editable(1) },
      productivity: { electronicsRecycler: editable(50) },
    };

    const employeeStep = calculateGrowthPlanning(state.plan, [underwater])!.milestones
      .find((step) => step.tier === 2)!;
    const chips = employeeStep.gaps.find((gap) => gap.goodId === 'chipFactory')!;

    expect(chips.capacity).toBeCloseTo(0.75);
    expect(chips.remaining).toBeCloseTo(Math.max(0, chips.required - 0.75));
  });

  test('marks covered milestones complete and advances the current step', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    const island = {
      ...createIsland('Supply'),
      owned: {
        fishery: editable(1),
        teaPlantation: editable(1),
      },
      fertilities: ['tea'],
    };

    const milestones = calculateGrowthPlanning(state.plan, [island])!.milestones;

    expect(milestones[0]).toMatchObject({ complete: true, current: false });
    expect(milestones[1]).toMatchObject({ complete: false, current: true });
  });

  test('returns null for invalid targets or actual capacity', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: { raw: 'x', value: null }, maxTier: 2,
    };
    expect(calculateGrowthPlanning(state.plan, [])).toBeNull();

    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    const island = {
      ...createIsland('Broken'),
      owned: { fishery: { raw: 'x', value: null } },
    };
    expect(calculateGrowthPlanning(state.plan, [island])).toBeNull();
  });

  test('emits no milestones while following differently tiered island actuals', () => {
    const state = createInitialAppState();
    const workers = createIsland('Workers');
    workers.factions.eco.houses = editable(10);
    workers.factions.eco.maxTier = 1;
    const executives = createIsland('Executives');
    executives.factions.eco.houses = editable(10);
    executives.factions.eco.maxTier = 4;

    const result = calculateGrowthPlanning(state.plan, [workers, executives]);

    expect(result?.milestones).toEqual([]);
  });

  test('does not turn a target below actual population into a shrink milestone', () => {
    const state = createInitialAppState();
    const actual = createIsland('Actual');
    actual.factions.eco.houses = editable(100);
    actual.factions.eco.maxTier = 4;
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: editable(10), maxTier: 4,
    };

    const result = calculateGrowthPlanning(state.plan, [actual]);

    expect(result?.milestones).toEqual([]);
  });

  test('never drops current per-good demand when a larger aggregate target changes tier mix', () => {
    const state = createInitialAppState();
    const workers = createIsland('Workers');
    workers.factions.eco.houses = editable(100);
    workers.factions.eco.maxTier = 1;
    const executives = createIsland('Executives');
    executives.factions.eco.houses = editable(100);
    executives.factions.eco.maxTier = 4;
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: editable(150), maxTier: 4,
    };

    const milestone = calculateGrowthPlanning(state.plan, [workers, executives])!.milestones[0];
    const actualFishDemand = 960 / 250 + 480 / 364 + 725 / 571 + 760 / 800;

    expect(milestone.gaps.find((gap) => gap.goodId === 'fishery')?.required)
      .toBeCloseTo(actualFishDemand);
  });
});
