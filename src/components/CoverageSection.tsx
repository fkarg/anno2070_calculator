import { BUILDINGS } from '../calculations/building-data';
import { tierHeadroom } from '../calculations/coverage';
import type { GoodId } from '../calculations/goods';
import { tierCapacities, type Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { sumIslandPopulations } from '../island';
import { FACTIONS, FACTION_CONFIGS } from '../model';
import {
  calculateSupportedPopulation,
  throttleCause,
  type GoodConstraint,
} from '../calculations/supported-population';
import type { IslandState } from '../island';

type CoverageSectionProps = {
  islands: readonly IslandState[];
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

type HeadroomRow = Readonly<{
  faction: Faction;
  tierLabel: string;
  additional: number;
  houses: number;
  limitingGood: GoodId;
}>;

// How many more inhabitants of each faction's top occupied tier the current
// surpluses can feed, and the house equivalent (a fully ascended house of
// that tier). Lower tiers keep eating too: the per-inhabitant demands of a
// tier include every good its satisfaction table lists.
function headroomRows(islands: readonly IslandState[]): HeadroomRow[] {
  const populations = sumIslandPopulations(islands);
  return FACTIONS.flatMap((faction) => {
    const population = populations[faction];
    if (population === null) return [];
    const top = population.reduce((maxIndex, value, index) => (value > 0 ? index : maxIndex), -1);
    if (top === -1) return [];
    const headroom = tierHeadroom(islands, faction, top);
    if (headroom === null) return [];
    const livingSpace = islands[0]?.factions[faction].livingSpace ?? false;
    const perHouse = tierCapacities(faction, livingSpace)[top];
    return [{
      faction,
      tierLabel: FACTION_CONFIGS[faction].tierLabels[top],
      additional: Math.floor(headroom.additional + 1e-9),
      houses: Math.floor(headroom.additional / perHouse + 1e-9),
      limitingGood: headroom.limitingGood,
    }];
  });
}

// Bottlenecks toward the current population's demand. Chains never built sit
// at scale 0 and would drown the ranking, but they are known future work; the
// acute story is production that exists and was outgrown, so unbuilt chains
// collapse into a compact list below the cards.
function demandView(islands: readonly IslandState[]): { cards: Card[]; unbuilt: readonly GoodConstraint[] } {
  const support = calculateSupportedPopulation(islands);
  const acute = support.constraints.filter((constraint) => constraint.nominalCapacity > 0);
  const unbuilt = support.constraints.filter((constraint) => constraint.nominalCapacity === 0);
  const cards = acute.slice(0, 4).map((constraint, index) => {
    const available = Math.max(0, constraint.effectiveCapacity - constraint.intermediateDemand);
    const successor = acute[index + 1];
    // Chain-throttled producers: the real fix is the starved input, not more
    // of the throttled building itself.
    const starved = constraint.effectiveCapacity < constraint.nominalCapacity - 1e-9
      ? throttleCause(islands, constraint.goodId)
      : null;
    return {
      goodId: constraint.goodId,
      title: `${canonicalProducerLabel(constraint.goodId)} · ×${formatRequirement(constraint.scale)}`,
      why: starved
        ? `${formatRequirement(available)} available vs ${formatRequirement(constraint.finalDemand)} current full demand — your ${formatRequirement(constraint.nominalCapacity)} buildings are starved: ${canonicalProducerLabel(starved.goodId)} covers ${formatRequirement(starved.supply)} of ${formatRequirement(starved.demand)} input demand`
        : `${formatRequirement(available)} available vs ${formatRequirement(constraint.finalDemand)} current full demand`,
      solve: starved
        ? `+1 ${canonicalProducerLabel(starved.goodId)} → feeds the starved chain`
        : constraint.goodId === support.limitingGood && support.scaleAfterNextBuilding !== null
          ? `+1 ${canonicalProducerLabel(constraint.goodId)} → supports ×${formatRequirement(support.scaleAfterNextBuilding)}`
          : `+1 ${canonicalProducerLabel(constraint.goodId)} → ×${formatRequirement((available + 1) / constraint.finalDemand)} on this good`,
      next: successor ? canonicalProducerLabel(successor.goodId) : null,
    };
  });
  return { cards, unbuilt };
}

export function CoverageSection({ islands }: CoverageSectionProps) {
  if (!islands.some((island) => island.settled)) return null;

  const { cards, unbuilt } = demandView(islands);
  const headroom = headroomRows(islands);

  return (
    <section className="calculator-section coverage-section">
      <div className="calculator-section__heading">
        <div>
          <h2>Coverage &amp; bottlenecks</h2>
        </div>
        <p>What limits you now, and what solving it unlocks</p>
      </div>

      {headroom.length > 0 && (
        <ul className="coverage-section__headroom" data-testid="coverage-headroom">
          {headroom.map((row) => (
            <li key={row.faction} className={`coverage-headroom coverage-headroom--${row.faction}`}>
              <strong>{FACTION_CONFIGS[row.faction].label}</strong>
              {row.additional > 0
                ? (
                  <span>
                    room for +{row.additional} {row.tierLabel} (≈ {row.houses} houses), then{' '}
                    <img src={`/assets/${BUILDINGS[row.limitingGood].image}`} alt="" width="16" height="16" />{' '}
                    {canonicalProducerLabel(row.limitingGood)} runs out
                  </span>
                )
                : (
                  <span>
                    no headroom —{' '}
                    <img src={`/assets/${BUILDINGS[row.limitingGood].image}`} alt="" width="16" height="16" />{' '}
                    {canonicalProducerLabel(row.limitingGood)} is exhausted
                  </span>
                )}
            </li>
          ))}
        </ul>
      )}
      {cards.length === 0 && unbuilt.length === 0
        && <p className="coverage-section__empty">Nothing is limiting the current population right now.</p>}
      {cards.length > 0 && (
        <ol className="coverage-section__cards">
          {cards.map((card, index) => (
            <li key={card.goodId} className="bottleneck-card" data-testid={`bottleneck-demand-${card.goodId}`}>
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
      {unbuilt.length > 0 && (
        <p className="coverage-section__unbuilt" data-testid="coverage-unbuilt">
          <span>Chains not built yet:</span>
          {unbuilt.map((constraint) => (
            <span key={constraint.goodId} className="coverage-section__unbuilt-chip">
              <img src={`/assets/${BUILDINGS[constraint.goodId].image}`} alt="" width="18" height="18" />
              <span>{canonicalProducerLabel(constraint.goodId)} ({formatRequirement(constraint.finalDemand + constraint.intermediateDemand)} current full demand)</span>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
