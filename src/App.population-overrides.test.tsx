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

    expect(input('eco-population-0')).toHaveValue('320');
    expect(input('eco-population-1')).toHaveValue('960');
    expect(input('eco-population-2')).toHaveValue('999');
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('4.13');

    fireEvent.click(buttonWithLabel('Use automatic Eco Engineers population', engineersField));

    expect(input('eco-population-2')).toHaveValue('1450');
    expect(engineersField).not.toHaveTextContent('Manual');
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('4.66');
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
