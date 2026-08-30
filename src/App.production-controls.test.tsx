import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('production controls', () => {
  test('propagates a productivity edit immediately through a supply chain', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('2.33');
    expect(screen.getByLabelText('Vegetable farm required buildings (Eco, Health food factory)')).toHaveTextContent('4.66');

    await replaceInput(screen.getByLabelText('Health food factory productivity (Eco)'), '200');

    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('1.17');
    expect(screen.getByLabelText('Vegetable farm required buildings (Eco, Health food factory)')).toHaveTextContent('2.33');
  });

  test('preserves decimal productivity while applying faction-wide adjustments', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Fishery productivity (Eco)'), '110.5');

    fireEvent.click(screen.getByRole('button', { name: 'Increase all Eco productivity by 1%' }));

    expect(screen.getByLabelText('Fishery productivity (Eco)')).toHaveValue('111.5');
    expect(screen.getByLabelText('Tea plantation productivity (Eco)')).toHaveValue('101');
    expect(screen.getByLabelText('Fishery productivity (Tycoon)')).toHaveValue('100');
  });

  test('applies recycling and whole-building rounding automatically', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    const serviceBots = screen.getByLabelText('Robot factory required buildings (Eco)');
    expect(serviceBots).toHaveTextContent('1.15');

    fireEvent.click(screen.getByLabelText('Out of the old comes the new: reduce recyclable goods consumption by 15%'));
    expect(serviceBots).toHaveTextContent('0.97');

    fireEvent.click(screen.getByLabelText('Round up to whole buildings'));
    expect(serviceBots).toHaveTextContent('1');
    expect(screen.getByLabelText('Chip factory required buildings (Eco, Robot factory)')).toHaveTextContent('1');
  });
});
