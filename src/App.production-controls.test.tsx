import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  buttonWithLabel,
  input,
  productionCheckbox,
  renderApp,
  replaceInput,
  requiredBuildings,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('production controls', () => {
  test('propagates a productivity edit immediately through a supply chain', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');

    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('2.33');
    expect(requiredBuildings('ecoVegetablesHealthFood')).toHaveTextContent('4.66');

    await replaceInput(input('ecoHealthFood-productivity'), '200');

    expect(requiredBuildings('ecoHealthFood')).toHaveTextContent('1.17');
    expect(requiredBuildings('ecoVegetablesHealthFood')).toHaveTextContent('2.33');
  });

  test('preserves decimal productivity while applying faction-wide adjustments', async () => {
    renderApp();
    await replaceInput(input('ecoFish-productivity'), '110.5');

    fireEvent.click(buttonWithLabel('Increase all Eco productivity by 1%'));

    expect(input('ecoFish-productivity')).toHaveValue('111.5');
    expect(input('ecoTea-productivity')).toHaveValue('101');
    expect(input('tycoonFish-productivity')).toHaveValue('100');
  });

  test('applies recycling and whole-building rounding automatically', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');

    const serviceBots = requiredBuildings('ecoServiceBots');
    expect(serviceBots).toHaveTextContent('1.15');

    fireEvent.click(productionCheckbox(1));
    expect(serviceBots).toHaveTextContent('0.97');

    fireEvent.click(productionCheckbox(0));
    expect(serviceBots).toHaveTextContent('1');
    expect(requiredBuildings('ecoMicrochipsServiceBots')).toHaveTextContent('1');
  });
});
