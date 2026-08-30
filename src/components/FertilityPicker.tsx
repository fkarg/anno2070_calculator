import { ISLAND_REQUIREMENTS } from '../calculations/building-data';
import type { FertilityState } from '../island';

type FertilityPickerProps = {
  islandName: string;
  fertilities: Record<string, FertilityState>;
  onChange: (requirementId: string, state: FertilityState | null) => void;
};

const NEXT_STATE: Record<string, FertilityState | null> = {
  unknown: 'present',
  present: 'absent',
  absent: null, // back to unknown
};

export function FertilityPicker({ islandName, fertilities, onChange }: FertilityPickerProps) {
  return (
    <fieldset className="fertility-picker">
      <legend>Fertilities &amp; deposits</legend>
      <div className="fertility-picker__options">
        {ISLAND_REQUIREMENTS.map((requirement) => {
          const state: FertilityState | 'unknown' = fertilities[requirement.id] ?? 'unknown';
          return (
            <button
              key={requirement.id}
              type="button"
              className={`fertility-picker__option fertility-picker__option--${state}`}
              aria-pressed={state === 'present'}
              aria-label={`${islandName} ${requirement.label}: ${state}`}
              title={`${requirement.label} (${requirement.kind}): ${state}`}
              onClick={() => onChange(requirement.id, NEXT_STATE[state])}
            >
              <img src={`/assets/${requirement.image}`} alt="" width="28" height="28" />
              {state === 'unknown' && <span className="fertility-picker__badge">?</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
