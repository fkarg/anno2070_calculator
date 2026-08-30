import type { Faction } from './population';
import { ALTERNATIVE_GROUPS, PRODUCTION_NODES, type ProductionNode } from './production-data';
import type { BuildingId } from './building-data';

export type GoodId = BuildingId;

export type Producer = Readonly<{ buildingId: BuildingId; rate: number }>;
export type FinalDemand = Readonly<{
  faction: Faction;
  satisfaction: readonly number[];
  recyclable: boolean;
}>;
export type InputRate = Readonly<{ goodId: GoodId; rate: number }>;
export type Good = Readonly<{
  id: GoodId;
  producers: readonly Producer[];
  finalDemands: readonly FinalDemand[];
}>;

const RATE_EPSILON = 1e-9;
const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

// Option roots map to the good of their group's first (canonical) option,
// converting rates through the ratio of chain multipliers.
type OptionRole = Readonly<{ goodId: GoodId; rate: number }>;
const optionRoles = new Map<string, OptionRole>();
for (const group of ALTERNATIVE_GROUPS) {
  const canonical = nodeById.get(group.options[0].rootId)!;
  if (canonical.calculation.kind !== 'material') throw new Error(`Group ${group.id} lacks a material canonical option`);
  const canonicalMultiplier = canonical.calculation.multiplier;
  for (const option of group.options) {
    const node = nodeById.get(option.rootId)!;
    if (node.calculation.kind !== 'material') throw new Error(`Group option ${option.rootId} is not material`);
    optionRoles.set(option.rootId, {
      goodId: canonical.buildingId,
      rate: canonicalMultiplier / node.calculation.multiplier,
    });
  }
}

function goodOf(node: ProductionNode): GoodId {
  return optionRoles.get(node.id)?.goodId ?? node.buildingId;
}

export function producedGood(buildingId: BuildingId): GoodId | null {
  const node = PRODUCTION_NODES.find((candidate) => candidate.buildingId === buildingId);
  return node ? goodOf(node) : null;
}

function assertConsistent(kind: string, key: string, previous: number | undefined, next: number): number {
  if (previous !== undefined && Math.abs(previous - next) > RATE_EPSILON) {
    throw new Error(`Inconsistent ${kind} for ${key}: ${previous} vs ${next}`);
  }
  return next;
}

const producerRates = new Map<GoodId, Map<BuildingId, number>>();
const finalDemandsByGood = new Map<GoodId, FinalDemand[]>();
const consumptionByBuilding = new Map<BuildingId, Map<GoodId, number>>();

for (const node of PRODUCTION_NODES) {
  const goodId = goodOf(node);
  const rate = optionRoles.get(node.id)?.rate ?? 1;
  const rates = producerRates.get(goodId) ?? new Map<BuildingId, number>();
  rates.set(node.buildingId, assertConsistent('producer rate', `${goodId}/${node.buildingId}`, rates.get(node.buildingId), rate));
  producerRates.set(goodId, rates);

  if (node.calculation.kind === 'primary') {
    const demands = finalDemandsByGood.get(goodId) ?? [];
    if (demands.some((demand) => demand.faction === node.faction)) {
      throw new Error(`Duplicate final demand for ${goodId}/${node.faction}`);
    }
    demands.push({
      faction: node.faction,
      satisfaction: node.calculation.satisfaction,
      recyclable: Boolean(node.calculation.recyclable),
    });
    finalDemandsByGood.set(goodId, demands);
  } else {
    const parent = nodeById.get(node.calculation.parentId)!;
    // Units of this good consumed per parent building at 100%: the option-root
    // conversion makes alternative routes collapse onto one identical edge.
    const edgeRate = node.calculation.multiplier * rate;
    const inputs = consumptionByBuilding.get(parent.buildingId) ?? new Map<GoodId, number>();
    inputs.set(goodId, assertConsistent('consumption edge', `${parent.buildingId}->${goodId}`, inputs.get(goodId), edgeRate));
    consumptionByBuilding.set(parent.buildingId, inputs);
  }
}

export const GOODS: ReadonlyMap<GoodId, Good> = new Map(
  [...producerRates.entries()].map(([id, rates]) => [id, {
    id,
    producers: [...rates.entries()].map(([buildingId, rate]) => ({ buildingId, rate })),
    finalDemands: finalDemandsByGood.get(id) ?? [],
  }]),
);

export const CONSUMPTION: ReadonlyMap<BuildingId, readonly InputRate[]> = new Map(
  [...consumptionByBuilding.entries()].map(([buildingId, inputs]) => [
    buildingId,
    [...inputs.entries()].map(([goodId, rate]) => ({ goodId, rate })),
  ]),
);
