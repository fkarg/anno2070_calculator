import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  byTestId,
  input,
  productionCheckbox,
  renderApp,
  replaceInput,
  resetButton,
  setGrowthResidenceTarget,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('saved calculator state', () => {
  test('restores manual values and other user inputs after a reload', async () => {
    const firstPage = renderApp();

    await setGrowthResidenceTarget('eco', '100');
    await replaceInput(input('growth-eco-population-2'), '999');
    await replaceInput(input('ecoFish-productivity'), '117.5');
    fireEvent.click(productionCheckbox(0));
    firstPage.unmount();

    renderApp();

    expect(input('growth-eco-houses')).toHaveValue('100');
    expect(input('growth-eco-population-2')).toHaveValue('999');
    expect(input('ecoFish-productivity')).toHaveValue('117.5');
    expect(productionCheckbox(0)).toBeChecked();
    expect(byTestId('overview-eco-target-tier-2')).toHaveTextContent('999');
  });

  test('persists reset defaults for the next reload', async () => {
    const firstPage = renderApp();
    await setGrowthResidenceTarget('eco', '100');
    fireEvent.click(resetButton());
    firstPage.unmount();

    renderApp();
    expect(byTestId('overview-eco-target')).toHaveTextContent('0');
  });

  test('ignores malformed saved data', () => {
    localStorage.setItem('anno2070-calculator-state', '{broken');

    expect(() => renderApp()).not.toThrow();
    expect(byTestId('overview-eco-target')).toHaveTextContent('0');
  });
});
