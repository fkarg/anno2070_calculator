import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
  selectWorkspace,
  setGrowthResidenceTarget,
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

  test('keeps Current as the default and exposes active faction milestones', async () => {
    renderApp();
    addIsland();
    await setGrowthResidenceTarget('eco', '100');
    selectWorkspace('Production');

    expect(buttonWithLabel('Show Current coverage')).toHaveAttribute('aria-selected', 'true');
    expect(buttonWithLabel('Show Eco Workers coverage')).toBeInTheDocument();
    expect(document.querySelector('[aria-label^="Show Tycoon "]')).toBeNull();
  });

  test('renders the selected milestone with breadcrumbs and explanations', async () => {
    renderApp();
    addIsland();
    await setGrowthResidenceTarget('tech', '100');
    selectWorkspace('Production');
    fireEvent.click(buttonWithLabel('Show Tech Lab Assistants coverage'));

    expect(byTestId('coverage-scenario-summary')).toHaveTextContent('Full-demand supply toward');
    expect(document.querySelector('.bottleneck-card__breadcrumb')).toHaveTextContent('→');
    expect(document.querySelector('.bottleneck-card details summary')).toHaveTextContent('Why required?');
  });

  test('adds a concrete building from a milestone bottleneck card', async () => {
    renderApp();
    addIsland();
    await setGrowthResidenceTarget('eco', '100');
    selectWorkspace('Production');
    fireEvent.click(buttonWithLabel('Show Eco Workers coverage'));

    fireEvent.click(buttonWithLabel('Build one Fishery on Island 1'));
    selectWorkspace('Islands');
    expect(input('island-0-owned-fishery')).toHaveValue('1');
  });

  test('adds the recommended whole building from a Current bottleneck card', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');
    selectWorkspace('Production');

    fireEvent.click(buttonWithLabel('Build one Fishery on Island 1'));
    selectWorkspace('Islands');
    expect(input('island-0-owned-fishery')).toHaveValue('3');
  });

  test('keeps a manual milestone visible without settled islands but renders no actions', async () => {
    renderApp();
    await setGrowthResidenceTarget('eco', '100');
    selectWorkspace('Production');

    fireEvent.click(buttonWithLabel('Show Eco Workers coverage'));
    expect(byTestId('coverage-scenario-summary')).toBeInTheDocument();
    expect(document.querySelector('.producer-action')).toBeNull();
  });

  test('hides milestone contexts when planning inputs are invalid', async () => {
    renderApp();
    addIsland();
    await setGrowthResidenceTarget('eco', 'not-a-number');
    selectWorkspace('Production');

    expect(buttonWithLabel('Show Current coverage')).toBeInTheDocument();
    expect(document.querySelector('[aria-label^="Show Eco "]')).toBeNull();
  });
});
