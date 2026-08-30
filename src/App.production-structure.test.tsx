import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { BUILDINGS } from './calculations/building-data';
import { PRODUCTION_NODES } from './calculations/production-data';
import {
  buttonWithLabel,
  byTestId,
  input,
  productionCheckbox,
  productionRow,
  renderApp,
  replaceInput,
  requiredBuildings,
} from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('production structure and impacts', () => {
  test('dims production trees unavailable at the selected highest tier', () => {
    renderApp();
    fireEvent.click(buttonWithLabel('Eco Workers'));

    const healthFoodTree = productionRow('ecoHealthFood').closest('.production-tree')!;
    expect(healthFoodTree).toHaveClass('production-tree--inactive');
    expect(input('ecoHealthFood-productivity')).toBeDisabled();

    fireEvent.click(buttonWithLabel('Eco Employees'));

    expect(healthFoodTree).not.toHaveClass('production-tree--inactive');
    expect(input('ecoHealthFood-productivity')).not.toBeDisabled();
  });

  test('renders all archived production fields as output-only live requirements', () => {
    renderApp();

    const rows = document.querySelectorAll<HTMLElement>('[data-testid^="production-node-"]');
    expect(rows).toHaveLength(88);
    const rowById = new Map([...rows].map((row) => [row.dataset.testid, row]));
    for (const node of PRODUCTION_NODES) {
      const row = rowById.get(`production-node-${node.id}`)!;
      const building = BUILDINGS[node.buildingId];
      expect(row.querySelector(`img[src="/assets/${building.image}"]`)).not.toBeNull();
      expect(row).toHaveTextContent(building.label);
    }
    const fishOutput = requiredBuildings('ecoFish');
    expect(fishOutput.tagName).toBe('OUTPUT');
    expect(fishOutput).toHaveAccessibleName('Fishery required buildings (Eco)');
    expect(fishOutput).toHaveTextContent('0');
    expect([...document.querySelectorAll('button')]
      .some((button) => /calculate/i.test(button.textContent ?? ''))).toBe(false);
  });

  test('renders intrinsic connector prefixes and every alternative at full demand', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');

    const connector = (id: string) => productionRow(id)
      .querySelector<HTMLElement>('[data-testid="tree-connector"]')!.textContent;
    expect(connector('ecoMicrochipsCommunicators')).toBe('├── ');
    expect(connector('ecoCopperCommunicators')).toBe('│   ├── ');
    expect(connector('ecoSandCommunicators')).toBe('│   └── ');
    expect(connector('ecoElectronicsRecyclerCommunicators')).toBe('└── ');

    expect(requiredBuildings('ecoMicrochipsCommunicators')).toHaveTextContent('2.36');
    expect(requiredBuildings('ecoElectronicsRecyclerCommunicators')).toHaveTextContent('1.57');
    const copper = productionRow('ecoCopperCommunicators');
    const tree = copper.closest('ol')!;
    expect(tree).toHaveAccessibleName('Electronics factory production tree');
    expect(tree).toContainElement(copper);
    expect(copper.querySelector('.visually-hidden')).toHaveTextContent('Level 3 dependency of Chip factory.');
    expect(document.querySelector('input[type="radio"]')).toBeNull();
  });

  test('updates direct and full-chain operating impacts and honors rounding', async () => {
    renderApp();
    await replaceInput(input('eco-population-0'), '251');

    const fish = productionRow('ecoFish');
    expect(fish.querySelector('[data-testid="direct-operating-impact"]'))
      .toHaveTextContent('maintenance credits per minute:-5.02power:-1ecobalance:0');
    expect(fish.querySelector('[data-testid="per-building-operating-impact"]')).toBeNull();
    const impactToggle = fish.querySelector<HTMLButtonElement>('[aria-label="Fishery per-building operating impact"]')!;
    expect(impactToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(impactToggle);
    expect(impactToggle.getAttribute('aria-expanded')).toBe('true');
    expect(fish.querySelector('[data-testid="per-building-operating-impact"]'))
      .toHaveTextContent('maintenance credits per minute:-5power:-1ecobalance:0');
    expect(byTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .toBeInTheDocument();
    expect(byTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toBeInTheDocument();
    expect([...document.querySelectorAll('.production-tree__variants')]
      .some((variants) => variants.textContent?.includes('Full chain (rounded buildings)'))).toBe(true);

    fireEvent.click(productionCheckbox(0));
    expect(fish.querySelector('[data-testid="direct-operating-impact"]'))
      .toHaveTextContent('maintenance credits per minute:-10');

    await replaceInput(input('eco-population-1'), '571');
    expect(byTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .toHaveTextContent('maintenance credits per minute:-65power:-10ecobalance:-12');
    expect(byTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toHaveTextContent('maintenance credits per minute:-180power:-39ecobalance:-4');
  });

  test('invalid alternate productivity suppresses only variants using that route', async () => {
    renderApp();
    await replaceInput(input('eco-houses'), '100');
    await replaceInput(
      input('ecoElectronicsRecyclerCommunicators-productivity'),
      '',
    );

    expect(byTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .not.toHaveTextContent('—');
    expect(byTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toHaveTextContent('—');
  });
});
