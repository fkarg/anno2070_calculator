import { BUILDINGS } from '../calculations/building-data';
import { tierHeadroom } from '../calculations/coverage';
import { type Faction } from '../calculations/population';
import type { IslandState } from '../island';
import { FACTIONS, FACTION_CONFIGS, type FactionHouses } from '../model';

type PopulationOverviewProps = {
  actualHouses: FactionHouses;
  targetHouses: FactionHouses;
  actualPopulations: Record<Faction, readonly number[] | null>;
  targetPopulations: Record<Faction, readonly number[] | null>;
  islands: readonly IslandState[];
};

function populationSummary(
  faction: Faction,
  houses: number | null,
  populations: readonly number[] | null,
): string {
  if (houses === null || populations === null) return '—';
  const tiers = populations
    .map((value, index) => value > 0 ? `${value} ${FACTION_CONFIGS[faction].tierLabels[index]}` : null)
    .filter((value): value is string => value !== null);
  return `${houses} residences${tiers.length === 0 ? '' : ` · ${tiers.join(' · ')}`}`;
}

export function PopulationOverview({
  actualHouses,
  targetHouses,
  actualPopulations,
  targetPopulations,
  islands,
}: PopulationOverviewProps) {
  return (
    <section className="calculator-section population-overview">
      <div className="calculator-section__heading">
        <div><h2>Residences &amp; inhabitants</h2></div>
        <p>Actual population, Growth target, and current full-demand headroom</p>
      </div>
      <div className="population-overview__headings" aria-hidden="true">
        <span>Faction</span><span>Actual</span><span>Target</span><span>Headroom / limit</span>
      </div>
      <ul>
        {FACTIONS.map((faction) => {
          const actual = actualPopulations[faction];
          const target = targetPopulations[faction];
          const topTier = actual?.reduce((top, value, index) => value > 0 ? index : top, -1) ?? -1;
          const headroom = topTier >= 0 ? tierHeadroom(islands, faction, topTier) : null;
          return (
            <li key={faction} className={`population-overview__row population-overview__row--${faction}`}>
              <strong>{FACTION_CONFIGS[faction].label}</strong>
              <span>{populationSummary(faction, actualHouses[faction], actual)}</span>
              <span>{populationSummary(faction, targetHouses[faction], target)}</span>
              <span>{headroom === null
                ? '—'
                : `+${Math.floor(headroom.additional + 1e-9)} ${FACTION_CONFIGS[faction].tierLabels[topTier]} · ${BUILDINGS[headroom.limitingGood].label}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
