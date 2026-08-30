import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  buttonWithLabel,
  byTestId,
  input,
  renderApp,
  replaceInput,
  requiredBuildings,
  resetButton,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population overrides', () => {
  test('keeps one manual population override fixed while automatic fields continue updating', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');
    await replaceInput(input('eco-population-2'), '999');

    const engineersField = byTestId('eco-population-2');
    expect(engineersField).toHaveTextContent('Manual');
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('2.65');
    expect(requiredBuildings('ecoVegetablesHealthFood')).toHaveTextContent('5.3');

    await replaceInput(input('eco-houses'), '200');

    // At 200 houses the engineer override (999 < derived 1450) is a limit:
    // 18 freed engineer houses fall back to employees (64 + 18 = 82 × 15).
    expect(input('eco-population-0')).toHaveValue('320');
    expect(input('eco-population-1')).toHaveValue('1230');
    expect(input('eco-population-2')).toHaveValue('999');
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('4.53');

    fireEvent.click(buttonWithLabel('Use automatic Eco Engineers population', engineersField));

    expect(input('eco-population-2')).toHaveValue('1450');
    expect(engineersField).not.toHaveTextContent('Manual');
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('4.66');
  });

  test('limiting a higher tier refills the lower tier with its houses', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');
    await replaceInput(input('eco-population-3'), '0');

    // The 19 executive houses stay built and fall back to engineers: 48 × 25.
    expect(input('eco-population-2')).toHaveValue('1200');
    expect(input('eco-population-0')).toHaveValue('160');
    expect(input('eco-population-1')).toHaveValue('480');
    expect(byTestId('eco-population-3')).toHaveTextContent('Manual');

    fireEvent.click(buttonWithLabel('Use automatic Eco Executives population', byTestId('eco-population-3')));
    expect(input('eco-population-2')).toHaveValue('725');
    expect(input('eco-population-3')).toHaveValue('760');
  });

  test('reset restores defaults and clears manual overrides', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');
    await replaceInput(input('eco-population-2'), '999');

    fireEvent.click(resetButton());

    expect(input('eco-houses')).toHaveValue('0');
    expect(input('eco-population-2')).toHaveValue('0');
    expect(document.body).not.toHaveTextContent('Manual');
    expect(buttonWithLabel('Eco Executives')).toHaveAttribute('aria-pressed', 'true');
  });
});
