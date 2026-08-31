import { useState, type KeyboardEvent } from 'react';

import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { tierHeadroom } from '../calculations/coverage';
import type { GoodId } from '../calculations/goods';
import { tierCapacities, type Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { sumIslandPopulations } from '../island';
import { FACTIONS, FACTION_CONFIGS } from '../model';
import type { GrowthMilestone, GrowthPlanningResult } from '../calculations/planning';
import type { IslandState } from '../island';
import { CoverageBottleneckCard } from './CoverageBottleneckCard';
import { currentCoverageView, milestoneCoverageCards } from './coverage-card-model';

type CoverageSectionProps = {
  islands: readonly IslandState[];
  planning: GrowthPlanningResult | null;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
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

function milestoneTierLabel(milestone: GrowthMilestone): string {
  return FACTION_CONFIGS[milestone.faction].tierLabels[milestone.tier - 1];
}

function milestoneTitle(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  const tier = milestoneTierLabel(milestone);
  return milestone.kind === 'expand'
    ? `Expand ${config.label} at ${tier}`
    : `${config.tierLabels[milestone.tier - 2]} → ${tier}`;
}

function milestoneSummary(milestone: GrowthMilestone): string {
  const tier = milestoneTierLabel(milestone);
  const delta = milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
  const gapLabel = milestone.gaps.length === 1 ? 'gap' : 'gaps';
  return `Full-demand supply toward ${delta >= 0 ? '+' : ''}${delta} planned ${tier} · ${milestone.gaps.length} ${gapLabel}`;
}

export function CoverageSection({ islands, planning, onApplyBuilding }: CoverageSectionProps) {
  const [selected, setSelected] = useState<'current' | Faction>('current');
  const activeMilestones = Object.fromEntries(FACTIONS.map((faction) => [
    faction,
    planning?.sequences[faction].find((milestone) => !milestone.complete) ?? null,
  ])) as Record<Faction, GrowthMilestone | null>;
  const selectedMilestone = selected === 'current' ? null : activeMilestones[selected];
  const effectiveSelection = selected !== 'current' && selectedMilestone === null
    ? 'current'
    : selected;
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

  const { cards, unbuilt } = currentCoverageView(islands, planning);
  const headroom = headroomRows(islands);
  const milestoneCards = selectedMilestone ? milestoneCoverageCards(selectedMilestone) : [];
  const displayedCards = effectiveSelection === 'current' ? cards.slice(0, 4) : milestoneCards.slice(0, 4);
  const laterCards = effectiveSelection === 'current' ? [] : milestoneCards.slice(4);

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
        <strong>{milestoneTitle(selectedMilestone)}</strong>
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
        </div>
      )}
      {effectiveSelection === 'current' && cards.length === 0 && unbuilt.length === 0
        && <p className="coverage-section__empty">Nothing is limiting the current population's built supply chains right now.</p>}
      {displayedCards.length > 0 && (
        <ol className="coverage-section__cards">
          {displayedCards.map((card, index) => <CoverageBottleneckCard
            key={card.id}
            card={card}
            rank={index + 1}
            islands={islands}
            onApplyBuilding={onApplyBuilding}
          />)}
        </ol>
      )}
      {effectiveSelection === 'current' && unbuilt.length > 0 && (
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
