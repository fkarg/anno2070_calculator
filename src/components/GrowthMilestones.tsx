import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { GOODS } from '../calculations/goods';
import type { GrowthPlanningResult } from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { canBuildOn, islandProductivity, type IslandState } from '../island';
import { FACTION_CONFIGS } from '../model';
import { OperatingImpactValues } from './OperatingImpactValues';

type Props = {
  planning: GrowthPlanningResult | null;
  islands: readonly IslandState[];
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

export function GrowthMilestones({ planning, islands, onApplyBuilding }: Props) {
  if (planning === null) {
    return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>Planning unavailable while a target or actual value is invalid.</p></section>;
  }
  if (planning.milestones.length === 0) {
    return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>No population growth steps remain for these targets.</p></section>;
  }

  return (
    <section className="growth-milestones">
      <header>
        <h3>Full-supply milestones</h3>
        <p>Inputs come first; each checkpoint includes every earlier population step.</p>
      </header>
      <div className="growth-milestones__list">
        {planning.milestones.map((milestone) => {
          const config = FACTION_CONFIGS[milestone.faction];
          const state = milestone.complete ? 'complete' : milestone.current ? 'current' : 'future';
          const targetTier = config.tierLabels[milestone.tier - 1];
          const tierDelta = milestone.populationAfter[milestone.faction][milestone.tier - 1]
            - milestone.populationBefore[milestone.faction][milestone.tier - 1];
          const title = milestone.kind === 'expand'
            ? `Expand ${config.label} at ${targetTier}`
            : `${config.tierLabels[milestone.tier - 2]} to ${targetTier}`;
          return (
            <details
              key={milestone.id}
              className={`growth-milestone growth-milestone--${state}`}
              data-testid={`growth-milestone-${milestone.id}`}
              open={milestone.current}
            >
              <summary>
                <span>{title}</span>
                <small>{tierDelta >= 0 ? '+' : ''}{tierDelta} {targetTier} · {milestone.complete ? 'covered' : `${milestone.gaps.length} capacity gaps`}</small>
              </summary>
              {!milestone.complete && (
                <div className="growth-milestone__gaps">
                  {milestone.gaps.map((gap) => {
                    const good = GOODS.get(gap.goodId)!;
                    return (
                      <article className="growth-gap" key={gap.goodId} data-testid={`growth-gap-${milestone.id}-${gap.goodId}`}>
                        <header>
                          <img src={`/assets/${BUILDINGS[gap.goodId].image}`} alt="" width="36" height="36" />
                          <div><h4>{BUILDINGS[gap.goodId].label}</h4><small>Target full demand</small></div>
                          <dl>
                            <div><dt>Required</dt><dd>{formatRequirement(gap.required)}</dd></div>
                            <div><dt>Actual capacity</dt><dd data-testid="growth-gap-capacity">{formatRequirement(gap.capacity)}</dd></div>
                            <div><dt>Remaining</dt><dd data-testid="growth-gap-remaining">{formatRequirement(gap.remaining)}</dd></div>
                          </dl>
                        </header>
                        <div className="growth-gap__actions">
                          {good.producers.flatMap((producer) => islands
                            .filter((island) => island.settled && canBuildOn(island, producer.buildingId))
                            .flatMap((island) => {
                              const productivity = islandProductivity(island, producer.buildingId);
                              if (productivity === null) return [];
                              const building = BUILDINGS[producer.buildingId];
                              const contribution = producer.rate * productivity / 100;
                              return [(
                                <button
                                  key={`${producer.buildingId}-${island.id}`}
                                  type="button"
                                  className="growth-producer-action"
                                  aria-label={`Build one ${building.label} on ${island.name}`}
                                  onClick={() => onApplyBuilding(island.id, producer.buildingId)}
                                >
                                  <img src={`/assets/${building.image}`} alt="" width="28" height="28" />
                                  <span>+1 {building.label} on {island.name}</span>
                                  <small>+{formatRequirement(contribution)} nominal output</small>
                                  <OperatingImpactValues impact={building.operatingImpact} ecoUnavailable={island.underwater} />
                                </button>
                              )];
                            }))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
