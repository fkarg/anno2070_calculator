import { useEffect, useState, type KeyboardEvent } from 'react';

import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import {
  isDemandIgnored,
  isDemandUnlocked,
  sameDemandSource,
  type IgnoredDemandSource,
} from '../calculations/demand-policy';
import { tierHeadroom } from '../calculations/coverage';
import { GOODS, type GoodId } from '../calculations/goods';
import { tierCapacities, type Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { sumIslandPopulations } from '../island';
import { FACTIONS, FACTION_CONFIGS } from '../model';
import {
  growthGapIntroducedHere,
  type GrowthMilestone,
  type GrowthPlanningResult,
} from '../calculations/planning';
import type { IslandState } from '../island';
import { CoverageBottleneckCard } from './CoverageBottleneckCard';
import { DemandSourceActions } from './DemandSourceActions';
import { currentCoverageView, milestoneCoverageCards } from './coverage-card-model';
import {
  growthMilestonePopulationSummary,
  growthMilestoneTitle,
} from './growth-milestone-labels';

type CoverageSectionProps = {
  islands: readonly IslandState[];
  planning: GrowthPlanningResult | null;
  ignoredDemands: readonly IgnoredDemandSource[];
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

function canonicalProducerLabel(goodId: GoodId): string {
  return BUILDINGS[goodId].label;
}

function activeSources(
  goodId: GoodId,
  populations: Record<Faction, readonly number[] | null>,
  ignored: readonly IgnoredDemandSource[],
): IgnoredDemandSource[] {
  return (GOODS.get(goodId)?.finalDemands ?? []).flatMap((demand) =>
    demand.satisfaction.flatMap((satisfied, tier) => (
      satisfied > 0
        && (populations[demand.faction]?.[tier] ?? 0) > 0
        && populations[demand.faction] !== null
        && isDemandUnlocked(
          demand.satisfaction,
          demand.unlockAt,
          populations[demand.faction]!,
        )
        && !isDemandIgnored(ignored, demand.faction, tier, goodId)
        ? [{ faction: demand.faction, tier, goodId }]
        : []
    )),
  );
}

type HeadroomRow = Readonly<{
  faction: Faction;
  tierLabel: string;
  additional: number;
  houses: number;
  limitingGood: GoodId;
  reason: 'capacity' | 'unlock';
}>;

// How many more inhabitants of each faction's top occupied tier the current
// surpluses can feed, and the house equivalent (a fully ascended house of
// that tier). Lower tiers keep eating too: the per-inhabitant demands of a
// tier include every good its satisfaction table lists.
function headroomRows(
  islands: readonly IslandState[],
  ignoredDemands: readonly IgnoredDemandSource[],
): HeadroomRow[] {
  const populations = sumIslandPopulations(islands);
  return FACTIONS.flatMap((faction) => {
    const population = populations[faction];
    if (population === null) return [];
    const top = population.reduce((maxIndex, value, index) => (value > 0 ? index : maxIndex), -1);
    if (top === -1) return [];
    const headroom = tierHeadroom(islands, faction, top, ignoredDemands);
    if (headroom === null) return [];
    const livingSpace = islands[0]?.factions[faction].livingSpace ?? false;
    const perHouse = tierCapacities(faction, livingSpace)[top];
    return [{
      faction,
      tierLabel: FACTION_CONFIGS[faction].tierLabels[top],
      additional: Math.floor(headroom.additional + 1e-9),
      houses: Math.floor(headroom.additional / perHouse + 1e-9),
      limitingGood: headroom.limitingGood,
      reason: headroom.reason,
    }];
  });
}

function milestoneTierLabel(milestone: GrowthMilestone): string {
  return FACTION_CONFIGS[milestone.faction].tierLabels[milestone.tier - 1];
}

function milestoneSummary(milestone: GrowthMilestone): string {
  const introducedGapCount = milestone.gaps.filter(growthGapIntroducedHere).length;
  const gapLabel = introducedGapCount === 1 ? 'gap' : 'gaps';
  return `${growthMilestonePopulationSummary(milestone)} · ${introducedGapCount} ${gapLabel}`;
}

export function CoverageSection({ islands, planning, ignoredDemands, onIgnoreDemand, onApplyBuilding }: CoverageSectionProps) {
  const [selected, setSelected] = useState<'current' | Faction>('current');
  const activeMilestones = Object.fromEntries(FACTIONS.map((faction) => [
    faction,
    planning?.sequences[faction].find((milestone) => !milestone.complete) ?? null,
  ])) as Record<Faction, GrowthMilestone | null>;
  const selectedMilestone = selected === 'current' ? null : activeMilestones[selected];
  const effectiveSelection = selected !== 'current' && selectedMilestone === null
    ? 'current'
    : selected;
  useEffect(() => {
    if (selected === 'current' || selectedMilestone !== null) return;
    const timeout = window.setTimeout(() => setSelected('current'), 0);
    return () => window.clearTimeout(timeout);
  }, [selected, selectedMilestone]);
  const hasSettledIsland = islands.some((island) => island.settled);
  const hasMilestone = FACTIONS.some((faction) => activeMilestones[faction] !== null);
  if (!hasSettledIsland && !hasMilestone) return null;

  const contexts: ('current' | Faction)[] = [
    'current',
    ...FACTIONS.filter((faction) => activeMilestones[faction] !== null),
  ];
  const onContextKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: 'current' | Faction,
  ) => {
    const index = contexts.indexOf(current);
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? contexts.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % contexts.length
          : event.key === 'ArrowLeft' ? (index - 1 + contexts.length) % contexts.length
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = contexts[nextIndex];
    setSelected(next);
    document.getElementById(`coverage-context-${next}`)?.focus();
  };

  const { cards, unbuilt, available } = currentCoverageView(islands, planning, ignoredDemands);
  const populations = sumIslandPopulations(islands);
  const headroom = headroomRows(islands, ignoredDemands);
  const milestoneCards = selectedMilestone ? milestoneCoverageCards(selectedMilestone) : [];
  const displayedCards = effectiveSelection === 'current' ? cards.slice(0, 4) : milestoneCards.slice(0, 4);
  const laterCards = effectiveSelection === 'current' ? [] : milestoneCards.slice(4);
  const sourcesForCard = (goodId: GoodId): IgnoredDemandSource[] => {
    if (effectiveSelection === 'current' || selectedMilestone === null) {
      return activeSources(goodId, populations, ignoredDemands);
    }
    return selectedMilestone.gaps
      .filter((gap) => gap.goodId === goodId)
      .flatMap((gap) => gap.chains.map((chain) => chain.source))
      .filter((source, index, sources) => (
        sources.findIndex((candidate) => sameDemandSource(candidate, source)) === index
      ));
  };

  return (
    <section className="calculator-section coverage-section">
      <div className="calculator-section__heading">
        <div>
          <h2>Coverage &amp; bottlenecks</h2>
        </div>
        <p>What limits you now, and what solving it unlocks</p>
      </div>

      <div className="coverage-contexts" role="tablist" aria-label="Coverage context">
        <button
          id="coverage-context-current"
          type="button"
          role="tab"
          aria-controls="coverage-context-panel"
          aria-selected={effectiveSelection === 'current'}
          aria-label="Show Current coverage"
          tabIndex={effectiveSelection === 'current' ? 0 : -1}
          className={`coverage-context-tab${effectiveSelection === 'current' ? ' coverage-context-tab--active' : ''}`}
          onClick={() => setSelected('current')}
          onKeyDown={(event) => onContextKeyDown(event, 'current')}
        >Current</button>
        {FACTIONS.map((faction) => {
          const milestone = activeMilestones[faction];
          if (milestone === null) return null;
          const active = effectiveSelection === faction;
          const config = FACTION_CONFIGS[faction];
          const tier = milestoneTierLabel(milestone);
          return <button
            key={faction}
            id={`coverage-context-${faction}`}
            type="button"
            role="tab"
            aria-controls="coverage-context-panel"
            aria-selected={active}
            aria-label={`Show ${config.label} ${tier} coverage`}
            tabIndex={active ? 0 : -1}
            className={`coverage-context-tab coverage-context-tab--${faction}${active ? ' coverage-context-tab--active' : ''}`}
            onClick={() => setSelected(faction)}
            onKeyDown={(event) => onContextKeyDown(event, faction)}
          >{config.label} · {tier}</button>;
        })}
      </div>

      <div id="coverage-context-panel" role="tabpanel" aria-labelledby={`coverage-context-${effectiveSelection}`}>
      {effectiveSelection !== 'current' && selectedMilestone && <div
        className="coverage-section__scenario"
        data-testid="coverage-scenario-summary"
      >
        <strong>{growthMilestoneTitle(selectedMilestone)}</strong>
        <span>{milestoneSummary(selectedMilestone)}</span>
      </div>}

      {effectiveSelection === 'current' && headroom.length > 0 && (
        <div className="coverage-section__headroom-wrap">
          <strong>Built-chain supply room</strong>
        <ul className="coverage-section__headroom" data-testid="coverage-headroom">
          {headroom.map((row) => (
            <li key={row.faction} className={`coverage-headroom coverage-headroom--${row.faction}`}>
              <strong>{FACTION_CONFIGS[row.faction].label}</strong>
              {row.additional > 0
                ? (
                  <span>
                    room for +{row.additional} {row.tierLabel} (≈ {row.houses} houses), then{' '}
                    <img src={`/assets/${BUILDINGS[row.limitingGood].image}`} alt="" width="16" height="16" />{' '}
                    {row.reason === 'unlock'
                      ? `${canonicalProducerLabel(row.limitingGood)} unlocks`
                      : `${canonicalProducerLabel(row.limitingGood)} runs out`}
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
        </div>
      )}
      {effectiveSelection === 'current' && !available
        && <p className="coverage-section__empty">Coverage unavailable while an actual population or building value is invalid.</p>}
      {effectiveSelection === 'current' && available && cards.length === 0 && unbuilt.length === 0
        && <p className="coverage-section__empty">{ignoredDemands.length > 0
          ? `No active bottlenecks · ${ignoredDemands.length} ${ignoredDemands.length === 1 ? 'demand' : 'demands'} ignored`
          : "Nothing is limiting the current population's built supply chains right now."}</p>}
      {displayedCards.length > 0 && (
        <ol className="coverage-section__cards">
          {displayedCards.map((card, index) => <CoverageBottleneckCard
            key={card.id}
            card={card}
            rank={index + 1}
            islands={islands}
            sources={sourcesForCard(card.goodId)}
            onIgnoreDemand={onIgnoreDemand}
            onApplyBuilding={onApplyBuilding}
          />)}
        </ol>
      )}
      {effectiveSelection !== 'current' && selectedMilestone?.gate?.met === false && (
        <p className="coverage-section__empty">
          Increase the actual {FACTION_CONFIGS[selectedMilestone.faction].tierLabels[selectedMilestone.tier - 2]} population before planning this ascension. No next-tier supply is included yet.
        </p>
      )}
      {effectiveSelection === 'current' && unbuilt.length > 0 && (
        <div className="coverage-section__unbuilt" data-testid="coverage-unbuilt">
          <span>Chains not built yet:</span>
          {unbuilt.map((constraint) => (
            <div key={constraint.goodId} className="coverage-section__unbuilt-chip">
              <img src={`/assets/${BUILDINGS[constraint.goodId].image}`} alt="" width="18" height="18" />
              <span>{canonicalProducerLabel(constraint.goodId)} ({formatRequirement(constraint.finalDemand + constraint.intermediateDemand)} current full demand)</span>
              <DemandSourceActions sources={activeSources(constraint.goodId, populations, ignoredDemands)} onIgnore={onIgnoreDemand} />
            </div>
          ))}
        </div>
      )}
      {laterCards.length > 0 && <p className="coverage-section__later" data-testid="coverage-later-gaps">
        <span>Later gaps:</span>
        {laterCards.map((card) => <span key={card.id} className="coverage-section__later-chip">
          <img src={`/assets/${BUILDINGS[card.goodId].image}`} alt="" width="18" height="18" />
          <span>{card.title}</span>
        </span>)}
      </p>}
      </div>
    </section>
  );
}
