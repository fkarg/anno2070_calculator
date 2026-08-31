import { maskSatisfaction, type IgnoredDemandSource } from './demand-policy';
import { producedGood, type GoodId } from './goods';
import type { Faction } from './population';
import { calculateMaterial, calculatePrimary } from './production';
import { PRODUCTION_NODES } from './production-data';

export type GrowthDemandChain = Readonly<{
  source: IgnoredDemandSource;
  faction: Faction;
  rootNodeId: string;
  pathNodeIds: readonly string[];
  required: number;
}>;

export type GrowthRequirementSnapshot = Readonly<{
  required: number;
  chains: readonly GrowthDemandChain[];
}>;

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

function pathToRoot(nodeId: string): readonly string[] {
  const reversed = [nodeId];
  let node = nodeById.get(nodeId)!;
  while (node.calculation.kind === 'material') {
    reversed.push(node.calculation.parentId);
    node = nodeById.get(node.calculation.parentId)!;
  }
  return reversed.reverse();
}

function tierContribution(
  pathNodeIds: readonly string[],
  population: Record<Faction, readonly number[]>,
  tier: number,
  recycling: boolean,
): number {
  const root = nodeById.get(pathNodeIds[0])!;
  if (root.calculation.kind !== 'primary') throw new Error('Demand path lacks a primary root');
  const oneTier = root.calculation.satisfaction.map((value, index) => index === tier ? value : 0);
  let required = calculatePrimary(
    oneTier,
    population[root.faction],
    100,
    Boolean(root.calculation.recyclable && recycling),
    false,
  );
  for (const nodeId of pathNodeIds.slice(1)) {
    const node = nodeById.get(nodeId)!;
    if (node.calculation.kind !== 'material') throw new Error('Demand path contains a second primary root');
    required = calculateMaterial(required, node.calculation.multiplier, 100, false);
  }
  return required;
}

export function calculateGrowthRequirements(
  population: Record<Faction, readonly number[]>,
  recycling: boolean,
  ignoredDemands: readonly IgnoredDemandSource[],
): ReadonlyMap<GoodId, GrowthRequirementSnapshot> {
  const chains = new Map<GoodId, GrowthDemandChain[]>();

  for (const node of PRODUCTION_NODES) {
    const goodId = producedGood(node.buildingId);
    if (goodId === null || goodId !== node.buildingId) continue;
    const pathNodeIds = pathToRoot(node.id);
    const root = nodeById.get(pathNodeIds[0])!;
    if (root.calculation.kind !== 'primary') throw new Error('Demand path lacks a primary root');
    const sourceGoodId = producedGood(root.buildingId)!;
    const satisfaction = maskSatisfaction({
      goodId: sourceGoodId,
      faction: root.faction,
      satisfaction: root.calculation.satisfaction,
      unlockAt: root.unlockAt!,
      population: population[root.faction],
      ignored: ignoredDemands,
    });
    satisfaction.forEach((satisfied, tier) => {
      if (satisfied === 0) return;
      const required = tierContribution(pathNodeIds, population, tier, recycling);
      if (required === 0) return;
      const entries = chains.get(goodId) ?? [];
      entries.push({
        source: { faction: root.faction, tier, goodId: sourceGoodId },
        faction: root.faction,
        rootNodeId: root.id,
        pathNodeIds,
        required,
      });
      chains.set(goodId, entries);
    });
  }

  return new Map([...chains].map(([goodId, contributions]) => [goodId, {
    required: contributions.reduce((sum, chain) => sum + chain.required, 0),
    chains: contributions,
  }]));
}
