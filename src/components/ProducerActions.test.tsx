import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { createIsland } from '../island';
import { ProducerActions } from './ProducerActions';

describe('ProducerActions', () => {
  test('identifies concrete alternative producers and applies one whole building', () => {
    const land = createIsland('Land');
    const deep = createIsland('Deep');
    deep.underwater = true;
    const apply = vi.fn();

    render(<ProducerActions
      goodId="chipFactory"
      islands={[land, deep]}
      variant="compact"
      onApplyBuilding={apply}
    />);

    const chip = screen.getByRole('button', { name: 'Build one Chip factory on Land' });
    const recycler = screen.getByRole('button', { name: 'Build one Electronics recycler on Deep' });
    expect(chip).toHaveTextContent('+1 nominal output');
    expect(recycler).toHaveTextContent('+1.5 nominal output');

    fireEvent.click(recycler);
    expect(apply).toHaveBeenCalledWith(deep.id, 'electronicsRecycler');
  });
});
