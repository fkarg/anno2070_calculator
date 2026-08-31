import { sumIslandHouses, sumIslandPopulations, type IslandState } from '../island';
import { FACTIONS, type CalculatorState } from '../model';
import { calculateProduction, createDefaultProductivity } from './calculate-production';
import { CONSUMPTION, producedGood, type GoodId } from './goods';
import { resolvePopulationTarget, type ResolvedPopulationTarget } from './population-target';
import { applyPopulationOverrides, type Faction } from './population';
import { PRODUCTION_NODES } from './production-data';
import { effectiveCapacities } from './supported-population';

const EPSILON = 1e-9;

export type GrowthGap = Readonly<{
  goodId: GoodId;
  required: number;
  capacity: number;
  remaining: number;
}>;

export type GrowthMilestone = Readonly<{
  id: string;
  kind: 'expand' | 'ascend';
  faction: Faction;
  tier: number;
  populationBefore: Record<Faction, readonly number[]>;
  populationAfter: Record<Faction, readonly number[]>;
  gaps: readonly GrowthGap[];
  complete: boolean;
  current: boolean;
}>;

export type GrowthPlanningResult = Readonly<{
  milestones: readonly GrowthMilestone[];
}>;

type Descriptor = Readonly<{
  kind: 'expand' | 'ascend';
  faction: Faction;
  tier: number;
  population: readonly number[];
}>;

const clonePopulations = (
  populations: Record<Faction, readonly number[]>,
): Record<Faction, readonly number[]> => ({
  eco: [...populations.eco],
  tycoon: [...populations.tycoon],
  tech: [...populations.tech],
});

