import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { ISLAND_REQUIREMENTS } from '../calculations/building-data';
import { FertilityPicker } from './FertilityPicker';

describe('FertilityPicker', () => {
  test('renders one tri-state button per island requirement', () => {
    render(<FertilityPicker islandName="Home" fertilities={{}} onChange={() => {}} />);
    const buttons = document.querySelectorAll('.fertility-picker__option');
    expect(buttons).toHaveLength(ISLAND_REQUIREMENTS.length);
    expect(document.querySelector('[aria-label="Home Tea: unknown"]')).not.toBeNull();
  });

  test('cycles unknown to present to absent to unknown', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FertilityPicker islandName="Home" fertilities={{}} onChange={onChange} />,
    );
    const tea = () => document.querySelector<HTMLButtonElement>('[aria-label^="Home Tea"]')!;
    fireEvent.click(tea());
    expect(onChange).toHaveBeenLastCalledWith('tea', 'present');

    rerender(<FertilityPicker islandName="Home" fertilities={{ tea: 'present' }} onChange={onChange} />);
    expect(tea().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(tea());
    expect(onChange).toHaveBeenLastCalledWith('tea', 'absent');

    rerender(<FertilityPicker islandName="Home" fertilities={{ tea: 'absent' }} onChange={onChange} />);
    fireEvent.click(tea());
    expect(onChange).toHaveBeenLastCalledWith('tea', null);
  });
});
