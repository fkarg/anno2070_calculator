import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import type { GrowthGap } from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import type { IslandState } from '../island';
import { FACTION_CONFIGS } from '../model';
import { ProducerActions } from './ProducerActions';
import { DemandSourceActions } from './DemandSourceActions';

type Props = {
  gap: GrowthGap;
  islands: readonly IslandState[];
  subtitle: string;
  testId: string;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
};

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

export function GrowthGapCard({ gap, islands, subtitle, testId, onApplyBuilding, onIgnoreDemand }: Props) {
  const sources = gap.chains.map((chain) => chain.source).filter((source, index, entries) => (
    entries.findIndex((candidate) => candidate.faction === source.faction
      && candidate.tier === source.tier
      && candidate.goodId === source.goodId) === index
  ));
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
        {gap.chains.map((chain) => <li key={`${chain.source.faction}-${chain.source.tier}-${chain.source.goodId}-${chain.pathNodeIds.join('-')}`}>
          <span>{FACTION_CONFIGS[chain.faction].label} · {chain.pathNodeIds
            .map((id) => BUILDINGS[nodeById.get(id)!.buildingId].label)
            .join(' → ')}</span>
          <output>{formatRequirement(chain.required)}</output>
        </li>)}
      </ul>
      <DemandSourceActions sources={sources} onIgnore={onIgnoreDemand} />
    </details>
    <ProducerActions
      goodId={gap.goodId}
      islands={islands}
      variant="detailed"
      onApplyBuilding={onApplyBuilding}
    />
  </article>;
}