const samePopulation = (left: readonly number[], right: readonly number[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

function topOccupiedTier(population: readonly number[]): number {
  for (let index = population.length - 1; index >= 0; index -= 1) {
    if (population[index] > 0) return index + 1;
  }
  return 0;
}

function targetAtTier(
  faction: Faction,
  state: CalculatorState['factions'][Faction],
  target: ResolvedPopulationTarget,
  tier: number,
): readonly number[] {
  return applyPopulationOverrides({
    faction,
    houses: target.houses,
    maxTier: tier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  }, state.overrides.map((override, index) => index < tier ? override?.value ?? null : null));
}

function buildDescriptors(
  state: CalculatorState,
  targets: Record<Faction, ResolvedPopulationTarget>,
  actual: Record<Faction, readonly number[]>,
): Descriptor[] {
  const result: Descriptor[] = [];
  for (const faction of FACTIONS) {
    const actualTop = topOccupiedTier(actual[faction]);
    if (state.factions[faction].intent.kind === 'follow'
      || targets[faction].maxTier < actualTop
      || targets[faction].effectivePopulations.reduce((sum, value) => sum + value, 0)
        <= actual[faction].reduce((sum, value) => sum + value, 0)) continue;
    let previous = actual[faction];
    const firstTier = Math.max(1, actualTop);
    for (let tier = firstTier; tier <= targets[faction].maxTier; tier += 1) {
      const population = targetAtTier(faction, state.factions[faction], targets[faction], tier);
      if (!samePopulation(population, previous)) {
        result.push({
          kind: tier === firstTier ? 'expand' : 'ascend',
          faction,
          tier,
          population,
        });
      }
      previous = population;
    }
  }
  return result.sort((left, right) => left.tier - right.tier
    || FACTIONS.indexOf(left.faction) - FACTIONS.indexOf(right.faction));
}

function canonicalRequirements(
  population: Record<Faction, readonly number[]>,
  recycling: boolean,
): Map<GoodId, number> {
  const requirements = calculateProduction({
    population,
    productivity: createDefaultProductivity(),
    recycling,
    wholeBuildings: false,
  });
  const result = new Map<GoodId, number>();
  for (const node of PRODUCTION_NODES) {
    const goodId = producedGood(node.buildingId);
    if (goodId === null || goodId !== node.buildingId) continue;
    const required = requirements[node.id];
    result.set(goodId, (result.get(goodId) ?? 0) + required);
  }
  return result;
}

const catalogOrder = new Map<GoodId, number>();
for (const [index, node] of PRODUCTION_NODES.entries()) {
  const goodId = producedGood(node.buildingId);
  if (goodId === node.buildingId && !catalogOrder.has(goodId)) catalogOrder.set(goodId, index);
}

const consumers = new Map<GoodId, Set<GoodId>>();
for (const [buildingId, inputs] of CONSUMPTION) {
  const consumerGood = producedGood(buildingId);
  if (consumerGood === null) continue;
  for (const input of inputs) {
    const entries = consumers.get(input.goodId) ?? new Set<GoodId>();
    entries.add(consumerGood);
    consumers.set(input.goodId, entries);
  }
}

const depthMemo = new Map<GoodId, number>();
function inputDepth(goodId: GoodId, visiting = new Set<GoodId>()): number {
  const memoized = depthMemo.get(goodId);
  if (memoized !== undefined) return memoized;
  if (visiting.has(goodId)) return 0;
  const nextVisiting = new Set(visiting).add(goodId);
  const depth = Math.max(0, ...[...(consumers.get(goodId) ?? [])]
    .map((consumer) => 1 + inputDepth(consumer, nextVisiting)));
  depthMemo.set(goodId, depth);
  return depth;
}

export function calculateGrowthPlanning(
  state: CalculatorState,
  islands: readonly IslandState[],
): GrowthPlanningResult | null {
  const islandHouses = sumIslandHouses(islands);
  const islandPopulations = sumIslandPopulations(islands);
  if (FACTIONS.some((faction) => islandPopulations[faction] === null)) return null;

  const resolved = FACTIONS.map((faction) => [
    faction,
    resolvePopulationTarget(
      faction,
      state.factions[faction],
      islandHouses[faction],
      islandPopulations[faction],
    ),
  ] as const);
  if (resolved.some(([, target]) => target === null)) return null;
  const targets = Object.fromEntries(resolved) as Record<Faction, ResolvedPopulationTarget>;
  const actual = islandPopulations as Record<Faction, readonly number[]>;
  const capacities = effectiveCapacities(islands);
  if (Object.values(capacities).some((capacity) => capacity === null)) return null;

  let cumulative = clonePopulations(actual);
  const requirementFloor = canonicalRequirements(actual, state.recycling);
  const milestones: Omit<GrowthMilestone, 'current'>[] = buildDescriptors(state, targets, actual).map((descriptor) => {
    const populationBefore = clonePopulations(cumulative);
    cumulative = { ...cumulative, [descriptor.faction]: [...descriptor.population] };
    const populationAfter = clonePopulations(cumulative);
    const requirements = canonicalRequirements(populationAfter, state.recycling);
    for (const [goodId, required] of requirements) {
      requirementFloor.set(goodId, Math.max(requirementFloor.get(goodId) ?? 0, required));
    }
    const gaps = [...requirementFloor.entries()]
      .map(([goodId, required]) => {
        const capacity = capacities[goodId] ?? 0;
        return { goodId, required, capacity, remaining: Math.max(0, required - capacity) };
      })
      .filter((gap) => gap.remaining > EPSILON)
      .sort((left, right) => inputDepth(right.goodId) - inputDepth(left.goodId)
        || (catalogOrder.get(left.goodId) ?? Number.MAX_SAFE_INTEGER)
          - (catalogOrder.get(right.goodId) ?? Number.MAX_SAFE_INTEGER));
    return {
      id: `${descriptor.faction}-${descriptor.tier}-${descriptor.kind}`,
      kind: descriptor.kind,
      faction: descriptor.faction,
      tier: descriptor.tier,
      populationBefore,
      populationAfter,
      gaps,
      complete: gaps.length === 0,
      current: false,
    };
  });
  const currentIndex = milestones.findIndex((milestone) => !milestone.complete);
  return {
    milestones: milestones.map((milestone, index) => ({
      ...milestone,
      current: index === currentIndex,
    })),
  };
}
