import { ISLAND_REQUIREMENTS, OPEN_FERTILITY_SLOT } from '../calculations/building-data';

type FertilityPickerProps = {
  islandName: string;
  underwater: boolean;
  fertilities: readonly string[];
  onToggle: (requirementId: string) => void;
};

export function FertilityPicker({ islandName, underwater, fertilities, onToggle }: FertilityPickerProps) {
  const applicable = ISLAND_REQUIREMENTS.filter((requirement) =>
    requirement.placement === (underwater ? 'underwater' : 'land'));
  const slotOpen = fertilities.includes(OPEN_FERTILITY_SLOT);

  return (
    <fieldset className="fertility-picker">
      <legend>Fertilities &amp; deposits (click what the island has)</legend>
      <div className="fertility-picker__options">
        {applicable.map((requirement) => {
          const present = fertilities.includes(requirement.id);
          return (
            <button
              key={requirement.id}
              type="button"
              className={`fertility-picker__option${present ? ' fertility-picker__option--present' : ''}`}
              aria-pressed={present}
              aria-label={`${islandName} ${requirement.label}: ${present ? 'present' : 'not present'}`}
              title={`${requirement.label} (${requirement.kind})`}
              onClick={() => onToggle(requirement.id)}
            >
              <img src={`/assets/${requirement.image}`} alt="" width="28" height="28" />
            </button>
          );
        })}
        {!underwater && (
          <button
            type="button"
            className={`fertility-picker__option fertility-picker__option--slot${slotOpen ? ' fertility-picker__option--present' : ''}`}
            aria-pressed={slotOpen}
            aria-label={`${islandName} open fertility slot: ${slotOpen ? 'available' : 'none'}`}
            title="Open fertility slot: can be filled with any seed item"
            onClick={() => onToggle(OPEN_FERTILITY_SLOT)}
          >
            ?
          </button>
        )}
      </div>
    </fieldset>
  );
}
