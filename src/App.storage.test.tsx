import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('saved calculator state', () => {
  test('restores manual values and other user inputs after a reload', async () => {
    const firstPage = renderApp();

    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Eco Engineers population'), '999');
    await replaceInput(screen.getByLabelText('Fishery productivity (Eco)'), '117.5');
    fireEvent.click(screen.getByLabelText('Round up to whole buildings'));
    firstPage.unmount();

    renderApp();

    expect(screen.getByLabelText('Eco houses')).toHaveValue('100');
    expect(screen.getByLabelText('Eco Engineers population')).toHaveValue('999');
    expect(within(screen.getByTestId('eco-population-2')).getByText('Manual')).toBeInTheDocument();
    expect(screen.getByLabelText('Fishery productivity (Eco)')).toHaveValue('117.5');
    expect(screen.getByLabelText('Round up to whole buildings')).toBeChecked();
    expect(screen.getByLabelText('Health food factory required buildings (Eco)')).toHaveTextContent('3');
  });

  test('persists reset defaults for the next reload', async () => {
    const firstPage = renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    firstPage.unmount();

    renderApp();
    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
  });

  test('ignores malformed saved data', () => {
    localStorage.setItem('anno2070-calculator-state', '{broken');

    expect(() => renderApp()).not.toThrow();
    expect(screen.getByLabelText('Eco houses')).toHaveValue('0');
  });
});
