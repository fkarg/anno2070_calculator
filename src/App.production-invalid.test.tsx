import { beforeEach, describe, expect, test } from 'vitest';

import { addIsland, input, renderApp, replaceInput, requiredBuildings, setIslandHouses } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('invalid production inputs', () => {
  test('invalid productivity suppresses only its dependent production chain', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'eco', '100');
    await setIslandHouses(0, 'tycoon', '100');
    const productivity = input('ecoFish-productivity');

    await replaceInput(productivity, '');

    expect(productivity).toHaveAttribute('aria-invalid', 'true');
    expect(requiredBuildings('ecoFish')).toHaveTextContent('—');
    expect(requiredBuildings('ecoTea')).toHaveTextContent('4.17');
    expect(requiredBuildings('tycoonFish')).toHaveTextContent('4.18');
  });

  test('invalid population suppresses only that faction', async () => {
    renderApp();
    addIsland();
    await setIslandHouses(0, 'tycoon', '100');

    await setIslandHouses(0, 'eco', 'invalid');

    expect(requiredBuildings('ecoFish')).toHaveTextContent('—');
    expect(requiredBuildings('tycoonFish')).toHaveTextContent('4.18');
  });
});
