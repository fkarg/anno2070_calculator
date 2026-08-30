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

describe('islands section', () => {
  test('adds and renames an island', async () => {
    renderApp();
    addIsland();
    const name = document.querySelector<HTMLInputElement>('[aria-label="Island 1 name"]')!;
    expect(name.value).toBe('Island 1');
    await replaceInput(name, 'Walbruck Bay');
    expect(document.querySelector<HTMLInputElement>('[aria-label="Island 1 name"]')!.value).toBe('Walbruck Bay');
  });

  test('island residences produce local demand and population', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '100');
    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[1].textContent).not.toBe('0');
    expect(fishRow.querySelectorAll('td')[2].textContent).toMatch(/^-/);
  });

  test('owned fisheries flip the local fish balance to surplus', async () => {
    renderApp();
    addIsland();
    const select = document.querySelector<HTMLSelectElement>('[aria-label="Add building to Island 1"]')!;
    fireEvent.change(select, { target: { value: 'fishery' } });
    await replaceInput(input('island-0-owned-fishery'), '3');
    const fishRow = byTestId('island-0-balance-fishery');
    expect(fishRow.querySelectorAll('td')[0].textContent).toBe('3');
    expect(fishRow.querySelector('.balance--surplus')).not.toBeNull();
  });

  test('an absent fertility removes the building from the picker', () => {
    renderApp();
    addIsland();
    const teaButton = buttonWithLabel('Island 1 Tea: unknown');
    fireEvent.click(teaButton); // present
    fireEvent.click(buttonWithLabel('Island 1 Tea: present')); // absent
    const select = document.querySelector<HTMLSelectElement>('[aria-label="Add building to Island 1"]')!;
    const labels = [...select.options].map((option) => option.textContent);
    expect(labels.some((label) => label!.startsWith('Tea plantation'))).toBe(false);
    expect(labels.some((label) => label!.startsWith('Fishery'))).toBe(true);
  });

  test('settled islands feed the plan houses Auto mode', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    expect(input('eco-houses').value).toBe('10');

    const settled = document.querySelector<HTMLInputElement>('.island-card__header input[type="checkbox"]')!;
    fireEvent.click(settled);
    expect(input('eco-houses').value).toBe('0');
  });

  test('manual plan houses ignore islands until returned to Auto', async () => {
    renderApp();
    addIsland();
    await replaceInput(input('island-0-eco-houses'), '10');
    await replaceInput(input('eco-houses'), '25');
    expect(input('eco-houses').value).toBe('25');

    fireEvent.click(buttonWithLabel('Use island Eco houses'));
    expect(input('eco-houses').value).toBe('10');
  });
});
