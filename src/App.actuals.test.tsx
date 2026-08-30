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

function showAllBuildable(islandIndex: number) {
  const checkbox = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLInputElement>('.island-card__ledger-heading input')!;
  if (!checkbox.checked) fireEvent.click(checkbox);
}

describe('actuals in the production view', () => {
  test('canonical rows carry a labeled actual line; alternatives stay plan-only', async () => {
    renderApp();
    addIsland();
    showAllBuildable(0);
    await replaceInput(input('island-0-owned-fishery'), '2');

    const actuals = byTestId('actuals-ecoFish');
    expect(actuals).toHaveTextContent('act');
    // own and capacity merge into one cell; the arrow only appears when they differ.
    expect(actuals).toHaveTextContent('own 2');
    expect(actuals).not.toHaveTextContent('→');
    // No plan demand: the plan is covered, shown as surplus, not a shortage.
    expect(actuals.querySelector('.balance--surplus')).toHaveTextContent('over 2');

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
    showAllBuildable(0);
    await replaceInput(input('island-0-owned-electronicsRecycler'), '2');

    // 2 recyclers = 3 chip-factory units; costs are the recyclers' flat costs.
    const chips = byTestId('actuals-ecoMicrochipsCommunicators');
    expect(chips).toHaveTextContent('own 2→3');
    expect(chips).toHaveTextContent('maintenance credits per minute:-320');
  });

  test('the build gap is a planning number, not an actual shortage', async () => {
    renderApp();
    addIsland();
    // Population creates plan demand for fish; no fisheries owned yet.
    await replaceInput(input('island-0-eco-houses'), '100');
    const fish = byTestId('actuals-ecoFish');
    expect(fish).toHaveTextContent('build 4.18');

    showAllBuildable(0);
    await replaceInput(input('island-0-owned-fishery'), '5');
    expect(byTestId('actuals-ecoFish')).toHaveTextContent('over 0.83');
  });

  test('owned buildings drive the actual operating impact summary', async () => {
    renderApp();
    addIsland();
    showAllBuildable(0);
    await replaceInput(input('island-0-owned-fishery'), '2');

    expect(byTestId('owned-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-10power:-2ecobalance:0');
  });

  test('transfer needs list surplus and deficit islands per good', async () => {
    renderApp();
    addIsland();
    addIsland();
    showAllBuildable(0);
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
