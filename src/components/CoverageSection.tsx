import { useState } from 'react';

import { BUILDINGS } from '../calculations/building-data';
import { GOODS, producedGood, type GoodId } from '../calculations/goods';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import {
  calculateSupportedPopulation,
  effectiveCapacities,
} from '../calculations/supported-population';
import type { IslandState } from '../island';

type CoverageSectionProps = {
  islands: readonly IslandState[];
  planRequirements: Record<string, number | null>;
};

type Card = {
  goodId: GoodId;
  title: string;
  why: string;
  solve: string;
  next: string | null;
};

function canonicalProducerLabel(goodId: GoodId): string {
  return BUILDINGS[goodId].label;
}

// Bottlenecks toward the current population's demand: the ranked constraint
// list of the supported-population calculation.
function demandCards(islands: readonly IslandState[]): Card[] {
  const support = calculateSupportedPopulation(islands);
  return support.constraints.slice(0, 4).map((constraint, index) => {
    const available = Math.max(0, constraint.effectiveCapacity - constraint.intermediateDemand);
    const successor = support.constraints[index + 1];
    return {
      goodId: constraint.goodId,
      title: `${canonicalProducerLabel(constraint.goodId)} · ×${formatRequirement(constraint.scale)}`,
      why: `${formatRequirement(available)} available vs ${formatRequirement(constraint.finalDemand)} needed by the current population`,
      solve: index === 0 && support.scaleAfterNextBuilding !== null
        ? `+1 ${canonicalProducerLabel(constraint.goodId)} → supports ×${formatRequirement(support.scaleAfterNextBuilding)}`
        : `+1 ${canonicalProducerLabel(constraint.goodId)} → ×${formatRequirement(Math.max(0, available + 1) / constraint.finalDemand)} on this good`,
      next: successor ? canonicalProducerLabel(successor.goodId) : null,
    };
  });
}

// Bottlenecks toward the plan: the largest gaps between plan requirements and
// actual (chain-throttled) capacity, per good.
function planCards(
  islands: readonly IslandState[],
  planRequirements: Record<string, number | null>,
): Card[] {
  const capacities = effectiveCapacities(islands);
  const required = new Map<GoodId, number>();
  for (const node of PRODUCTION_NODES) {
    if (producedGood(node.buildingId) !== node.buildingId) continue;
    const requirement = planRequirements[node.id];
    if (requirement === null || requirement === undefined) continue;
    required.set(node.buildingId, (required.get(node.buildingId) ?? 0) + requirement);
  }

  const gaps = [...required.entries()]
    .filter(([goodId]) => GOODS.has(goodId))
    .map(([goodId, requirement]) => {
      const capacity = goodId in capacities ? capacities[goodId] : 0;
      return capacity === null || capacity === undefined
        ? null
        : { goodId, requirement, capacity, gap: requirement - capacity };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.gap > 1e-9)
    .sort((left, right) => right.gap - left.gap)
    .slice(0, 4);

  return gaps.map((entry, index) => ({
    goodId: entry.goodId,
    title: `${canonicalProducerLabel(entry.goodId)} · ${formatRequirement(entry.gap)} short`,
    why: `plan needs ${formatRequirement(entry.requirement)}, actual capacity covers ${formatRequirement(entry.capacity)}`,
    solve: `build ${Math.ceil(entry.gap - 1e-9)} more to cover the plan`,
    next: gaps[index + 1] ? canonicalProducerLabel(gaps[index + 1].goodId) : null,
  }));
}

export function CoverageSection({ islands, planRequirements }: CoverageSectionProps) {
  const [frame, setFrame] = useState<'demand' | 'plan'>('demand');
  if (!islands.some((island) => island.settled)) return null;

  const cards = frame === 'demand' ? demandCards(islands) : planCards(islands, planRequirements);

  return (
    <section className="calculator-section coverage-section">
      <div className="calculator-section__heading">
        <div>
          <h2>Coverage &amp; bottlenecks</h2>
        </div>
        <p>What limits you now, and what solving it unlocks</p>
        <div className="coverage-section__frames">
          <button
            type="button"
            aria-pressed={frame === 'demand'}
            onClick={() => setFrame('demand')}
          >
            Toward demand
          </button>
          <button
            type="button"
            aria-pressed={frame === 'plan'}
            onClick={() => setFrame('plan')}
          >
            Toward plan
          </button>
        </div>
      </div>

      {cards.length === 0
        ? <p className="coverage-section__empty">Nothing is limiting {frame === 'demand' ? 'the current population' : 'the plan'} right now.</p>
        : (
          <ol className="coverage-section__cards">
            {cards.map((card, index) => (
              <li key={card.goodId} className="bottleneck-card" data-testid={`bottleneck-${frame}-${card.goodId}`}>
                <h3>
                  <img src={`/assets/${BUILDINGS[card.goodId].image}`} alt="" width="26" height="26" />
                  <span>{index + 1}. {card.title}</span>
                </h3>
                <p>{card.why}</p>
                <p className="bottleneck-card__solve">{card.solve}</p>
                {card.next && <p className="bottleneck-card__next">next bottleneck: {card.next}</p>}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
