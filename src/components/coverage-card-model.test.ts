import { describe, expect, test } from 'vitest';

import { calculateGrowthPlanning } from '../calculations/planning';
import { createInitialAppState, createIsland } from '../island';
import type { EditableNumber } from '../model';
import { currentCoverageView, milestoneCoverageCards } from './coverage-card-model';

const editable = (value: number): EditableNumber => ({ raw: String(value), value });

describe('Coverage card models', () => {
  test('keeps an upstream action distinct from a starved downstream bottleneck', () => {
    const island = createIsland('Supply');
    island.factions.eco.houses = editable(100);
    island.factions.eco.maxTier = 2;
    island.owned.healthFoodFactory = editable(2);

    const card = currentCoverageView([island], null).cards
      .find((candidate) => candidate.goodId === 'healthFoodFactory')!;

    expect(card.actionGoodId).not.toBe(card.goodId);
    expect(card.outcome).toContain('starved');
  });

  test('chooses a changed milestone chain for the visible breadcrumb', () => {
    const state = createInitialAppState();
    state.plan.factions.tech.intent = {
      kind: 'residences', houses: editable(100), maxTier: 3,
    };
    const milestone = calculateGrowthPlanning(state.plan, [])!.sequences.tech.at(-1)!;
    const cards = milestoneCoverageCards(milestone);
    const copper = cards.find((card) => card.goodId === 'copperMine')!;

    expect(copper.breadcrumb.at(0)).toBe('Copper mine');
    expect(copper.breadcrumb.at(-1)).toMatch(/Tech: \+.* planned/);
    expect(copper.why.some((reason) => reason.kind === 'changed')).toBe(true);
  });

  test('labels purely carried milestone provenance without blaming the target', () => {
    const state = createInitialAppState();
    const actual = createIsland('Tech');
    actual.factions.tech.houses = editable(10);
    actual.factions.tech.maxTier = 1;
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: editable(100), maxTier: 3,
    };
    const milestone = calculateGrowthPlanning(state.plan, [actual])!.sequences.eco.at(-1)!;
    const algae = milestoneCoverageCards(milestone)
      .find((card) => card.goodId === 'aquafarm')!;

    expect(algae.breadcrumb.at(-1)).toMatch(/current population|previous Eco step/);
    expect(algae.why.every((reason) => reason.kind === 'carried')).toBe(true);
  });

  test('preserves input-first order for the four-card and later partitions', () => {
    const state = createInitialAppState();
    state.plan.factions.tech.intent = {
      kind: 'residences', houses: editable(100), maxTier: 3,
    };
    const milestone = calculateGrowthPlanning(state.plan, [])!.sequences.tech.at(-1)!;
    const cards = milestoneCoverageCards(milestone);

    expect(cards.slice(0, 4).map((card) => card.goodId))
      .toEqual(milestone.gaps.slice(0, 4).map((gap) => gap.goodId));
  });
});
