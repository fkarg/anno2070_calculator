import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
  setIslandHouses,
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

function addBuilding(islandIndex: number, buildingId: string) {
  const select = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
  fireEvent.change(select, { target: { value: buildingId } });
}

function addableBuildings(islandIndex: number): string[] {
  const select = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
  return [...select.options].map((option) => option.value).filter((value) => value !== '');
}

describe('islands section', () => {
  test('cards edit houses directly; rarely-changed config sits behind Configure', async () => {
    renderApp();
    addIsland();
    // Houses are editable on the card without entering any mode.
    await setIslandHouses(0, 'eco', '100');
    // Per-tier populations are reveal-edit minis on the card itself.
    expect(input('island-0-eco-population-0')).toHaveValue('160');
    expect(input('island-0-eco-population-2')).toHaveValue('725');
    await replaceInput(input('island-0-eco-population-3'), '0');
    expect(input('island-0-eco-population-2')).toHaveValue('1200');
    fireEvent.click(buttonWithLabel('Use automatic Island 1 Eco Executives population'));
    expect(input('island-0-eco-population-3')).toHaveValue('760');
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
    await setIslandHouses(0, 'eco', '100');
    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[1].textContent).not.toBe('0');
    expect(fishRow.querySelectorAll('td')[2].textContent).toMatch(/^-/);
  });

  test('stepper-owned fisheries flip the local fish balance to surplus', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    addBuilding(0, 'fishery');
    expect(input('island-0-owned-fishery')).toHaveValue('1');
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    expect(input('island-0-owned-fishery')).toHaveValue('2');
    await replaceInput(input('island-0-owned-fishery'), '3');

    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[0].textContent).toBe('3');
    expect(fishRow.querySelector('.balance--surplus')).not.toBeNull();
  });

  test('build-next suggestions add a buildable producer for the biggest deficit', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');

    const suggestions = byTestId('island-0-suggestions');
    expect(suggestions).toHaveTextContent('Build next:');
    fireEvent.click(buttonWithLabel('Build one Fishery on Island 1', suggestions));
    expect(input('island-0-owned-fishery')).toHaveValue('1');
  });

  test('fertilities gate the add list: absent hides, present or open slot shows', () => {
    renderApp();
    addIsland();
    expect(addableBuildings(0)).not.toContain('teaPlantation');
    expect(addableBuildings(0)).toContain('fishery');

    openConfiguration('Island 1');
    fireEvent.click(buttonWithLabel('Island 1 Tea: not present'));
    expect(addableBuildings(0)).toContain('teaPlantation');
    expect(byTestId('island-0-fertilities').querySelector('img[alt="Tea"]')).not.toBeNull();

    fireEvent.click(buttonWithLabel('Island 1 Tea: present'));
    expect(addableBuildings(0)).not.toContain('teaPlantation');
    fireEvent.click(buttonWithLabel('Island 1 open fertility slot: none'));
    expect(addableBuildings(0)).toContain('teaPlantation');
    // The open slot never enables deposit buildings.
    expect(addableBuildings(0)).not.toContain('copperMine');
  });

  test('underwater islands only offer underwater buildings', () => {
    renderApp();
    addIsland();
    expect(addableBuildings(0)).not.toContain('electronicsRecycler');

    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'underwater'));
    expect(byTestId('island-0')).toHaveTextContent('underwater');
    expect(addableBuildings(0)).toContain('electronicsRecycler');
    expect(addableBuildings(0)).not.toContain('fishery');
  });

  test('settled islands feed the plan houses Auto mode', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    expect(input('eco-houses')).toHaveValue('10');

    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'settled'));
    expect(input('eco-houses')).toHaveValue('0');
  });

  test('island population limits propagate into the plan stats view', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    openConfiguration('Island 1');
    // Limit the island to tier 1: the plan's Auto stats follow the island's
    // actual distribution, not the plan's own ascension model.
    fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-0')));
    // Reveal-edit: the Auto values are visible and directly editable.
    expect(input('eco-population-0')).toHaveValue('800');
    expect(input('eco-population-3')).toHaveValue('0');
  });

  test('manual plan houses ignore islands until returned to Auto', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
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
    await setIslandHouses(0, 'eco', '10');
    addBuilding(0, 'fishery');
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    expect(byTestId('island-0-operating-load'))
      .toHaveTextContent('maintenance credits per minute:-10power:-2ecobalance:0');
  });
});
