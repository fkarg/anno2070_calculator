import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

function addIsland() {
  const button = [...document.querySelectorAll<HTMLButtonElement>('.islands-section button')]
    .find((candidate) => candidate.textContent === 'Add island')!;
  fireEvent.click(button);
}

function showAllBuildable(islandIndex: number) {
  const checkbox = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLInputElement>('.island-card__ledger-heading input')!;
  if (!checkbox.checked) fireEvent.click(checkbox);
}

describe('islands section', () => {
  test('new islands open in edit mode; Done collapses to a summary card', async () => {
    renderApp();
    addIsland();
    const name = document.querySelector<HTMLInputElement>('[aria-label="Island 1 name"]')!;
    await replaceInput(name, 'Walbruck Bay');
    await replaceInput(input('island-0-eco-houses'), '100');

    fireEvent.click(buttonWithLabel('Finish editing island Walbruck Bay'));
    expect(document.querySelector('[aria-label="Island 1 name"]')).toBeNull();
    expect(byTestId('island-0')).toHaveTextContent('Walbruck Bay');
    expect(byTestId('island-0-summary-eco')).toHaveTextContent('100 houses → 160 / 480 / 725 / 760');

    fireEvent.click(buttonWithLabel('Edit island Walbruck Bay'));
    expect(input('island-0-eco-houses')).toHaveValue('100');
  });

  test('island residences produce local demand and population', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '100');
    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[1].textContent).not.toBe('0');
    expect(fishRow.querySelectorAll('td')[2].textContent).toMatch(/^-/);
  });

  test('stepper-owned fisheries flip the local fish balance to surplus', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    // Fishery appears in the ledger because the plan now requires fish.
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    expect(input('island-0-owned-fishery')).toHaveValue('1');
    await replaceInput(input('island-0-owned-fishery'), '3');

    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[0].textContent).toBe('3');
    expect(fishRow.querySelector('.balance--surplus')).not.toBeNull();
  });

  test('fertilities gate the ledger: absent hides, present or open slot shows', () => {
    renderApp();
    addIsland();
    showAllBuildable(0);
    expect(document.getElementById('island-0-owned-teaPlantation')).toBeNull();
    expect(document.getElementById('island-0-owned-fishery')).not.toBeNull();

    fireEvent.click(buttonWithLabel('Island 1 Tea: not present'));
    expect(document.getElementById('island-0-owned-teaPlantation')).not.toBeNull();

    fireEvent.click(buttonWithLabel('Island 1 Tea: present'));
    expect(document.getElementById('island-0-owned-teaPlantation')).toBeNull();
    fireEvent.click(buttonWithLabel('Island 1 open fertility slot: none'));
    expect(document.getElementById('island-0-owned-teaPlantation')).not.toBeNull();
    // The open slot never enables deposit buildings.
    expect(document.getElementById('island-0-owned-copperMine')).toBeNull();
  });

  test('underwater islands only offer underwater buildings', () => {
    renderApp();
    addIsland();
    showAllBuildable(0);
    expect(document.getElementById('island-0-owned-electronicsRecycler')).toBeNull();

    const underwater = byTestId('island-0')
      .querySelectorAll<HTMLInputElement>('.island-card__flags input')[1];
    fireEvent.click(underwater);
    expect(byTestId('island-0')).toHaveTextContent('underwater');
    expect(document.getElementById('island-0-owned-electronicsRecycler')).not.toBeNull();
    expect(document.getElementById('island-0-owned-fishery')).toBeNull();
  });

  test('settled islands feed the plan houses Auto mode', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    expect(input('eco-houses')).toHaveValue('10');

    const settled = byTestId('island-0')
      .querySelectorAll<HTMLInputElement>('.island-card__flags input')[0];
    fireEvent.click(settled);
    expect(input('eco-houses')).toHaveValue('0');
  });

  test('island population limits propagate into the plan populations', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '100');
    // Limit the island to tier 1: the plan's Auto populations follow the
    // island's actual distribution, not its own ascension model.
    fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-0')));
    expect(input('eco-population-0')).toHaveValue('800');
    expect(input('eco-population-3')).toHaveValue('0');
  });

  test('manual plan houses ignore islands until returned to Auto', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    await replaceInput(input('eco-houses'), '25');
    expect(input('eco-houses')).toHaveValue('25');

    fireEvent.click(buttonWithLabel('Use island Eco houses'));
    expect(input('eco-houses')).toHaveValue('10');
  });
});
