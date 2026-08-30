import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { App } from './App';

async function replaceInput(input: HTMLElement, value: string): Promise<void> {
  const user = userEvent.setup();
  await user.clear(input);
  if (value) await user.type(input, value);
}

describe('population calculator', () => {
  test('recalculates all Eco population tiers as houses change without a Calculate button', async () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: /calculate/i })).not.toBeInTheDocument();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('160');
    expect(screen.getByLabelText('Eco Employees population')).toHaveValue('480');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('725');
    expect(screen.getByLabelText('Eco Executives population')).toHaveValue('760');
  });

  test('uses the original portrait controls to select the highest tier', async () => {
    const user = userEvent.setup();
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    await user.click(screen.getByRole('button', { name: 'Eco Engineers' }));

    expect(screen.getByRole('button', { name: 'Eco Engineers' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('1200');
    expect(screen.getByLabelText('Eco Executives population')).toHaveValue('0');
  });

  test('keeps one manual population override fixed while automatic fields continue updating', async () => {
    const user = userEvent.setup();
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');

    const engineersField = screen.getByTestId('eco-population-2');
    expect(within(engineersField).getByText('Manual')).toBeInTheDocument();

    await replaceInput(screen.getByLabelText('Eco houses'), '200');

    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('320');
    expect(screen.getByLabelText('Eco Employees population')).toHaveValue('960');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('999');

    await user.click(within(engineersField).getByRole('button', { name: 'Use automatic Eco Engineers population' }));

    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('1450');
    expect(within(engineersField).queryByText('Manual')).not.toBeInTheDocument();
  });

  test('marks invalid numeric input and suppresses dependent automatic values', async () => {
    render(<App />);
    const houses = screen.getByLabelText('Eco houses');
    await replaceInput(houses, 'not a number');

    expect(houses).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('');
    expect(screen.getByLabelText('Eco Workers population')).toHaveAttribute('placeholder', '—');
  });

  test('reset restores defaults and clears manual overrides', async () => {
    const user = userEvent.setup();
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');

    await user.click(screen.getByRole('button', { name: 'Reset all' }));

    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('0');
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eco Executives' })).toHaveAttribute('aria-pressed', 'true');
  });
});
