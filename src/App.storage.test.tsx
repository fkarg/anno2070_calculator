import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  byTestId,
  input,
  productionCheckbox,
  renderApp,
  replaceInput,
  requiredBuildings,
  resetButton,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('saved calculator state', () => {
  test('restores manual values and other user inputs after a reload', async () => {
    const firstPage = renderApp();

    await replaceInput(input('eco-houses'), '100');
    await replaceInput(input('eco-population-2'), '999');
    await replaceInput(input('ecoFish-productivity'), '117.5');
    fireEvent.click(productionCheckbox(0));
    firstPage.unmount();

    renderApp();

    expect(input('eco-houses')).toHaveValue('100');
    expect(input('eco-population-2')).toHaveValue('999');
    expect(byTestId('eco-population-2')).toHaveTextContent('manual override');
    expect(input('ecoFish-productivity')).toHaveValue('117.5');
    expect(productionCheckbox(0)).toBeChecked();
    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('3');
  });

  test('persists reset defaults for the next reload', async () => {
    const firstPage = renderApp();
    await replaceInput(input('eco-houses'), '100');
    fireEvent.click(resetButton());
    firstPage.unmount();

    renderApp();
    expect(input('eco-houses')).toHaveValue('0');
  });

  test('ignores malformed saved data', () => {
    localStorage.setItem('anno2070-calculator-state', '{broken');

    expect(() => renderApp()).not.toThrow();
    expect(input('eco-houses')).toHaveValue('0');
  });
});
