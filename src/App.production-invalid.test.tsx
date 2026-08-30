import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { renderApp, replaceInput } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

describe('invalid production inputs', () => {
  test('invalid productivity suppresses only its dependent production chain', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Eco houses'), '100');
    await replaceInput(screen.getByLabelText('Tycoon houses'), '100');
    const productivity = screen.getByLabelText('Fishery productivity (Eco)');

    await replaceInput(productivity, '');

    expect(productivity).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Fishery required buildings (Eco)')).toHaveTextContent('—');
    expect(screen.getByLabelText('Tea plantation required buildings (Eco)')).toHaveTextContent('4.17');
    expect(screen.getByLabelText('Fishery required buildings (Tycoon)')).toHaveTextContent('4.18');
  });

  test('invalid population suppresses only that faction', async () => {
    renderApp();
    await replaceInput(screen.getByLabelText('Tycoon houses'), '100');

    await replaceInput(screen.getByLabelText('Eco houses'), 'invalid');

    expect(screen.getByLabelText('Fishery required buildings (Eco)')).toHaveTextContent('—');
    expect(screen.getByLabelText('Fishery required buildings (Tycoon)')).toHaveTextContent('4.18');
  });
});
