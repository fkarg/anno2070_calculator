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

function openConfiguration(name: string) {
  fireEvent.click(buttonWithLabel(`Configure island ${name}`));
}

function flagCheckbox(islandIndex: number, flag: 'settled' | 'underwater'): HTMLInputElement {
  const checkboxes = byTestId(`island-${islandIndex}`)
    .querySelectorAll<HTMLInputElement>('.island-card__flags input[type="checkbox"]');
  return checkboxes[flag === 'settled' ? 0 : 1];
}

function showAllBuildable(islandIndex: number) {
  const checkbox = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLInputElement>('.island-card__ledger-heading input')!;
  if (!checkbox.checked) fireEvent.click(checkbox);
}

describe('islands section', () => {
  test('cards edit houses directly; rarely-changed config sits behind Configure', async () => {
    renderApp();
    addIsland();
    // Houses are editable on the card without entering any mode.
    await replaceInput(input('island-0-eco-houses'), '100');
    expect(byTestId('island-0-summary-eco')).toHaveTextContent('160 / 480 / 725 / 760');
    expect(document.querySelector('[aria-label="Island 1 name"]')).toBeNull();

    openConfiguration('Island 1');
    const name = document.querySelector<HTMLInputElement>('[aria-label="Island 1 name"]')!;
    await replaceInput(name, 'Walbruck Bay');
    fireEvent.click(buttonWithLabel('Finish configuring island Walbruck Bay'));
    expect(document.querySelector('[aria-label="Island 1 name"]')).toBeNull();
    expect(byTestId('island-0')).toHaveTextContent('Walbruck Bay');
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
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    expect(input('island-0-owned-fishery')).toHaveValue('1');
    await replaceInput(input('island-0-owned-fishery'), '3');

    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[0].textContent).toBe('3');
    expect(fishRow.querySelector('.balance--surplus')).not.toBeNull();
  });

  test('build-next suggestions add a buildable producer for the biggest deficit', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '100');

    const suggestions = byTestId('island-0-suggestions');
    expect(suggestions).toHaveTextContent('Build next:');
    fireEvent.click(buttonWithLabel('Build one Fishery on Island 1', suggestions));
    expect(input('island-0-owned-fishery')).toHaveValue('1');
  });

  test('fertilities gate the ledger: absent hides, present or open slot shows', () => {
    renderApp();
    addIsland();
    showAllBuildable(0);
    expect(document.getElementById('island-0-owned-teaPlantation')).toBeNull();
    expect(document.getElementById('island-0-owned-fishery')).not.toBeNull();

    openConfiguration('Island 1');
    fireEvent.click(buttonWithLabel('Island 1 Tea: not present'));
    expect(document.getElementById('island-0-owned-teaPlantation')).not.toBeNull();
    expect(byTestId('island-0-fertilities').querySelector('img[alt="Tea"]')).not.toBeNull();

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

    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'underwater'));
    expect(byTestId('island-0')).toHaveTextContent('underwater');
    expect(document.getElementById('island-0-owned-electronicsRecycler')).not.toBeNull();
    expect(document.getElementById('island-0-owned-fishery')).toBeNull();
  });

  test('settled islands feed the plan houses Auto mode', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    expect(input('eco-houses')).toHaveValue('10');

    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'settled'));
    expect(input('eco-houses')).toHaveValue('0');
  });

  test('island population limits propagate into the plan stats view', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '100');
    openConfiguration('Island 1');
    // Limit the island to tier 1: the plan's Auto stats follow the island's
    // actual distribution, not the plan's own ascension model.
    fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-0')));
    expect(byTestId('eco-population-0')).toHaveTextContent('800');
    expect(byTestId('eco-population-3')).toHaveTextContent('0');
    // Auto plan factions expose no tier or override controls.
    expect(document.getElementById('eco-population-0')).toBeNull();
  });

  test('manual plan houses ignore islands until returned to Auto', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    await replaceInput(input('eco-houses'), '25');
    expect(input('eco-houses')).toHaveValue('25');
    // Manual mode restores the full planning controls.
    expect(document.getElementById('eco-population-0')).not.toBeNull();

    fireEvent.click(buttonWithLabel('Use island Eco houses'));
    expect(input('eco-houses')).toHaveValue('10');
  });

  test('per-island operating load totals owned building costs', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    expect(byTestId('island-0-operating-load'))
      .toHaveTextContent('maintenance credits per minute:-10power:-2ecobalance:0');
  });
});
