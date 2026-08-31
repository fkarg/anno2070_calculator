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
  setIslandHouses,
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

test('shows faction-local current and future milestones without pretending a target is current island demand', async () => {
  renderApp();
  await setGrowthResidenceTarget('eco', '100');
  fireEvent.click(buttonWithLabel('Eco Employees'));

  expect(byTestId('growth-milestone-eco-1-expand')).toHaveClass('growth-milestone--current');
  expect(byTestId('growth-milestone-eco-2-ascend')).toHaveClass('growth-milestone--future');
  expect(document.querySelector('.growth-milestones button[aria-label^="Build one"]')).toBeNull();

  selectWorkspace('Islands');
  expect(document.body).not.toHaveTextContent('target full demand short');
});

test('separates actual shortages from parallel faction growth steps', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'tech', '10');
  await setGrowthResidenceTarget('eco', '100');
  fireEvent.click(buttonWithLabel('Eco Engineers'));

  const baseline = byTestId('growth-baseline');
  const eco = byTestId('growth-sequence-eco');
  const engineers = byTestId('growth-milestone-eco-3-ascend');
  const carried = engineers.querySelector('.growth-milestone__carried');

  expect(baseline).toHaveTextContent('Supply current population');
  expect(baseline).toHaveTextContent('Aquafarm');
  expect(eco).toHaveTextContent('Changed in this step');
  expect(engineers.querySelector(':scope > summary')).toHaveTextContent(
    /\d+ gaps · \d+ changed here · \d+ carried/,
  );
  expect(carried).not.toBeNull();
  expect(carried).toHaveTextContent('Carried gaps');
  expect(carried).toHaveTextContent('Already required by current population');
  expect(carried?.querySelector('[data-testid="growth-gap-eco-3-ascend-aquafarm"]'))
    .not.toBeNull();
  expect(carried).toHaveTextContent('Why required?');
  expect(carried).toHaveTextContent('Tech');
  expect(carried).toHaveTextContent('Functional food factory');
});

test('keeps an ignored future demand visible while it is inactive', async () => {
  renderApp();
  await setGrowthResidenceTarget('tech', '100');
  fireEvent.click(buttonWithLabel('Tech Geniuses'));
  fireEvent.click(buttonWithLabel('Ignore Tech · Geniuses · Bionics factory everywhere'));

  const manager = byTestId('ignored-demand-manager');
  fireEvent.click(manager.querySelector('summary')!);
  expect(manager).toHaveTextContent('Tech · Geniuses · Bionics factory');
  expect(manager).toHaveTextContent('Not currently applicable');
});
