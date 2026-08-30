import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
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

  test('with no owned production at all, only the unbuilt list appears', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');

    expect(document.querySelector('.bottleneck-card')).toBeNull();
    expect(byTestId('coverage-unbuilt')).toHaveTextContent('Fishery');
  });
});
