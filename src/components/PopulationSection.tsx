import type { Faction } from '../calculations/population';
import {
  FACTIONS,
  FACTION_CONFIGS,
  type CalculatorState,
  type FactionState,
} from '../model';
import { PopulationFaction } from './PopulationFaction';

type PopulationSectionProps = {
  state: CalculatorState;
  onFactionChange: (faction: Faction, update: (current: FactionState) => FactionState) => void;
};

export function PopulationSection({ state, onFactionChange }: PopulationSectionProps) {
  return (
    <section className="calculator-section population-section">
      <div className="calculator-section__heading">
        <h2>Residences &amp; inhabitants</h2>
        <p>Results update automatically</p>
      </div>

      <div className="population-section__factions">
        {FACTIONS.map((faction) => (
          <PopulationFaction
            key={faction}
            config={FACTION_CONFIGS[faction]}
            state={state.factions[faction]}
            onHousesChange={(houses) => onFactionChange(faction, (current) => ({ ...current, houses }))}
            onMaxTierChange={(maxTier) => onFactionChange(faction, (current) => ({ ...current, maxTier }))}
            onLivingSpaceChange={(livingSpace) => onFactionChange(faction, (current) => ({ ...current, livingSpace }))}
            onSenateChange={(senate) => onFactionChange(faction, (current) => ({ ...current, senate }))}
            onOverrideChange={(tierIndex, value) => onFactionChange(faction, (current) => ({
              ...current,
              overrides: current.overrides.map((override, index) => index === tierIndex ? value : override),
            }))}
            onOverrideClear={(tierIndex) => onFactionChange(faction, (current) => ({
              ...current,
              overrides: current.overrides.map((override, index) => index === tierIndex ? null : override),
            }))}
          />
        ))}
      </div>
    </section>
  );
}
