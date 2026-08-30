import type { Faction } from '../calculations/population';
import {
  FACTIONS,
  FACTION_CONFIGS,
  NO_ISLAND_HOUSES,
  type CalculatorState,
  type FactionHouses,
  type FactionState,
} from '../model';
import { PopulationFaction } from './PopulationFaction';

type PopulationSectionProps = {
  state: CalculatorState;
  islandHouses?: FactionHouses;
  islandPopulations?: Record<Faction, number[] | null>;
  onFactionChange: (faction: Faction, update: (current: FactionState) => FactionState) => void;
};

export function PopulationSection({
  state,
  islandHouses = NO_ISLAND_HOUSES,
  islandPopulations,
  onFactionChange,
}: PopulationSectionProps) {
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
            islandHouses={islandHouses[faction]}
            islandPopulation={islandPopulations?.[faction]}
            statsOnly={state.factions[faction].houses === null}
            onHousesChange={(houses) => onFactionChange(faction, (current) => ({ ...current, houses }))}
            onHousesClear={() => onFactionChange(faction, (current) => ({ ...current, houses: null }))}
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
