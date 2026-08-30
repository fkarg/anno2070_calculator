import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  byTestId,
  input,
  productionRow,
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

function addBuilding(islandIndex: number, buildingId: string) {
  const select = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
  fireEvent.change(select, { target: { value: buildingId } });
}

describe('actuals in the production view', () => {
  test('canonical rows carry a labeled actual line; alternatives stay plan-only', async () => {
    renderApp();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    const extras = byTestId('extras-ecoFish');
    // own and capacity merge into one cell; the arrow only appears when they differ.
    expect(extras).toHaveTextContent('own 2');
    expect(extras).not.toHaveTextContent('→');
    // No plan demand: the plan is covered, shown as surplus, not a shortage.
    expect(extras.querySelector('.balance--surplus')).toHaveTextContent('over 2');
    expect(byTestId('actuals-ecoFish')).toHaveTextContent('maintenance credits per minute:-10');

    const alternative = productionRow('ecoElectronicsRecyclerCommunicators');
    expect(alternative.querySelector('[data-testid^="actuals-"]')).toBeNull();
  });

  test('alternative producers contribute converted capacity and their actual costs', async () => {
    renderApp();
    addIsland();
    fireEvent.click(
      [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.getAttribute('aria-label') === 'Configure island Island 1')!,
    );
    const underwater = byTestId('island-0')
      .querySelectorAll<HTMLInputElement>('.island-card__flags input[type="checkbox"]')[1];
    fireEvent.click(underwater);
    addBuilding(0, 'electronicsRecycler');
    await replaceInput(input('island-0-owned-electronicsRecycler'), '2');

    // 2 recyclers = 3 chip-factory units; costs are the recyclers' flat costs.
    expect(byTestId('extras-ecoMicrochipsCommunicators')).toHaveTextContent('own 2→3');
    expect(byTestId('actuals-ecoMicrochipsCommunicators')).toHaveTextContent('maintenance credits per minute:-320');
  });

  test('the build gap is a planning number, not an actual shortage', async () => {
    renderApp();
    addIsland();
    // Population creates plan demand for fish; no fisheries owned yet.
    await setIslandHouses(0, 'eco', '100');
    const fish = byTestId('extras-ecoFish');
    expect(fish).toHaveTextContent('build 4.18');

    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '5');
    expect(byTestId('extras-ecoFish')).toHaveTextContent('over 0.83');
  });

  test('owned buildings drive the actual operating impact summary', async () => {
    renderApp();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    // Includes the settled island's warehouse base (-10 credits, +6 power).
    expect(byTestId('owned-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-20power:4ecobalance:0');
  });

  test('transfer needs list surplus and deficit islands per good', async () => {
    renderApp();
    addIsland();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');
    await setIslandHouses(1, 'eco', '500');

    const fish = byTestId('transfer-fishery');
    expect(fish).toHaveTextContent('surplus Island 1 (+2)');
    expect(fish).toHaveTextContent('deficit Island 2');
    expect(fish.classList.contains('transfer-need--empire-shortfall')).toBe(true);

    await replaceInput(input('island-0-owned-fishery'), '200');
    expect(byTestId('transfer-fishery').classList.contains('transfer-need--empire-shortfall')).toBe(false);
  });
});
