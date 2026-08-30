import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { ISLAND_REQUIREMENTS, OPEN_FERTILITY_SLOT } from '../calculations/building-data';
import { FertilityPicker } from './FertilityPicker';

describe('FertilityPicker', () => {
  test('land islands offer land requirements plus the open slot', () => {
    render(<FertilityPicker islandName="Home" underwater={false} fertilities={[]} onToggle={() => {}} />);
    const landCount = ISLAND_REQUIREMENTS.filter((requirement) => requirement.placement === 'land').length;
    expect(document.querySelectorAll('.fertility-picker__option')).toHaveLength(landCount + 1);
    expect(document.querySelector('[aria-label="Home Tea: not present"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Home open fertility slot: none"]')).not.toBeNull();
    expect(document.querySelector('[aria-label^="Home Algae"]')).toBeNull();
  });

  test('underwater islands offer underwater requirements and no slot', () => {
    render(<FertilityPicker islandName="Deep" underwater fertilities={['algae']} onToggle={() => {}} />);
    const underwaterCount = ISLAND_REQUIREMENTS.filter((requirement) => requirement.placement === 'underwater').length;
    expect(document.querySelectorAll('.fertility-picker__option')).toHaveLength(underwaterCount);
    expect(document.querySelector('[aria-label="Deep Algae: present"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[aria-label*="open fertility slot"]')).toBeNull();
  });

  test('toggles fertilities and the open slot on click', () => {
    const onToggle = vi.fn();
    render(<FertilityPicker islandName="Home" underwater={false} fertilities={['tea']} onToggle={onToggle} />);
    fireEvent.click(document.querySelector('[aria-label="Home Tea: present"]')!);
    expect(onToggle).toHaveBeenLastCalledWith('tea');
    fireEvent.click(document.querySelector('[aria-label="Home open fertility slot: none"]')!);
    expect(onToggle).toHaveBeenLastCalledWith(OPEN_FERTILITY_SLOT);
  });
});
