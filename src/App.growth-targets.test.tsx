import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';

import { buttonWithLabel, byTestId, input, renderApp, replaceInput, selectWorkspace } from './test/app-test-utils';

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

test('keeps target controls out of the permanent residence overview', () => {
  renderApp();

  expect(document.querySelector('.population-section input')).toBeNull();
  expect(document.querySelector('.population-section button')).toBeNull();
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
