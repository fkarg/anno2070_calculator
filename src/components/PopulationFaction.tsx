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
  // 'plan': global card with Auto/Manual mode, bonuses, tier cap in manual mode.
  // 'island': always-manual houses, no bonuses (global), tier cap always shown.
  variant?: 'plan' | 'island';
  onHousesChange: (value: EditableNumber) => void;
  onHousesClear?: () => void;
  onMaxTierChange: (tier: number) => void;
  onLivingSpaceChange?: (checked: boolean) => void;
  onSenateChange?: (checked: boolean) => void;
  onOverrideChange: (tierIndex: number, value: EditableNumber) => void;
  onOverrideClear: (tierIndex: number) => void;
};

function RevealEditRow({
  icon,
  label,
  subLabel,
  manual,
  inputId,
  inputLabel,
  raw,
  valid,
  testId,
  onChange,
  onClear,
  clearLabel,
}: {
  icon: string;
  label: string;
  subLabel: string;
  manual: boolean;
  inputId: string;
  inputLabel: string;
  raw: string;
  valid: boolean;
  testId: string;
  onChange: (raw: string) => void;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <li className={`pop-row${manual ? ' pop-row--manual' : ''}`} data-testid={testId}>
      <img src={icon} alt="" width="28" height="28" />
      <div className="pop-row__label">
        <span>{label}</span>
        <small>{subLabel}</small>
      </div>
      {manual && onClear && (
        <button
          type="button"
          className="pop-row__reset"
          onClick={onClear}
          aria-label={clearLabel}
        >
          Auto
        </button>
      )}
      <div className="reveal-edit">
        <output aria-hidden="true">{valid ? (raw === '' ? '—' : raw) : '—'}</output>
        <NumericInput
          id={inputId}
          label={inputLabel}
          raw={raw}
          valid={valid}
          placeholder="—"
          hideLabel
          onChange={onChange}
        />
      </div>
    </li>
  );
}

export function PopulationFaction({
  config,
  state,
  islandHouses,
  islandPopulation,
  idPrefix = '',
  variant = 'plan',
  onHousesChange,
  onHousesClear,
  onMaxTierChange,
  onLivingSpaceChange,
  onSenateChange,
  onOverrideChange,
  onOverrideClear,
}: PopulationFactionProps) {
  const effective = effectivePopulation(config.id as Faction, state, islandHouses, islandPopulation);
  const houses = resolveHouses(state, islandHouses);
  const showTierCap = variant === 'island' || state.houses !== null;

  return (
    <section className={`population-faction population-faction--${config.id}`}>
      <header className="population-faction__identity">
        <img src={config.houseImage} alt="" width="38" height="38" />
        <h3>{config.label}</h3>
        {variant === 'plan' && (
          <span className={`population-faction__mode${state.houses !== null ? ' population-faction__mode--manual' : ''}`}>
            {state.houses !== null ? 'Manual plan' : 'Following islands'}
          </span>
        )}
      </header>

      <ul className="pop-rows">
        <RevealEditRow
          icon={config.houseImage}
          label="Houses"
          subLabel={variant === 'island'
            ? 'actual residences'
            : state.houses !== null ? 'manual plan' : 'auto · from islands'}
          manual={variant === 'plan' && state.houses !== null}
          inputId={`${idPrefix}${config.id}-houses`}
          inputLabel={`${config.label} houses`}
          raw={houses.raw}
          valid={houses.value !== null}
          testId={`${idPrefix}${config.id}-houses-value`}
          onChange={(raw) => onHousesChange({ raw, value: parseNonNegativeInteger(raw) })}
          onClear={onHousesClear}
          clearLabel={`Use island ${config.label} houses`}
        />
        {config.tierLabels.map((tierLabel, index) => {
          const override = state.overrides[index];
          const manual = override !== null;
          const raw = manual ? override.raw : effective?.[index]?.toString() ?? '';
          const valid = manual ? override.value !== null : effective !== null;
          return (
            <RevealEditRow
              key={tierLabel}
              icon={config.tierImages[index]}
              label={tierLabel}
              subLabel={manual ? 'manual override' : 'auto'}
              manual={manual}
              inputId={`${idPrefix}${config.id}-population-${index}`}
              inputLabel={`${config.label} ${tierLabel} population`}
              raw={raw}
              valid={valid}
              testId={`${idPrefix}${config.id}-population-${index}`}
              onChange={(newRaw) => onOverrideChange(index, {
                raw: newRaw,
                value: parseNonNegativeInteger(newRaw),
              })}
              onClear={() => onOverrideClear(index)}
              clearLabel={`Use automatic ${config.label} ${tierLabel} population`}
            />
          );
        })}
      </ul>

      {variant === 'plan' && state.houses === null && (
        <div className="population-faction__footer">
          <button
            type="button"
            onClick={() => onHousesChange(houses)}
            aria-label={`Plan ${config.label} manually`}
          >
            Plan manually
          </button>
        </div>
      )}

      {showTierCap && (
        <fieldset className="tier-cap">
          <legend>Highest population tier</legend>
          <div className="tier-cap__options">
            {config.tierLabels.map((tierLabel, index) => (
              <button
                key={tierLabel}
                type="button"
                className="tier-cap__option"
                aria-label={`${config.label} ${tierLabel}`}
                aria-pressed={state.maxTier === index + 1}
                title={tierLabel}
                onClick={() => onMaxTierChange(index + 1)}
              >
                <img src={config.tierImages[index]} alt="" width="30" height="30" />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {variant === 'plan' && onLivingSpaceChange && onSenateChange && (
        <div className="population-options population-options--compact">
          <label title={config.livingSpaceLabel}>
            <img src={config.livingSpaceImage} alt="" width="26" height="26" />
            <input
              type="checkbox"
              checked={state.livingSpace}
              onChange={(event) => onLivingSpaceChange(event.target.checked)}
            />
            <span>{config.livingSpaceLabel}</span>
          </label>
          <label title={config.senateLabel}>
            <img src={config.senateImage} alt="" width="26" height="26" />
            <input
              type="checkbox"
              checked={state.senate}
              onChange={(event) => onSenateChange(event.target.checked)}
            />
            <span>{config.senateLabel}</span>
          </label>
        </div>
      )}
    </section>
  );
}
