import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population overrides', () => {
  test('keeps one manual population override fixed while automatic fields continue updating', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');

    const engineersField = screen.getByTestId('eco-population-2');
    expect(within(engineersField).getByText('Manual')).toBeInTheDocument();
    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('2.65');
    expect(screen.getByLabelText('Vegetable farm required buildings (Eco, Health food factory)')).toHaveTextContent('5.3');

    await replaceInput(screen.getByLabelText('Eco houses'), '200');

    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('320');
    expect(screen.getByLabelText('Eco Employees population')).toHaveValue('960');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('999');
    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('4.13');

    fireEvent.click(within(engineersField).getByRole('button', { name: 'Use automatic Eco Engineers population' }));

    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('1450');
    expect(within(engineersField).queryByText('Manual')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('4.66');
  });

  test('reset restores defaults and clears manual overrides', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));

    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('0');
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eco Executives' })).toHaveAttribute('aria-pressed', 'true');
  });
});
