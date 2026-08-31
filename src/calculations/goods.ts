import type { Faction } from './population';
import { ALTERNATIVE_GROUPS, PRODUCTION_NODES, type ProductionNode } from './production-data';
import type { BuildingId } from './building-data';

export type GoodId = BuildingId;

export type Producer = Readonly<{ buildingId: BuildingId; rate: number }>;
export type FinalDemand = Readonly<{
  faction: Faction;
  satisfaction: readonly number[];
  unlockAt: number;
  recyclable: boolean;
}>;
export type InputRate = Readonly<{ goodId: GoodId; rate: number }>;
export type Good = Readonly<{
  id: GoodId;
  producers: readonly Producer[];
  finalDemands: readonly FinalDemand[];
}>;

// Terminal construction goods are accumulated for episodic building,
// research, and vehicle costs. They have production capacity, but no stable
// per-minute demand that could support coverage or transfer inference.
export const STOCKPILE_GOODS: ReadonlySet<GoodId> = new Set<GoodId>([
  'smelter',
  'toolsWorkshop',
  'sawmill',
  'glassworks',
  'concreteFactory',
  'steelworks',
  'carbonFactory',
]);

const RATE_EPSILON = 1e-9;
const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

// Construction-material goods, in canonical-producer building units. The wiki
// documents these chains only as building ratios (docs/research/
// 2026-08-31-power-eco-materials.md) — which is all the unit-agnostic goods
// graph needs. Good id = canonical producer, as everywhere else.
const STANDALONE_PRODUCERS: readonly (readonly [GoodId, BuildingId, number])[] = [
  ['basaltExtraction', 'basaltExtraction', 1],     // granules (Eco route)
  ['basaltExtraction', 'basaltCrusher', 1],        // granules (Tycoon route)
  ['smelter', 'smelter', 1],                       // building modules
  ['smelter', 'underwaterRecyclingStation', 2],    // = 2 smelters
  ['treeNursery', 'treeNursery', 1],               // trees
  ['sawmill', 'sawmill', 1],                       // wood
  ['limestoneQuarry', 'limestoneQuarry', 1],       // limestone
  ['glassworks', 'glassworks', 1],                 // glass
  ['concreteFactory', 'concreteFactory', 1],       // concrete
  ['steelworks', 'steelworks', 1],                 // steel
  ['toolsWorkshop', 'toolsWorkshop', 1],           // tools
  ['carbonFactory', 'carbonFactory', 1],           // carbon
  ['uraniumMine', 'uraniumMine', 1],               // uranium
  ['fuelElementFactory', 'fuelElementFactory', 1], // fuel rods
];
// consumer building, consumed good, units per consumer building at 100%.
const STANDALONE_CONSUMPTION: readonly (readonly [BuildingId, GoodId, number])[] = [
  ['smelter', 'basaltExtraction', 1],       // extractor + smelter run as a pair
  ['sawmill', 'treeNursery', 0.25],         // one nursery feeds 4 sawmills
  ['glassworks', 'limestoneQuarry', 1],     // 1 sand : 3 quarries : 3 works
  ['glassworks', 'sandExtractor', 1 / 3],
  ['concreteFactory', 'limestoneQuarry', 1],
  ['concreteFactory', 'sandExtractor', 1 / 3],
  ['toolsWorkshop', 'ironSmeltery', 0.5],   // 1 iron smelter : 2 workshops
  ['steelworks', 'ironSmeltery', 2],        // 2 iron smelters : 1 steelworks
  ['carbonFactory', 'oilRefinery', 1],      // 1 refinery : 1 carbon factory
  ['carbonFactory', 'coalMine', 0.5],       // coal mine at 50%
  ['fuelElementFactory', 'uraniumMine', 1],
];
const standaloneGoodByBuilding = new Map<BuildingId, GoodId>(
  STANDALONE_PRODUCERS.map(([goodId, buildingId]) => [buildingId, goodId]),
);

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
  return node ? goodOf(node) : standaloneGoodByBuilding.get(buildingId) ?? null;
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
      unlockAt: node.unlockAt!,
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

for (const [goodId, buildingId, rate] of STANDALONE_PRODUCERS) {
  const rates = producerRates.get(goodId) ?? new Map<BuildingId, number>();
  rates.set(buildingId, assertConsistent('producer rate', `${goodId}/${buildingId}`, rates.get(buildingId), rate));
  producerRates.set(goodId, rates);
}
for (const [buildingId, goodId, rate] of STANDALONE_CONSUMPTION) {
  const inputs = consumptionByBuilding.get(buildingId) ?? new Map<GoodId, number>();
  inputs.set(goodId, assertConsistent('consumption edge', `${buildingId}->${goodId}`, inputs.get(goodId), rate));
  consumptionByBuilding.set(buildingId, inputs);
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

// Fuel burned by owned power plants, in the fuel good's canonical units.
// Unlike CONSUMPTION this is independent of productivity: plants run flat.
// A coal power station burns the output of 1 rotary excavator (= ½ coal
// mine); a nuclear plant the fuel rods of 1 fuel element factory.
const coalGood = producedGood('rotaryExcavator')!;
const excavatorRate = producerRates.get(coalGood)!.get('rotaryExcavator')!;
export const FUEL_CONSUMPTION: Partial<Record<BuildingId, readonly InputRate[]>> = {
  coalPowerStation: [{ goodId: coalGood, rate: excavatorRate }],
  nuclearPowerPlant: [{ goodId: 'fuelElementFactory', rate: 1 }],
};
