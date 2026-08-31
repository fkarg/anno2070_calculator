import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
  setIslandHouses,
  setGrowthResidenceTarget,
  selectWorkspace,
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
    expect(suggestions).toHaveTextContent('current full demand');
    expect(suggestions).not.toHaveTextContent('plan');
    expect(byTestId('island-0').querySelector('th[title="Empire-wide plan requirement"]')).toBeNull();
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
    // 'any'-placement civic buildings serve underwater cities; land ones not.
    expect(addableBuildings(0)).toContain('techCityCenter');
    expect(addableBuildings(0)).not.toContain('ecoCityCenter');
  });

  test('settled islands feed the plan houses Auto mode', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    expect(byTestId('overview-eco-target')).toHaveTextContent('10');

    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'settled'));
    expect(byTestId('overview-eco-target')).toHaveTextContent('0');
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
    expect(byTestId('overview-eco-target-tier-0')).toHaveTextContent('800');
    expect(byTestId('overview-eco-target-tier-3')).toHaveTextContent('0');
  });

  test('manual plan houses ignore islands until returned to Auto', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    await setGrowthResidenceTarget('eco', '25');
    expect(byTestId('overview-eco-target')).toHaveTextContent('25');

    selectWorkspace('Growth');
    fireEvent.click(buttonWithLabel('Target Eco by following islands'));
    expect(byTestId('overview-eco-target')).toHaveTextContent('10');
  });

  test('the add list shows the empire balance of goods with activity', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    const select = byTestId('island-0')
      .querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
    const fishery = [...select.options].find((option) => option.value === 'fishery')!;
    expect(fishery.textContent).toMatch(/^Fishery · empire -\d/);
    // No tycoon population: meat has no demand or production anywhere.
    const meat = [...select.options].find((option) => option.value === 'meatFactory')!;
    expect(meat.textContent).toBe('Meat factory');
  });

  test('zero-count buildings leave no local balance rows', async () => {
    renderApp();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '0');
    expect(document.querySelector('[data-testid="island-0-balance-fishery"]')).toBeNull();
    expect(byTestId('island-0')).toHaveTextContent('No production or demand yet.');
  });

  test('per-island operating load totals owned building costs', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    addBuilding(0, 'fishery');
    fireEvent.click(buttonWithLabel('One more Fishery on Island 1'));
    // Warehouse base (-10 credits, +6 power) plus two fisheries.
    expect(byTestId('island-0-operating-load'))
      .toHaveTextContent('maintenance credits per minute:-20power:4ecobalance:0');
  });

  test('power plants join the ledger and flip the island power balance', () => {
    renderApp();
    addIsland();
    addBuilding(0, 'fishery');
    addBuilding(0, 'windPark');
    expect(byTestId('island-0-operating-load'))
      .toHaveTextContent('maintenance credits per minute:-40power:20ecobalance:0');
    // Impact-only rows show no plan requirement or productivity input.
    expect(document.getElementById('island-0-productivity-windPark')).toBeNull();
    expect(document.getElementById('island-0-productivity-fishery')).not.toBeNull();
    // Mixed categories get divider rows; a lone category (see other tests) none.
    const groups = [...byTestId('island-0').querySelectorAll('.island-card__ledger-group')];
    expect(groups.map((group) => group.textContent)).toEqual(['Production', 'Power']);
  });

  test('deposit-gated material buildings appear only with the deposit configured', () => {
    renderApp();
    addIsland();
    expect(addableBuildings(0)).toContain('smelter');
    expect(addableBuildings(0)).not.toContain('uraniumMine');

    openConfiguration('Island 1');
    fireEvent.click(buttonWithLabel('Island 1 Uranium deposit: not present'));
    expect(addableBuildings(0)).toContain('uraniumMine');
  });

  test('local shortfalls sourced elsewhere read import, with the empire ratio when short', async () => {
    renderApp();
    addIsland();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');
    openConfiguration('Island 2');
    fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-1')));
    fireEvent.click(buttonWithLabel('Finish configuring island Island 2'));
    await setIslandHouses(1, 'eco', '100');

    // 800 workers demand 3.2 fish; the empire produces 2 -> import at 63%.
    const cell = () => byTestId('island-1-balance-fishery')
      .querySelector('.island-card__coverage-cell')!;
    expect(cell()).toHaveTextContent('import 63%');

    // Genuinely short empire-wide: still worth suggesting locally.
    expect(byTestId('island-1-suggestions')
      .querySelector('[aria-label="Build one Fishery on Island 2"]')).not.toBeNull();

    // Fully covered empire-wide: the plain import label, and the negative
    // balance number drops the shortfall alarm color.
    await replaceInput(input('island-0-owned-fishery'), '4');
    expect(cell().textContent).toContain('import');
    expect(cell().textContent).not.toContain('%');
    const balanceCell = byTestId('island-1-balance-fishery').querySelectorAll('td')[2];
    expect(balanceCell.classList.contains('balance--import')).toBe(true);
    expect(balanceCell.classList.contains('balance--shortfall')).toBe(false);
    // Imported goods leave Build next — they need a route, not a building.
    expect(document.querySelector('[aria-label="Build one Fishery on Island 2"]')).toBeNull();
  });

  test('underwater islands show no ecobalance in the operating load', () => {
    renderApp();
    addIsland();
    openConfiguration('Island 1');
    fireEvent.click(flagCheckbox(0, 'underwater'));
    addBuilding(0, 'electronicsRecycler');
    // Deep sea warehouse base -60/+8 plus the recycler.
    expect(byTestId('island-0-operating-load'))
      .toHaveTextContent('maintenance credits per minute:-220power:-27ecobalance:—');
  });
});
