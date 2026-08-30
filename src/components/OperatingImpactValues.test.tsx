import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { OperatingImpactValues } from './OperatingImpactValues';

test('pairs every icon-backed number with accessible metric text', () => {
  render(<OperatingImpactValues impact={{ maintenanceCredits: -5, power: -1, ecoBalance: 0 }} />);

  expect(screen.getByText('maintenance credits per minute:')).toHaveClass('visually-hidden');
  expect(screen.getByText('power:')).toHaveClass('visually-hidden');
  expect(screen.getByText('ecobalance:')).toHaveClass('visually-hidden');
});
