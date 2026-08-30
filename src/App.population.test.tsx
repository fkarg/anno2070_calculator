import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('population calculator basics', () => {
  test('recalculates all Eco population tiers as houses change without a Calculate button', async () => {
    renderApp();

    expect(screen.queryByRole('button', { name: /calculate/i })).not.toBeInTheDocument();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('160');
    expect(screen.getByLabelText('Eco Employees population')).toHaveValue('480');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('725');
    expect(screen.getByLabelText('Eco Executives population')).toHaveValue('760');
  });

  test('uses the original portrait controls to select the highest tier', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');

    fireEvent.click(screen.getByRole('button', { name: 'Eco Engineers' }));

    expect(screen.getByRole('button', { name: 'Eco Engineers' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('1200');
    expect(screen.getByLabelText('Eco Executives population')).toHaveValue('0');
  });

  test('marks invalid numeric input and suppresses dependent automatic values', async () => {
    renderApp();
    const houses = screen.getByLabelText('Eco houses');
    await replaceInput(houses, 'not a number');

    expect(houses).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Eco Workers population')).toHaveValue('');
    expect(screen.getByLabelText('Eco Workers population')).toHaveAttribute('placeholder', '—');
  });
});
