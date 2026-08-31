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

    expect(result?.sequences.eco).toHaveLength(1);
    expect(result?.sequences.eco[0]).toMatchObject({
      kind: 'expand', faction: 'eco', tier: 1, current: true,
    });
    expect(result?.sequences.eco[0].gaps.find((gap) => gap.goodId === 'fishery')?.required)
      .toBeCloseTo(80 / 250);
  });

  test('reports current shortages as a baseline without growth targets', () => {
    const state = createInitialAppState();
    const actual = createIsland('Actual');
    actual.factions.tech.houses = editable(10);
    actual.factions.tech.maxTier = 2;

    const planning = calculateGrowthPlanning(state.plan, [actual])!;

    expect(planning.baseline.gaps.find((gap) => gap.goodId === 'aquafarm')).toBeDefined();
    expect(planning.sequences.eco).toEqual([]);
    expect(planning.sequences.tycoon).toEqual([]);
    expect(planning.sequences.tech).toEqual([]);
  });

  test('keeps faction target branches independent', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(20), maxTier: 1 };

    const planning = calculateGrowthPlanning(state.plan, [])!;
    const eco = planning.sequences.eco[0];
    const tycoon = planning.sequences.tycoon[0];

    expect(eco.populationAfter.eco[0]).toBe(80);
    expect(eco.populationAfter.tycoon[0]).toBe(0);
    expect(tycoon.populationAfter.eco[0]).toBe(0);
    expect(tycoon.populationAfter.tycoon[0]).toBe(160);
    expect(eco.gaps.find((gap) => gap.goodId === 'fishery')?.required).toBeCloseTo(0.32);
    expect(tycoon.gaps.find((gap) => gap.goodId === 'fishery')?.required).toBeCloseTo(0.64);
  });

  test('marks the first incomplete step current in every faction branch', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
    state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };

    const planning = calculateGrowthPlanning(state.plan, [])!;

    expect(planning.sequences.eco[0].current).toBe(true);
    expect(planning.sequences.tycoon[0].current).toBe(true);
  });

  test('compares each checkpoint with its exact previous same-faction scenario', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };

    const [workers, employees] = calculateGrowthPlanning(state.plan, [])!.sequences.eco;
    const workerFish = workers.gaps.find((gap) => gap.goodId === 'fishery')!;
    const employeeFish = employees.gaps.find((gap) => gap.goodId === 'fishery')!;

    expect(employeeFish.previousRequired).toBeCloseTo(workerFish.required);
    expect(employeeFish.addedHere).toBeCloseTo(Math.max(
      0, employeeFish.required - workerFish.required,
    ));
  });

  test('masks overrides above an earlier ascension checkpoint', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 4 };
    state.plan.factions.eco.overrides[3] = editable(800);

    const milestones = calculateGrowthPlanning(state.plan, [])!.sequences.eco;

    expect(milestones.find((step) => step.tier === 2)?.populationAfter.eco[3]).toBe(0);
  });

  test('orders supply-chain inputs before their consuming good', () => {
    const state = createInitialAppState();
    state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };

    const employeeStep = calculateGrowthPlanning(state.plan, [])!.sequences.eco
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

    const employeeStep = calculateGrowthPlanning(state.plan, [underwater])!.sequences.eco
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

    const planning = calculateGrowthPlanning(state.plan, [island])!;

    expect(planning.sequences.eco[0]).toMatchObject({ complete: true, current: false });
    expect(planning.sequences.tycoon[0]).toMatchObject({ complete: false, current: true });
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

    expect(result?.sequences).toEqual({ eco: [], tycoon: [], tech: [] });
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

    expect(result?.sequences).toEqual({ eco: [], tycoon: [], tech: [] });
  });

});
