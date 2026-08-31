import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { GOODS } from '../calculations/goods';
import type { GrowthGap } from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import { canBuildOn, islandProductivity, type IslandState } from '../island';
import { FACTION_CONFIGS } from '../model';
import { OperatingImpactValues } from './OperatingImpactValues';

type Props = {
  gap: GrowthGap;
  islands: readonly IslandState[];
  subtitle: string;
  testId: string;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

export function GrowthGapCard({ gap, islands, subtitle, testId, onApplyBuilding }: Props) {
  const good = GOODS.get(gap.goodId)!;
  return <article className="growth-gap" data-testid={testId}>
    <header>
      <img src={`/assets/${BUILDINGS[gap.goodId].image}`} alt="" width="36" height="36" />
      <div><h4>{BUILDINGS[gap.goodId].label}</h4><small>{subtitle}</small></div>
      <dl>
        <div><dt>Required</dt><dd>{formatRequirement(gap.required)}</dd></div>
        <div><dt>Actual effective capacity</dt><dd data-testid="growth-gap-capacity">{formatRequirement(gap.capacity)}</dd></div>
        <div><dt>Remaining</dt><dd data-testid="growth-gap-remaining">{formatRequirement(gap.remaining)}</dd></div>
      </dl>
    </header>
    <details className="growth-gap__why">
      <summary>Why required?</summary>
      <ul>
        {gap.chains.map((chain) => <li key={`${chain.faction}-${chain.pathNodeIds.join('-')}`}>
          <span>{FACTION_CONFIGS[chain.faction].label} · {chain.pathNodeIds
            .map((id) => BUILDINGS[nodeById.get(id)!.buildingId].label)
            .join(' → ')}</span>
          <output>{formatRequirement(chain.required)}</output>
        </li>)}
      </ul>
    </details>
    <div className="growth-gap__actions">
      {good.producers.flatMap((producer) => islands
        .filter((island) => island.settled && canBuildOn(island, producer.buildingId))
        .flatMap((island) => {
          const productivity = islandProductivity(island, producer.buildingId);
          if (productivity === null) return [];
          const building = BUILDINGS[producer.buildingId];
          const contribution = producer.rate * productivity / 100;
          return [<button
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
          </button>];
        }))}
    </div>
  </article>;
}
