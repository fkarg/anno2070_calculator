import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  byTestId,
  input,
  productionRow,
  renderApp,
  replaceInput,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

function addIsland() {
  const button = [...document.querySelectorAll<HTMLButtonElement>('.islands-section button')]
    .find((candidate) => candidate.textContent === 'Add island')!;
  fireEvent.click(button);
}

function addBuilding(islandLabel: string, buildingId: string) {
  const select = document.querySelector<HTMLSelectElement>(`[aria-label="Add building to ${islandLabel}"]`)!;
  fireEvent.change(select, { target: { value: buildingId } });
}

describe('actuals in the production view', () => {
  test('canonical rows show owned, capacity, and balance; alternatives stay empty', async () => {
    renderApp();
    addIsland();
    addBuilding('Island 1', 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    const actuals = byTestId('actuals-ecoFish');
    expect(actuals).toHaveTextContent('2');
    expect(actuals.querySelector('.balance--surplus')).not.toBeNull();

    const alternative = productionRow('ecoElectronicsRecyclerCommunicators');
    expect(alternative.querySelector('[data-testid^="actuals-"]')).toBeNull();
  });

  test('alternative producers contribute converted capacity to the canonical row', async () => {
    renderApp();
    addIsland();
    addBuilding('Island 1', 'electronicsRecycler');
    await replaceInput(input('island-0-owned-electronicsRecycler'), '2');

    // 2 recyclers = 3 chip-factory units; owned counts both producer types.
    const chips = byTestId('actuals-ecoMicrochipsCommunicators');
    expect(chips).toHaveTextContent('3');
  });

  test('owned buildings drive the actual operating impact summary', async () => {
    renderApp();
    addIsland();
    addBuilding('Island 1', 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    expect(byTestId('owned-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-10power:-2ecobalance:0');
  });

  test('transfer needs list surplus and deficit islands per good', async () => {
    renderApp();
    addIsland();
    addIsland();
    addBuilding('Island 1', 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');
    await replaceInput(input('island-1-eco-houses'), '500');

    const fish = byTestId('transfer-fishery');
    expect(fish).toHaveTextContent('surplus Island 1 (+2)');
    expect(fish).toHaveTextContent('deficit Island 2');
    expect(fish.classList.contains('transfer-need--empire-shortfall')).toBe(true);

    await replaceInput(input('island-0-owned-fishery'), '200');
    expect(byTestId('transfer-fishery').classList.contains('transfer-need--empire-shortfall')).toBe(false);
  });
});
