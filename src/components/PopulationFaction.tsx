import type { Faction } from '../calculations/population';
import {
  effectivePopulation,
  parseNonNegativeInteger,
  resolveHouses,
  type EditableNumber,
  type FactionConfig,
  type FactionState,
} from '../model';
import { NumericInput } from './NumericInput';

type PopulationFactionProps = {
  config: FactionConfig;
  state: FactionState;
  islandHouses: number | null;
  islandPopulation?: readonly number[] | null;
  idPrefix?: string;
  onHousesChange: (value: EditableNumber) => void;
  // Absent on islands: island houses are always concrete, Auto exists only on the plan.
  onHousesClear?: () => void;
  onMaxTierChange: (tier: number) => void;
  onLivingSpaceChange: (checked: boolean) => void;
  onSenateChange: (checked: boolean) => void;
  onOverrideChange: (tierIndex: number, value: EditableNumber) => void;
  onOverrideClear: (tierIndex: number) => void;
};

export function PopulationFaction({
  config,
  state,
  islandHouses,
  islandPopulation,
  idPrefix = '',
  onHousesChange,
  onHousesClear,
  onMaxTierChange,
  onLivingSpaceChange,
  onSenateChange,
  onOverrideChange,
  onOverrideClear,
}: PopulationFactionProps) {
  // Redistributed values: a limited higher tier refills the lower one live.
  const effective = effectivePopulation(config.id as Faction, state, islandHouses, islandPopulation);
  const houses = resolveHouses(state, islandHouses);
  const housesManual = state.houses !== null;

  return (
    <section className={`population-faction population-faction--${config.id}`}>
      <header className="population-faction__identity">
        <img src={config.houseImage} alt="" width="46" height="46" />
        <h3>{config.label}</h3>
      </header>

      <div
        className={`population-value${onHousesClear && housesManual ? ' population-value--manual' : ''}`}
        data-testid={`${idPrefix}${config.id}-houses-value`}
      >
        {onHousesClear && (
          <div className="population-value__status">
            <span>{housesManual ? 'Manual' : 'Auto'}</span>
            {housesManual && (
              <button
                type="button"
                onClick={onHousesClear}
                aria-label={`Use island ${config.label} houses`}
              >
                Auto
              </button>
            )}
          </div>
        )}
        <NumericInput
          id={`${idPrefix}${config.id}-houses`}
          label={`${config.label} houses`}
          raw={houses.raw}
          valid={houses.value !== null}
          onChange={(raw) => onHousesChange({ raw, value: parseNonNegativeInteger(raw) })}
        />
      </div>

      <fieldset className="tier-selector">
        <legend>Highest population tier</legend>
        <div className="tier-selector__options">
          {config.tierLabels.map((tierLabel, index) => (
            <button
              key={tierLabel}
              type="button"
              className="tier-selector__option"
              aria-label={`${config.label} ${tierLabel}`}
              aria-pressed={state.maxTier === index + 1}
              onClick={() => onMaxTierChange(index + 1)}
            >
              <img src={config.tierImages[index]} alt="" width="60" height="60" />
              <span>{tierLabel}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="population-options">
        <label>
          <img src={config.livingSpaceImage} alt="" width="50" height="50" />
          <input
            type="checkbox"
            checked={state.livingSpace}
            onChange={(event) => onLivingSpaceChange(event.target.checked)}
          />
          <span>{config.livingSpaceLabel}</span>
        </label>
        <label>
          <img src={config.senateImage} alt="" width="60" height="60" />
          <input
            type="checkbox"
            checked={state.senate}
            onChange={(event) => onSenateChange(event.target.checked)}
          />
          <span>{config.senateLabel}</span>
        </label>
      </div>

      <div className="population-values">
        {config.tierLabels.map((tierLabel, index) => {
          const override = state.overrides[index];
          const manual = override !== null;
          const raw = manual ? override.raw : effective?.[index]?.toString() ?? '';
          const valid = manual ? override.value !== null : effective !== null;
          const inputId = `${idPrefix}${config.id}-population-${index}`;

          return (
            <div
              key={tierLabel}
              className={`population-value${manual ? ' population-value--manual' : ''}`}
              data-testid={`${idPrefix}${config.id}-population-${index}`}
            >
              <div className="population-value__status">
                <span>{manual ? 'Manual' : 'Auto'}</span>
                {manual && (
                  <button
                    type="button"
                    onClick={() => onOverrideClear(index)}
                    aria-label={`Use automatic ${config.label} ${tierLabel} population`}
                  >
                    Auto
                  </button>
                )}
              </div>
              <NumericInput
                id={inputId}
                label={`${config.label} ${tierLabel} population`}
                raw={raw}
                valid={valid}
                placeholder="—"
                onChange={(newRaw) => onOverrideChange(index, {
                  raw: newRaw,
                  value: parseNonNegativeInteger(newRaw),
                })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
