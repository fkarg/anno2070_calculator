import { describe, expect, test } from 'vitest';

import type { GrowthMilestone } from '../calculations/planning';
import { growthMilestonePopulationSummary, growthMilestoneTitle } from './growth-milestone-labels';

const populations = {
  eco: [0, 0, 0, 0],
  tycoon: [0, 0, 0, 0],
  tech: [0, 1200, 0],
};

const milestone: GrowthMilestone = {
  id: 'tech-3-ascend-at-1',
  kind: 'ascend',
  faction: 'tech',
  tier: 3,
  populationBefore: populations,
  populationAfter: { ...populations, tech: [0, 1198, 1] },
  gate: { required: 1200, available: 1200, met: true },
  unlockedGoodIds: ['laboratoryOutfitter'],
  unlocksAscensionTo: null,
  checkpointPopulation: 1,
  gaps: [],
  complete: true,
  current: false,
};

describe('growth milestone labels', () => {
  test('names an exact demand unlock checkpoint', () => {
    expect(growthMilestoneTitle(milestone)).toBe('1 Genius unlocks Laboratory outfitter');
    expect(growthMilestonePopulationSummary(milestone)).toBe('+1 Geniuses');
  });

  test('explains a blocked ascension using the actual gate population', () => {
    const blocked = {
      ...milestone,
      populationAfter: populations,
      gate: { required: 1200, available: 900, met: false },
      unlockedGoodIds: [],
      checkpointPopulation: null,
      complete: false,
    };
    expect(growthMilestoneTitle(blocked)).toBe('Reach 1200 Researchers to unlock Geniuses');
    expect(growthMilestonePopulationSummary(blocked))
      .toBe('Ascension locked · 900 / 1200 Researchers');
  });
});
