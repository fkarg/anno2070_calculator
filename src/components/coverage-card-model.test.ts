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

  test('omits purely carried gaps from milestone cards', () => {
    const state = createInitialAppState();
    const actual = createIsland('Tech');
    actual.factions.tech.houses = editable(10);
    actual.factions.tech.maxTier = 1;
    state.plan.factions.eco.intent = {
      kind: 'residences', houses: editable(100), maxTier: 3,
    };
    const milestone = calculateGrowthPlanning(state.plan, [actual])!.sequences.eco.at(-1)!;
    const algae = milestoneCoverageCards(milestone)
      .find((card) => card.goodId === 'aquafarm');

    expect(algae).toBeUndefined();
  });

  test('preserves input-first order for the four-card and later partitions', () => {
    const state = createInitialAppState();
    state.plan.factions.tech.intent = {
      kind: 'residences', houses: editable(100), maxTier: 3,
    };
    const milestone = calculateGrowthPlanning(state.plan, [])!.sequences.tech.at(-1)!;
    const cards = milestoneCoverageCards(milestone);
    const introducedGaps = milestone.gaps.filter((gap) => (
      gap.chains.some((chain) => chain.addedHere > 1e-9)
    ));

    expect(cards.slice(0, 4).map((card) => card.goodId))
      .toEqual(introducedGaps.slice(0, 4).map((gap) => gap.goodId));
  });

  test('keeps a net-neutral gap when one chain is introduced in this step', () => {
    const milestone = {
      id: 'eco-2-ascend',
      kind: 'ascend' as const,
      faction: 'eco' as const,
      tier: 2,
      populationBefore: { eco: [80, 0, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      populationAfter: { eco: [40, 80, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      gaps: [{
        goodId: 'fishery' as const,
        required: 1,
        capacity: 0,
        remaining: 1,
        baselineRequired: 1,
        previousRequired: 1,
        checkpointRequired: 1,
        addedHere: 0,
        chains: [{
          source: { faction: 'eco' as const, tier: 1, goodId: 'fishery' as const },
          faction: 'eco' as const,
          rootNodeId: 'ecoFish',
          pathNodeIds: ['ecoFish'],
          required: 0.5,
          baselineRequired: 0,
          previousRequired: 0,
          addedHere: 0.5,
        }, {
          source: { faction: 'eco' as const, tier: 0, goodId: 'fishery' as const },
          faction: 'eco' as const,
          rootNodeId: 'ecoFish',
          pathNodeIds: ['ecoFish'],
          required: 0.5,
          baselineRequired: 1,
          previousRequired: 1,
          addedHere: 0,
        }],
      }],
      complete: false,
      current: true,
    };

    const [card] = milestoneCoverageCards(milestone);

    expect(card.goodId).toBe('fishery');
    expect(card.breadcrumb.at(-1)).toBe('Eco: +80 Employees planned');
    expect(card.why.map((reason) => reason.kind)).toEqual(['changed', 'carried']);
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
        required: 3,
        capacity: 0,
        remaining: 3,
        baselineRequired: 0,
        previousRequired: 0,
        checkpointRequired: 3,
        addedHere: 2,
        chains: [{
          source: { faction: 'eco' as const, tier: 3, goodId: 'robotFactory' as const },
          faction: 'eco' as const,
          rootNodeId: 'ecoServiceBots',
          pathNodeIds: ['ecoServiceBots', 'ecoBiopolymers', 'ecoAlgae'],
          required: 1,
          baselineRequired: 0,
          previousRequired: 0,
          addedHere: 1,
        }, {
          source: { faction: 'tech' as const, tier: 1, goodId: 'functionalFoodFactory' as const },
          faction: 'tech' as const,
          rootNodeId: 'techFunctionalFood',
          pathNodeIds: ['techFunctionalFood', 'techAlgaeFunctionalFood'],
          required: 2,
          baselineRequired: 0,
          previousRequired: 1,
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
