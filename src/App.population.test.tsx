import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { addIsland, buttonWithLabel, byTestId, input, renderApp, replaceInput, selectWorkspace, setGrowthResidenceTarget, setIslandHouses } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population calculator basics', () => {
  test('recalculates all Eco population tiers as houses change without a Calculate button', async () => {
    renderApp();

    expect([...document.querySelectorAll('button')]
      .some((button) => /calculate/i.test(button.textContent ?? ''))).toBe(false);
    await setGrowthResidenceTarget('eco', '100');

    expect(byTestId('overview-eco-target-tier-0')).toHaveTextContent('160');
    expect(byTestId('overview-eco-target-tier-1')).toHaveTextContent('480');
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('725');
    expect(byTestId('overview-eco-target-tier-3')).toHaveTextContent('760');
  });

  test('uses the original portrait controls to select the highest tier', async () => {
    renderApp();
    await setGrowthResidenceTarget('eco', '100');

    const engineers = buttonWithLabel('Eco Engineers');
    fireEvent.click(engineers);

    expect(engineers).toHaveAttribute('aria-pressed', 'true');
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('1200');
    expect(byTestId('overview-eco-target-tier-3')).toHaveTextContent('0');
  });

  test('marks invalid numeric input and suppresses dependent automatic values', async () => {
    renderApp();
    selectWorkspace('Growth');
    fireEvent.click(buttonWithLabel('Target Eco by residences'));
    const houses = input('growth-eco-houses');
    await replaceInput(houses, 'not a number');

    expect(houses).toHaveAttribute('aria-invalid', 'true');
    expect(byTestId('growth-eco-derived')).toHaveTextContent('Target unavailable');
  });
});

describe('global per-faction bonuses', () => {
  test('living space toggled on the plan applies to island populations', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    expect(byTestId('overview-eco-actual-tier-2')).toHaveTextContent('725');

    selectWorkspace('Growth');
    const livingSpace = document.querySelector<HTMLInputElement>('.growth-target--eco .population-options--compact input')!;
    fireEvent.click(livingSpace);

    // 29 engineer houses × 28 (living space) instead of × 25.
    expect(byTestId('overview-eco-actual-tier-2')).toHaveTextContent('812');
  });
});
