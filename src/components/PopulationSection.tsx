import { BUILDINGS } from '../calculations/building-data';
import { tierHeadroom } from '../calculations/coverage';
import type { Faction } from '../calculations/population';
import type { ResolvedPopulationTarget } from '../calculations/population-target';
import type { IslandState } from '../island';
import { FACTIONS, FACTION_CONFIGS, type FactionHouses, type TargetIntent } from '../model';

type Props = {
  actualHouses: FactionHouses;
  actualPopulations: Record<Faction, readonly number[] | null>;
  targets: Record<Faction, ResolvedPopulationTarget | null>;
  targetKinds: Record<Faction, TargetIntent['kind']>;
  islands: readonly IslandState[];
};

export function PopulationSection({ actualHouses, actualPopulations, targets, targetKinds, islands }: Props) {
  return <section className="calculator-section population-section">
    <div className="calculator-section__heading"><h2>Residences &amp; inhabitants</h2><p>Actual, Growth target, and current full-demand headroom</p></div>
    <div className="population-section__factions">{FACTIONS.map((faction) => {
      const config = FACTION_CONFIGS[faction];
      const actual = actualPopulations[faction];
      const target = targets[faction];
      return <section key={faction} className={`population-faction population-faction--${faction}`}>
        <header className="population-faction__identity"><img src={config.houseImage} alt="" width="38" height="38" /><h3>{config.label}</h3><span className="population-faction__mode">{targetKinds[faction] === 'follow' ? 'Following islands' : 'Growth target'}</span></header>
        <div className="population-overview-columns" aria-hidden="true"><span /><span>Actual</span><span>Headroom / limit</span><span>Target</span></div>
        <ul className="pop-rows pop-rows--overview">
          <li className="pop-row"><img src={config.houseImage} alt="" width="28" height="28" /><div className="pop-row__label"><span>Houses</span></div><output aria-label={`${config.label} actual residences`}>{actualHouses[faction] ?? '—'}</output><span className="population-overview__not-applicable">—</span><output aria-label={`${config.label} target residences`} data-testid={`overview-${faction}-target`}>{target?.houses ?? '—'}</output></li>
          {config.tierLabels.map((label, tier) => {
            const headroom = tierHeadroom(islands, faction, tier);
            return <li className="pop-row" key={label}><img src={config.tierImages[tier]} alt="" width="28" height="28" /><div className="pop-row__label"><span>{label}</span></div><output aria-label={`${config.label} actual ${label}`} data-testid={`overview-${faction}-actual-tier-${tier}`}>{actual?.[tier] ?? '—'}</output><output aria-label={`${config.label} ${label} headroom and limit`} data-testid={`overview-${faction}-headroom-tier-${tier}`}>{headroom === null ? '—' : `+${Math.floor(headroom.additional + 1e-9)} · ${BUILDINGS[headroom.limitingGood].label}`}</output><output aria-label={`${config.label} target ${label}`} data-testid={`overview-${faction}-target-tier-${tier}`}>{target?.effectivePopulations[tier] ?? '—'}</output></li>;
          })}
        </ul>
      </section>;
    })}</div>
  </section>;
}
