import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';

import {
  addIsland,
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  selectWorkspace,
  setGrowthResidenceTarget,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('applies a concrete producer to an island and shrinks the current full-demand gap', async () => {
  renderApp();
  addIsland();
  await setGrowthResidenceTarget('eco', '100');

  const milestone = byTestId('growth-milestone-eco-1-expand');
  const fishGap = byTestId('growth-gap-eco-1-expand-fishery');
  const beforeCapacity = fishGap.querySelector('[data-testid="growth-gap-capacity"]')?.textContent;
  const beforeRemaining = fishGap.querySelector('[data-testid="growth-gap-remaining"]')?.textContent;
  fireEvent.click(buttonWithLabel('Build one Fishery on Island 1', milestone));

  selectWorkspace('Islands');
  expect(input('island-0-owned-fishery')).toHaveValue('1');
  selectWorkspace('Growth');
  const updated = byTestId('growth-milestone-eco-1-expand');
  const updatedFish = byTestId('growth-gap-eco-1-expand-fishery');
  expect(updatedFish.querySelector('[data-testid="growth-gap-capacity"]')).not.toHaveTextContent(beforeCapacity!);
  expect(updatedFish.querySelector('[data-testid="growth-gap-remaining"]')).not.toHaveTextContent(beforeRemaining!);
  expect(updated).toHaveTextContent('nominal output');
});

test('shows cumulative current and future milestones without pretending a target is current island demand', async () => {
  renderApp();
  await setGrowthResidenceTarget('eco', '100');
  fireEvent.click(buttonWithLabel('Eco Employees'));

  expect(byTestId('growth-milestone-eco-1-expand')).toHaveClass('growth-milestone--current');
  expect(byTestId('growth-milestone-eco-2-ascend')).toHaveClass('growth-milestone--future');
  expect(document.querySelector('.growth-milestones button[aria-label^="Build one"]')).toBeNull();

  selectWorkspace('Islands');
  expect(document.body).not.toHaveTextContent('target full demand short');
});
