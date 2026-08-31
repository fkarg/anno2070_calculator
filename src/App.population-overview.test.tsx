import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';

import { addIsland, buttonWithLabel, byTestId, input, renderApp, replaceInput, selectWorkspace, setIslandHouses } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('keeps the residence overview above every workspace without redundant mirrored targets', () => {
  renderApp();
  const residences = document.querySelector('.population-section')!;

  expect(residences).toHaveTextContent('Residences & inhabitants');
  expect(residences).toHaveTextContent('Actual');
  expect(residences).not.toHaveTextContent('Target');
  expect(residences).toHaveTextContent('Headroom / limit');
  expect(residences.querySelectorAll('input')).toHaveLength(6);

  selectWorkspace('Growth');
  expect(document.querySelector('.population-section')).toBe(residences);
  expect(residences).toBeVisible();
  expect(document.querySelector('#workspace-growth .population-section')).toBeNull();
});

test('keeps mirrored Follow mode when actual inputs are invalid', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'eco', 'invalid');

  const eco = document.querySelector('.population-faction--eco')!;
  expect(eco.querySelector('.population-faction__mode')).toHaveTextContent('Following actual tiers');
  expect(eco.querySelector('output[aria-label="Eco actual residences"]')).toHaveTextContent('—');
  expect(eco.querySelector('output[aria-label="Eco target residences"]')).toBeNull();
  expect(eco.querySelector('output[aria-label="Eco actual Workers"]')).toHaveTextContent('—');
  expect(eco.querySelector('output[aria-label="Eco target Workers"]')).toBeNull();
});

test('shows headroom and its chain limit for every population tier', async () => {
  renderApp();
  addIsland();
  fireEvent.click(buttonWithLabel('Configure island Island 1'));
  fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-0')));
  fireEvent.click(buttonWithLabel('Island 1 Tea: not present'));
  fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
  await setIslandHouses(0, 'eco', '100');

  const select = byTestId('island-0').querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
  fireEvent.change(select, { target: { value: 'fishery' } });
  await replaceInput(input('island-0-owned-fishery'), '5');
  fireEvent.change(select, { target: { value: 'teaPlantation' } });
  await replaceInput(input('island-0-owned-teaPlantation'), '5');

  expect(document.querySelector('.population-section')).toHaveTextContent('Headroom / limit');
  expect(byTestId('overview-eco-headroom-tier-0')).toHaveTextContent('+450 · Fishery');
  expect(byTestId('overview-eco-headroom-tier-1')).toHaveTextContent('+655 · Fishery');
  expect(byTestId('overview-eco-headroom-tier-2')).toHaveTextContent('+1027 · Fishery');
  expect(byTestId('overview-eco-headroom-tier-3')).toHaveTextContent('+1440 · Fishery');
});
