import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { BUILDINGS } from './calculations/building-data';
import { PRODUCTION_NODES } from './calculations/production-data';
import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('production structure and impacts', () => {
  test('renders all archived production fields as output-only live requirements', () => {
    renderApp();

    expect(screen.getAllByTestId(/^production-node-/)).toHaveLength(88);
    for (const node of PRODUCTION_NODES) {
      const row = screen.getByTestId(`production-node-${node.id}`);
      const building = BUILDINGS[node.buildingId];
      expect(row.querySelector(`img[src="/assets/${building.image}"]`)).not.toBeNull();
      expect(within(row).getByText(building.label)).toBeInTheDocument();
    }
    const fishOutput = screen.getByLabelText('Fishery required buildings (Eco)');
    expect(fishOutput.tagName).toBe('OUTPUT');
    expect(fishOutput).toHaveTextContent('0');
    expect(screen.queryByRole('button', { name: /calculate/i })).not.toBeInTheDocument();
  });

  test('renders intrinsic connector prefixes and every alternative at full demand', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    const connector = (id: string) => within(screen.getByTestId(`production-node-${id}`))
      .getByTestId('tree-connector').textContent;
    expect(connector('ecoMicrochipsCommunicators')).toBe('├── ');
    expect(connector('ecoCopperCommunicators')).toBe('│   ├── ');
    expect(connector('ecoSandCommunicators')).toBe('│   └── ');
    expect(connector('ecoElectronicsRecyclerCommunicators')).toBe('└── ');

    expect(screen.getByLabelText('Chip factory required buildings (Eco, Electronics factory)'))
      .toHaveTextContent('2.36');
    expect(screen.getByLabelText('Electronics recycler required buildings (Eco, Electronics factory)'))
      .toHaveTextContent('1.57');
    expect(screen.getByRole('list', { name: 'Electronics factory production tree' }))
      .toContainElement(screen.getByTestId('production-node-ecoCopperCommunicators'));
    expect(within(screen.getByTestId('production-node-ecoCopperCommunicators'))
      .getByText('Level 3 dependency of Chip factory.')).toHaveClass('visually-hidden');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  test('updates direct and full-chain operating impacts and honors rounding', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco Workers population'), '251');

    const fish = screen.getByTestId('production-node-ecoFish');
    expect(within(fish).getByTestId('direct-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-5.02power:-1ecobalance:0');
    expect(within(fish).getByTestId('per-building-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-5power:-1ecobalance:0');
    expect(screen.getByTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .toBeInTheDocument();
    expect(screen.getByTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toBeInTheDocument();
    expect(screen.getAllByText('Full chain (rounded buildings)').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Round up to whole buildings'));
    expect(within(fish).getByTestId('direct-operating-impact'))
      .toHaveTextContent('maintenance credits per minute:-10');

    await replaceInput(screen.getByLabelText('Eco Employees population'), '571');
    expect(screen.getByTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .toHaveTextContent('maintenance credits per minute:-65power:-10ecobalance:-12');
    expect(screen.getByTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toHaveTextContent('maintenance credits per minute:-180power:-39ecobalance:-4');
  });

  test('invalid alternate productivity suppresses only variants using that route', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(
      screen.getByLabelText('Electronics recycler productivity (Eco, Electronics factory)'),
      '',
    );

    expect(screen.getByTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators'))
      .not.toHaveTextContent('—');
    expect(screen.getByTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators'))
      .toHaveTextContent('—');
  });
});
