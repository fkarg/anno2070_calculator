import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { GrowthMilestone, GrowthPlanningResult } from '../calculations/planning';
import { createIsland } from '../island';
import { CoverageSection } from './CoverageSection';

const emptyPopulations = {
  eco: [0, 0, 0, 0],
  tycoon: [0, 0, 0, 0],
  tech: [0, 0, 0],
};
const gap = {
  goodId: 'fishery' as const,
  required: 1,
  capacity: 0,
  remaining: 1,
  baselineRequired: 0,
  previousRequired: 0,
  checkpointRequired: 1,
  addedHere: 1,
  chains: [],
};

function milestone(tier: number, complete: boolean): GrowthMilestone {
  const populationAfter = {
    ...emptyPopulations,
    eco: tier === 1 ? [80, 0, 0, 0] : [160, 400, 0, 0],
  };
  return {
    id: `eco-${tier}-step`,
    kind: tier === 1 ? 'expand' : 'ascend',
    faction: 'eco',
    tier,
    populationBefore: emptyPopulations,
    populationAfter,
    gaps: complete ? [] : [gap],
    complete,
    current: !complete,
  };
}

test('keeps the first four milestone gaps as cards and the rest as later gaps', () => {
  const first = milestone(1, false);
  const goodIds = [
    'fishery',
    'teaPlantation',
    'riceFarm',
    'farmhouse',
    'healthFoodFactory',
  ] as const;
  const manyGaps: GrowthPlanningResult = {
    baseline: { gaps: [], complete: true, current: false },
    sequences: {
      eco: [{ ...first, gaps: goodIds.map((goodId) => ({ ...gap, goodId })) }],
      tycoon: [],
      tech: [],
    },
  };

  render(<CoverageSection islands={[]} planning={manyGaps} onApplyBuilding={vi.fn()} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Show Eco Workers coverage' }));

  expect(document.querySelectorAll('.bottleneck-card')).toHaveLength(4);
  expect(screen.getByTestId('coverage-later-gaps')).toHaveTextContent('Health food factory');
});

function planning(firstComplete: boolean, secondComplete: boolean): GrowthPlanningResult {
  return {
    baseline: { gaps: [], complete: true, current: false },
    sequences: {
      eco: [milestone(1, firstComplete), milestone(2, secondComplete)],
      tycoon: [],
      tech: [],
    },
  };
}

test('advances a selected faction context, then falls back to Current', () => {
  const props = { islands: [createIsland('Actual')], onApplyBuilding: vi.fn() };
  const view = render(<CoverageSection {...props} planning={planning(false, false)} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Show Eco Workers coverage' }));

  view.rerender(<CoverageSection {...props} planning={planning(true, false)} />);
  expect(screen.getByRole('tab', { name: 'Show Eco Employees coverage' }))
    .toHaveAttribute('aria-selected', 'true');

  view.rerender(<CoverageSection {...props} planning={planning(true, true)} />);
  expect(screen.getByRole('tab', { name: 'Show Current coverage' }))
    .toHaveAttribute('aria-selected', 'true');
});
