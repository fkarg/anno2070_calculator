import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';

import { addIsland, buttonWithLabel, byTestId, input, renderApp, replaceInput, selectWorkspace, setIslandHouses } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('sets a population-driven target in Growth and projects it into the residence overview', async () => {
  renderApp();
  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel('Target Tech by population'));
  fireEvent.click(buttonWithLabel('Tech Geniuses target tier'));
  await replaceInput(input('growth-tech-population-target'), '2500');

  expect(byTestId('growth-tech-derived')).toHaveTextContent('279 residences');
  expect(byTestId('overview-tech-target')).toHaveTextContent('279');
  expect(byTestId('overview-tech-target-tier-2')).toHaveTextContent('2500');
  expect(document.querySelector('.population-section')).toHaveTextContent('Headroom / limit');
});

test('owns faction-global population bonuses in the permanent overview', async () => {
  renderApp();
  addIsland();
  fireEvent.click(buttonWithLabel('Configure island Island 1'));
  fireEvent.click(buttonWithLabel('Tech Geniuses', byTestId('island-0')));
  await replaceInput(input('island-0-config-tech-houses'), '100');
  fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
  const tech = document.querySelector('.population-faction--tech')!;
  expect(byTestId('overview-tech-actual-tier-2')).toHaveTextContent('900');

  fireEvent.click(input('overview-tech-living-space'));
  fireEvent.click(input('overview-tech-senate'));

  expect(input('overview-tech-living-space')).toBeChecked();
  expect(input('overview-tech-senate')).toBeChecked();
  expect(byTestId('overview-tech-actual-tier-2')).toHaveTextContent('1176');
  expect(tech).toBeVisible();
});

test('switches Follow islands from mirrored actuals to unrestricted ascension', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'tech', '100');

  const tech = document.querySelector('.population-faction--tech')!;
  expect(tech).toHaveAttribute('data-target-layout', 'mirror');
  expect(tech).toHaveTextContent('Following actual tiers');

  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel('Project Tech through unrestricted ascension'));

  expect(tech).toHaveAttribute('data-target-layout', 'target');
  expect(tech).toHaveTextContent('Following houses · unrestricted ascension');
  expect(byTestId('overview-tech-target-tier-2')).toHaveTextContent('900');
});

test('steps residence targets by ten without going below zero', async () => {
  renderApp();
  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel('Target Eco by residences'));

  fireEvent.click(buttonWithLabel('Increase Eco target residences by 10'));
  expect(input('growth-eco-houses')).toHaveValue('10');
  fireEvent.click(buttonWithLabel('Decrease Eco target residences by 10'));
  fireEvent.click(buttonWithLabel('Decrease Eco target residences by 10'));
  expect(input('growth-eco-houses')).toHaveValue('0');
});

test('distinguishes a requested population from whole-residence achievement and override shortfall', async () => {
  renderApp();
  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel('Target Tech by population'));
  fireEvent.click(buttonWithLabel('Tech Geniuses target tier'));
  await replaceInput(input('growth-tech-population-target'), '2501');

  expect(byTestId('growth-tech-derived')).toHaveTextContent('Requested 2501 Geniuses');
  expect(byTestId('growth-tech-derived')).toHaveTextContent('Achieved 2550');
  expect(byTestId('growth-tech-derived')).toHaveTextContent('Overshoot 49');

  await replaceInput(input('growth-tech-population-2'), '2400');
  expect(byTestId('growth-tech-derived')).toHaveTextContent('Target not met after overrides');
});
