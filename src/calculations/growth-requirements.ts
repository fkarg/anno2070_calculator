import { calculateProduction, createDefaultProductivity } from './calculate-production';
import { producedGood, type GoodId } from './goods';
import type { Faction } from './population';
import { PRODUCTION_NODES } from './production-data';

export type GrowthDemandChain = Readonly<{
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

export function calculateGrowthRequirements(
  population: Record<Faction, readonly number[]>,
  recycling: boolean,
): ReadonlyMap<GoodId, GrowthRequirementSnapshot> {
  const totals = calculateProduction({
    population,
    productivity: createDefaultProductivity(),
    recycling,
    wholeBuildings: false,
  });
  const chains = new Map<GoodId, GrowthDemandChain[]>();

  for (const node of PRODUCTION_NODES) {
    const goodId = producedGood(node.buildingId);
    if (goodId === null || goodId !== node.buildingId || totals[node.id] === 0) continue;
    const pathNodeIds = pathToRoot(node.id);
    const entries = chains.get(goodId) ?? [];
    entries.push({
      faction: node.faction,
      rootNodeId: pathNodeIds[0],
      pathNodeIds,
      required: totals[node.id],
    });
    chains.set(goodId, entries);
  }

  return new Map([...chains].map(([goodId, contributions]) => [goodId, {
    required: contributions.reduce((sum, chain) => sum + chain.required, 0),
    chains: contributions,
  }]));
}
