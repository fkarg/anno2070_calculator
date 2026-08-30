import { beforeEach, describe, expect, test } from 'vitest';

import { input, renderApp, replaceInput, requiredBuildings } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('invalid production inputs', () => {
  test('invalid productivity suppresses only its dependent production chain', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');
    await replaceInput(input('tycoon-houses'), '100');
    const productivity = input('ecoFish-productivity');

    await replaceInput(productivity, '');

    expect(productivity).toHaveAttribute('aria-invalid', 'true');
    expect(requiredBuildings('ecoFish')).toHaveTextContent('—');
    expect(requiredBuildings('ecoTea')).toHaveTextContent('4.17');
    expect(requiredBuildings('tycoonFish')).toHaveTextContent('4.18');
  });

  test('invalid population suppresses only that faction', async () => {
    renderApp();
    await replaceInput(input('tycoon-houses'), '100');

    await replaceInput(input('eco-houses'), 'invalid');

    expect(requiredBuildings('ecoFish')).toHaveTextContent('—');
    expect(requiredBuildings('tycoonFish')).toHaveTextContent('4.18');
  });
});
