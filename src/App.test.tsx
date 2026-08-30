import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';

import { App } from './App';

beforeEach(() => {
  localStorage.clear();
});

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

describe('production calculator', () => {
  test('renders all archived production fields as output-only live requirements', () => {
    render(<App />);

    expect(screen.getAllByTestId(/^production-node-/)).toHaveLength(88);
    const fishOutput = screen.getByLabelText('Fishery required buildings (Eco)');
    expect(fishOutput.tagName).toBe('OUTPUT');
    expect(fishOutput).toHaveTextContent('0');
    expect(screen.queryByRole('button', { name: /calculate/i })).not.toBeInTheDocument();
  });

  test('propagates a productivity edit immediately through a supply chain', async () => {
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('2.33');
    expect(screen.getByLabelText('Vegetable farm required buildings (Eco, Health food factory)')).toHaveTextContent('4.66');

    await replaceInput(screen.getByLabelText('Health food factory productivity (Eco)'), '200');

    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('1.17');
    expect(screen.getByLabelText('Vegetable farm required buildings (Eco, Health food factory)')).toHaveTextContent('2.33');
  });

  test('preserves decimal productivity while applying faction-wide adjustments', async () => {
    const user = userEvent.setup();
    render(<App />);
    await replaceInput(screen.getByLabelText('Fishery productivity (Eco)'), '110.5');

    await user.click(screen.getByRole('button', { name: 'Increase all Eco productivity by 1%' }));

    expect(screen.getByLabelText('Fishery productivity (Eco)')).toHaveValue('111.5');
    expect(screen.getByLabelText('Tea plantation productivity (Eco)')).toHaveValue('101');
    expect(screen.getByLabelText('Fishery productivity (Tycoon)')).toHaveValue('100');
  });

  test('applies recycling and whole-building rounding automatically', async () => {
    const user = userEvent.setup();
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    const serviceBots = screen.getByLabelText('Robot factory required buildings (Eco)');
    expect(serviceBots).toHaveTextContent('1.15');

    await user.click(screen.getByLabelText('Out of the old comes the new: reduce recyclable goods consumption by 15%'));
    expect(serviceBots).toHaveTextContent('0.97');

    await user.click(screen.getByLabelText('Round up to whole buildings'));
    expect(serviceBots).toHaveTextContent('1');
    expect(screen.getByLabelText('Chip factory required buildings (Eco, Robot factory)')).toHaveTextContent('1');
  });

  test('marks invalid productivity and suppresses calculated output', async () => {
    render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    const productivity = screen.getByLabelText('Fishery productivity (Eco)');

    await replaceInput(productivity, '');

    expect(productivity).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Fishery required buildings (Eco)')).toHaveTextContent('—');
  });
});

describe('saved calculator state', () => {
  test('restores manual values and other user inputs after a reload', async () => {
    const user = userEvent.setup();
    const firstPage = render(<App />);

    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');
    await replaceInput(screen.getByLabelText('Fishery productivity (Eco)'), '117.5');
    await user.click(screen.getByLabelText('Round up to whole buildings'));
    firstPage.unmount();

    render(<App />);

    expect(screen.getByLabelText('Eco houses')).toHaveValue('100');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('999');
    expect(within(screen.getByTestId('eco-population-2')).getByText('Manual')).toBeInTheDocument();
    expect(screen.getByLabelText('Fishery productivity (Eco)')).toHaveValue('117.5');
    expect(screen.getByLabelText('Round up to whole buildings')).toBeChecked();
  });

  test('persists reset defaults for the next reload', async () => {
    const user = userEvent.setup();
    const firstPage = render(<App />);
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await user.click(screen.getByRole('button', { name: 'Reset all' }));
    firstPage.unmount();

    render(<App />);
    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
  });

  test('ignores malformed saved data', () => {
    localStorage.setItem('anno2070-calculator-state', '{broken');

    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
  });
});
