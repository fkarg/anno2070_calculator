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

function addBuilding(islandIndex: number, buildingId: string) {
  const select = byTestId(`island-${islandIndex}`)
    .querySelector<HTMLSelectElement>('.island-card__ledger-heading select')!;
  fireEvent.change(select, { target: { value: buildingId } });
}

describe('coverage and bottlenecks', () => {
  test('uses current full demand language without a separate plan frame', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    await replaceInput(input('eco-houses'), '20');

    expect(document.body).not.toHaveTextContent('Toward plan');
  });
  test('outgrown production leads the cards; unbuilt chains collapse to a list', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    // Fisheries exist but the population outgrew them: a ranked card.
    expect(byTestId('bottleneck-demand-fishery')).toHaveTextContent('Fishery');
    // Tea has no producer anywhere: no card, only the compact list.
    expect(document.querySelector('[data-testid="bottleneck-demand-teaPlantation"]')).toBeNull();
    expect(byTestId('coverage-unbuilt')).toHaveTextContent('Chains not built yet:');
    expect(byTestId('coverage-unbuilt')).toHaveTextContent('Tea plantation');
  });

  test('headroom shows the supportable population increase and its limit', async () => {
    renderApp();
    addIsland();
    fireEvent.click(buttonWithLabel('Configure island Island 1'));
    fireEvent.click(buttonWithLabel('Eco Workers', byTestId('island-0')));
    fireEvent.click(buttonWithLabel('Island 1 Tea: not present'));
    fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
    await setIslandHouses(0, 'eco', '100');
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '5');
    addBuilding(0, 'teaPlantation');
    await replaceInput(input('island-0-owned-teaPlantation'), '5');

    // 800 workers eat 3.2 fish and 2.14 tea buildings; the 1.8 spare fish
    // buildings feed 450 more workers = 56 fully ascended houses.
    const headroom = byTestId('coverage-headroom');
    expect(headroom).toHaveTextContent('Eco');
    expect(headroom).toHaveTextContent('room for +450 Workers (≈ 56 houses)');
    expect(headroom).toHaveTextContent('Fishery runs out');
  });

  test('with no owned production at all, only the unbuilt list appears', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');

    expect(document.querySelector('.bottleneck-card')).toBeNull();
    expect(byTestId('coverage-unbuilt')).toHaveTextContent('Fishery');
  });
});
