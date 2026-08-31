import { BUILDINGS } from '../calculations/building-data';
import type { GoodId } from '../calculations/goods';
import type {
  GrowthGap,
  GrowthGapChain,
  GrowthMilestone,
  GrowthPlanningResult,
} from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import {
  calculateSupportedPopulation,
  throttleCause,
  type GoodConstraint,
} from '../calculations/supported-population';
import type { IslandState } from '../island';
import { FACTION_CONFIGS } from '../model';

export type CoverageReason = Readonly<{
  label: string;
  amount: number;
  kind: 'changed' | 'carried' | 'current';
}>;

export type CoverageCardModel = Readonly<{
  id: string;
  goodId: GoodId;
  actionGoodId: GoodId;
  title: string;
  requirement: string;
  breadcrumb: readonly string[];
  outcome: string;
  why: readonly CoverageReason[];
}>;

const EPSILON = 1e-9;
const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

function buildingLabel(goodId: GoodId): string {
  return BUILDINGS[goodId].label;
}

function chainPathLabels(chain: GrowthGapChain): string[] {
  return chain.pathNodeIds.map((id) => BUILDINGS[nodeById.get(id)!.buildingId].label);
}

function reasonLabel(chain: GrowthGapChain): string {
  return `${FACTION_CONFIGS[chain.faction].label} · ${chainPathLabels(chain).join(' → ')}`;
}

function breadcrumbChain(gap: GrowthGap): GrowthGapChain | null {
  return [...gap.chains].sort((left, right) => right.addedHere - left.addedHere
    || right.required - left.required)[0] ?? null;
}

function milestoneDelta(milestone: GrowthMilestone): number {
  return milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
}

function milestoneEndpoint(milestone: GrowthMilestone, gap: GrowthGap, chain: GrowthGapChain): string {
  if (chain.addedHere > EPSILON) {
    const faction = FACTION_CONFIGS[milestone.faction];
    const tier = faction.tierLabels[milestone.tier - 1];
    const delta = milestoneDelta(milestone);
    return `${faction.label}: ${delta >= 0 ? '+' : ''}${delta} ${tier} planned`;
  }
  return Math.abs(chain.previousRequired - chain.baselineRequired) <= EPSILON
    ? 'current population'
    : `previous ${FACTION_CONFIGS[milestone.faction].label} step`;
}

export function currentCoverageView(
  islands: readonly IslandState[],
  planning: GrowthPlanningResult | null,
): { cards: CoverageCardModel[]; unbuilt: readonly GoodConstraint[] } {
  const support = calculateSupportedPopulation(islands);
  const acute = support.constraints.filter((constraint) => constraint.nominalCapacity > 0);
  const unbuilt = support.constraints.filter((constraint) => constraint.nominalCapacity === 0);
  const baselineByGood = new Map(
    (planning?.baseline.gaps ?? []).map((gap) => [gap.goodId, gap]),
  );
  const cards = acute.slice(0, 4).map((constraint, index): CoverageCardModel => {
    const available = Math.max(0, constraint.effectiveCapacity - constraint.intermediateDemand);
    const successor = acute[index + 1];
    const starved = constraint.effectiveCapacity < constraint.nominalCapacity - EPSILON
      ? throttleCause(islands, constraint.goodId)
      : null;
    const baselineGap = baselineByGood.get(constraint.goodId);
    const chain = baselineGap ? breadcrumbChain(baselineGap) : null;
    const actionGoodId = starved?.goodId ?? constraint.goodId;
    return {
      id: `demand-${constraint.goodId}`,
      goodId: constraint.goodId,
      actionGoodId,
      title: `${buildingLabel(constraint.goodId)} · ×${formatRequirement(constraint.scale)}`,
      requirement: starved
        ? `${formatRequirement(available)} available vs ${formatRequirement(constraint.finalDemand)} current full demand — ${formatRequirement(constraint.nominalCapacity)} nominal capacity is starved because ${buildingLabel(actionGoodId)} covers ${formatRequirement(starved.supply)} of ${formatRequirement(starved.demand)} input demand`
        : `${formatRequirement(available)} available vs ${formatRequirement(constraint.finalDemand)} current full demand`,
      breadcrumb: chain ? chainPathLabels(chain).reverse().concat('current population') : [],
      outcome: starved
        ? `Adding ${buildingLabel(actionGoodId)} feeds this starved chain.`
        : constraint.goodId === support.limitingGood && support.scaleAfterNextBuilding !== null
          ? `Covering this adds built-chain supply room up to ×${formatRequirement(support.scaleAfterNextBuilding)}.`
          : successor
            ? `Covering this moves the built-chain limit to ${buildingLabel(successor.goodId)}.`
            : 'Covering this adds built-chain supply room for the current population.',
      why: baselineGap?.chains.map((item) => ({
        label: reasonLabel(item),
        amount: item.required,
        kind: 'current' as const,
      })) ?? [],
    };
  });
  return { cards, unbuilt };
}

export function milestoneCoverageCards(milestone: GrowthMilestone): CoverageCardModel[] {
  return milestone.gaps.map((gap, index): CoverageCardModel => {
    const chain = breadcrumbChain(gap);
    const successor = milestone.gaps[index + 1];
    return {
      id: `${milestone.id}-${gap.goodId}`,
      goodId: gap.goodId,
      actionGoodId: gap.goodId,
      title: `${buildingLabel(gap.goodId)} · ${formatRequirement(gap.remaining)} missing`,
      requirement: `${formatRequirement(gap.capacity)} actual effective capacity vs ${formatRequirement(gap.required)} scenario demand`,
      breadcrumb: chain
        ? chainPathLabels(chain).reverse().concat(milestoneEndpoint(milestone, gap, chain))
        : [],
      outcome: successor
        ? `Covering this unlocks the next supply step: ${buildingLabel(successor.goodId)}.`
        : 'Covering this contributes the final missing capacity toward this full-demand scenario.',
      why: gap.chains.map((item) => ({
        label: reasonLabel(item),
        amount: item.required,
        kind: item.addedHere > EPSILON ? 'changed' as const : 'carried' as const,
      })),
    };
  });
}
