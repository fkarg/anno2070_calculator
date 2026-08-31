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

    const card = currentCoverageView([island], null, []).cards
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
    expect(copper.title).toMatch(/ missing$/);
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

  test('labels a carried gap in the first milestone as current population demand', () => {
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

    const milestone = calculateGrowthPlanning(state.plan, [workers, executives])!.sequences.eco[0];
    const decreasingGap = milestone.gaps.find((gap) => gap.required < gap.baselineRequired)!;
    const card = milestoneCoverageCards(milestone)
      .find((candidate) => candidate.goodId === decreasingGap.goodId)!;

    expect(card.breadcrumb.at(-1)).toBe('current population');
  });

  test('uses stable chain order when changed contributions tie', () => {
    const milestone = {
      id: 'eco-4-ascend',
      kind: 'ascend' as const,
      faction: 'eco' as const,
      tier: 4,
      populationBefore: { eco: [0, 0, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      populationAfter: { eco: [0, 0, 0, 800], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      gaps: [{
        goodId: 'aquafarm' as const,
        required: 2,
        capacity: 0,
        remaining: 2,
        baselineRequired: 0,
        previousRequired: 0,
        checkpointRequired: 2,
        addedHere: 2,
        chains: [{
          faction: 'eco' as const,
          rootNodeId: 'ecoServiceBots',
          pathNodeIds: ['ecoServiceBots', 'ecoBiopolymers', 'ecoAlgae'],
          required: 1,
          baselineRequired: 0,
          previousRequired: 0,
          addedHere: 1,
        }, {
          faction: 'tech' as const,
          rootNodeId: 'techFunctionalFood',
          pathNodeIds: ['techFunctionalFood', 'techAlgaeFunctionalFood'],
          required: 1,
          baselineRequired: 0,
          previousRequired: 0,
          addedHere: 1,
        }],
      }],
      complete: false,
      current: true,
    };

    const [card] = milestoneCoverageCards(milestone);

    expect(card.breadcrumb.slice(0, 3)).toEqual([
      'Aquafarm', 'Biopolymer factory', 'Robot factory',
    ]);
  });
});
