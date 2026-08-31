import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
  resetButton,
  setGrowthResidenceTarget,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population overrides', () => {
  test('keeps one manual population override fixed while automatic fields continue updating', async () => {
    renderApp();
    await setGrowthResidenceTarget('eco', '100');
    await replaceInput(input('growth-eco-population-2'), '999');

    const engineersField = byTestId('growth-eco-override-2');
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('999');

    await replaceInput(input('growth-eco-houses'), '200');

    // At 200 houses the engineer override (999 < derived 1450) is a limit:
    // 18 freed engineer houses fall back to employees (64 + 18 = 82 × 15).
    expect(byTestId('overview-eco-target-tier-0')).toHaveTextContent('320');
    expect(byTestId('overview-eco-target-tier-1')).toHaveTextContent('1230');
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('999');

    fireEvent.click(buttonWithLabel('Use automatic Eco Engineers population', engineersField));

    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('1450');
  });

  test('limiting a higher tier refills the lower tier with its houses', async () => {
    renderApp();
    await setGrowthResidenceTarget('eco', '100');
    await replaceInput(input('growth-eco-population-3'), '0');

    // The 19 executive houses stay built and fall back to engineers: 48 × 25.
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('1200');
    expect(byTestId('overview-eco-target-tier-0')).toHaveTextContent('160');
    expect(byTestId('overview-eco-target-tier-1')).toHaveTextContent('480');

    fireEvent.click(buttonWithLabel('Use automatic Eco Executives population', byTestId('growth-eco-override-3')));
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('725');
    expect(byTestId('overview-eco-target-tier-3')).toHaveTextContent('760');
  });

  test('reset restores defaults and clears manual overrides', async () => {
    renderApp();
    await setGrowthResidenceTarget('eco', '100');
    await replaceInput(input('growth-eco-population-2'), '999');

    fireEvent.click(resetButton());

    // Reset returns the target to following the actual islands.
    expect(byTestId('overview-eco-target')).toHaveTextContent('0');
    expect(buttonWithLabel('Target Eco by following islands')).toHaveAttribute('aria-pressed', 'true');
  });
});
