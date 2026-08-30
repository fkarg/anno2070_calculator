import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { buttonWithLabel, input, renderApp, replaceInput, setIslandHouses } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population calculator basics', () => {
  test('recalculates all Eco population tiers as houses change without a Calculate button', async () => {
    renderApp();

    expect([...document.querySelectorAll('button')]
      .some((button) => /calculate/i.test(button.textContent ?? ''))).toBe(false);
    await replaceInput(input('eco-houses'), '100');

    expect(input('eco-population-0')).toHaveValue('160');
    expect(input('eco-population-1')).toHaveValue('480');
    expect(input('eco-population-2')).toHaveValue('725');
    expect(input('eco-population-3')).toHaveValue('760');
  });

  test('uses the original portrait controls to select the highest tier', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');

    const engineers = buttonWithLabel('Eco Engineers');
    fireEvent.click(engineers);

    expect(engineers).toHaveAttribute('aria-pressed', 'true');
    expect(input('eco-population-2')).toHaveValue('1200');
    expect(input('eco-population-3')).toHaveValue('0');
  });

  test('marks invalid numeric input and suppresses dependent automatic values', async () => {
    renderApp();
    const houses = input('eco-houses');
    await replaceInput(houses, 'not a number');

    expect(houses).toHaveAttribute('aria-invalid', 'true');
    expect(input('eco-population-0')).toHaveValue('');
    expect(input('eco-population-0')).toHaveAttribute('placeholder', '—');
  });
});

describe('global per-faction bonuses', () => {
  test('living space toggled on the plan applies to island populations', async () => {
    renderApp();
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.islands-section button')]
      .find((button) => button.textContent === 'Add island')!);
    await setIslandHouses(0, 'eco', '100');
    expect(input('eco-population-2')).toHaveValue('725');

    const livingSpace = document
      .querySelector<HTMLInputElement>('.population-faction--eco .population-options--compact input')!;
    fireEvent.click(livingSpace);

    // 29 engineer houses × 28 (living space) instead of × 25.
    expect(input('eco-population-2')).toHaveValue('812');
  });
});
