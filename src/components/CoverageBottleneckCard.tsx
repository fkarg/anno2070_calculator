import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import { formatRequirement } from '../calculations/production';
import type { IslandState } from '../island';
import type { CoverageCardModel } from './coverage-card-model';
import { DemandSourceActions } from './DemandSourceActions';
import { ProducerActions } from './ProducerActions';

type Props = {
  card: CoverageCardModel;
  rank: number;
  islands: readonly IslandState[];
  sources: readonly IgnoredDemandSource[];
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

export function CoverageBottleneckCard({ card, rank, islands, sources, onIgnoreDemand, onApplyBuilding }: Props) {
  return <li className="bottleneck-card" data-testid={`bottleneck-${card.id}`}>
    <h3>
      <img src={`/assets/${BUILDINGS[card.goodId].image}`} alt="" width="26" height="26" />
      <span>{rank}. {card.title}</span>
    </h3>
    <p className="bottleneck-card__requirement">{card.requirement}</p>
    {card.breadcrumb.length > 0 && <p className="bottleneck-card__breadcrumb">
      {card.breadcrumb.join(' → ')}
    </p>}
    <p className="bottleneck-card__outcome">{card.outcome}</p>
    <ProducerActions
      goodId={card.actionGoodId}
      islands={islands}
      variant="compact"
      onApplyBuilding={onApplyBuilding}
    />
    <DemandSourceActions sources={sources} onIgnore={onIgnoreDemand} />
    {card.why.length > 0 && <details className="bottleneck-card__why">
      <summary>Why required? · {card.why.length} demand {card.why.length === 1 ? 'path' : 'paths'}</summary>
      <ul>{card.why.map((reason, index) => <li key={`${reason.label}-${index}`}>
        <span>{reason.label} · {reason.kind}</span>
        <output>{formatRequirement(reason.amount)}</output>
      </li>)}</ul>
    </details>}
  </li>;
}
