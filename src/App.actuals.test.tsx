import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent } from '@testing-library/react';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
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

describe('actuals in the production view', () => {
  test('labels calculated requirements as demand rather than a Growth plan', () => {
    renderApp();

    expect(document.querySelector('.production-node--header'))
      .toHaveTextContent('rounded / fractional · owned / empire / chain target Δ');
    expect(document.querySelector('.production-node__mini--target')).toBeNull();
  });
  test('canonical rows retain owned counts and capacity beside chain costs', async () => {
    renderApp();
    addIsland();
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '2');

    const extras = byTestId('extras-ecoFish');
    // own and capacity merge into one cell; the arrow only appears when they differ.
    expect(extras).toHaveTextContent('own 2');
    expect(extras).not.toHaveTextContent('→');
    expect(extras.querySelector('.balance--surplus')).toHaveTextContent('empire over 2');
    expect(extras.querySelector('.production-node__mini--target')).toBeNull();
  });

  test('alternative producers contribute converted capacity', async () => {
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
    const extras = byTestId('extras-ecoMicrochipsCommunicators');
    expect(extras.querySelector('.production-node__owned-producers'))
      .toHaveTextContent('own 2 recyclers');
    expect(extras.querySelector('.production-node__owned-capacity'))
      .toHaveTextContent('capacity 3');
  });

  test('breaks mixed producer inventory out before showing canonical capacity', async () => {
    renderApp();
    addIsland();
    addBuilding(0, 'chipFactory');
    await replaceInput(input('island-0-owned-chipFactory'), '2');

    addIsland();
    fireEvent.click(
      [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.getAttribute('aria-label') === 'Configure island Island 2')!,
    );
    const underwater = byTestId('island-1')
      .querySelectorAll<HTMLInputElement>('.island-card__flags input[type="checkbox"]')[1];
    fireEvent.click(underwater);
    addBuilding(1, 'electronicsRecycler');

    const extras = byTestId('extras-ecoMicrochipsCommunicators');
    expect(extras.querySelector('.production-node__owned-producers'))
      .toHaveTextContent('own 2 chips + 1 recycler');
    expect(extras.querySelector('.production-node__owned-capacity'))
      .toHaveTextContent('capacity 3.5');
  });

  test('the build gap reports current full demand, not a Growth target', async () => {
    renderApp();
    addIsland();
    // Population creates plan demand for fish; no fisheries owned yet.
    await setIslandHouses(0, 'eco', '100');
    const fish = byTestId('extras-ecoFish');
    expect(fish).toHaveTextContent('empire build 4.18');

    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '5');
    expect(byTestId('extras-ecoFish')).toHaveTextContent('empire over 0.83');
  });

  test('shows actual demand before a clearly distinct final Growth target', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    await setGrowthResidenceTarget('eco', '100');

    const extras = byTestId('extras-ecoFish');
    const actual = extras.querySelector('.production-node__mini--actual')!;
    const target = extras.querySelector('.production-node__mini--target')!;
    expect(actual).toHaveTextContent('empire build 0.42');
    expect(target).toHaveTextContent('target +3.77');
    expect(target).toHaveClass('balance--shortfall');
    expect([...extras.children].indexOf(actual)).toBeLessThan([...extras.children].indexOf(target));

    // A faction-unrelated demand stays identical and does not get a duplicate target badge.
    expect(byTestId('extras-tycoonLiquor').querySelector('.production-node__mini--target'))
      .toBeNull();
  });

  test('keeps the chain target delta independent from owned empire capacity', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    await setGrowthResidenceTarget('eco', '100');
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '1');

    const extras = byTestId('extras-ecoFish');
    expect(extras.querySelector('.production-node__mini--actual'))
      .toHaveTextContent('empire over 0.59');
    expect(extras.querySelector('.production-node__mini--target'))
      .toHaveTextContent('target +3.77');
  });

  test('shows chain target deltas on alternative producer routes', async () => {
    renderApp();
    addIsland();
    fireEvent.click(buttonWithLabel('Configure island Island 1'));
    fireEvent.click(buttonWithLabel('Eco Employees', byTestId('island-0')));
    fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
    await setIslandHouses(0, 'eco', '10');
    await setGrowthResidenceTarget('eco', '100');

    expect(byTestId('extras-ecoElectronicsRecyclerCommunicators')
      .querySelector('.production-node__mini--target'))
      .toHaveTextContent(/^target \+/);
  });

  test('shows target surplus independently from the actual comparison', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    await setGrowthResidenceTarget('eco', '10');
    addBuilding(0, 'fishery');
    await replaceInput(input('island-0-owned-fishery'), '5');

    const extras = byTestId('extras-ecoFish');
    expect(extras.querySelector('.production-node__mini--actual'))
      .toHaveTextContent('empire over 0.83');
    expect(extras.querySelector('.production-node__mini--target'))
      .toHaveTextContent('target −3.77');
    expect(extras.querySelector('.production-node__mini--target'))
      .toHaveClass('balance--surplus');
  });

  test('shows an invalid explicit target only on affected production goods', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '10');
    await setGrowthResidenceTarget('eco', '100');
    await replaceInput(input('growth-eco-houses'), 'invalid');

    expect(byTestId('extras-ecoFish').querySelector('.production-node__mini--target'))
      .toHaveTextContent('target —');
    expect(byTestId('extras-tycoonLiquor').querySelector('.production-node__mini--target'))
      .toBeNull();
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
