import { sumIslandHouses, sumIslandPopulations, type IslandState } from '../island';
import { FACTIONS, type CalculatorState } from '../model';
import { CONSUMPTION, producedGood, type GoodId } from './goods';
import { calculateGrowthRequirements, type GrowthDemandChain } from './growth-requirements';
import { resolvePopulationTarget, type ResolvedPopulationTarget } from './population-target';
import { applyPopulationOverrides, calculatePopulation, type Faction } from './population';
import { PRODUCTION_NODES } from './production-data';
import { effectiveCapacities } from './supported-population';

const EPSILON = 1e-9;

export type GrowthGap = Readonly<{
  goodId: GoodId;
  required: number;
  capacity: number;
  remaining: number;
  baselineRequired: number;
  previousRequired: number;
  checkpointRequired: number;
  addedHere: number;
  chains: readonly GrowthGapChain[];
}>;

export type GrowthGapChain = GrowthDemandChain & Readonly<{
  baselineRequired: number;
  previousRequired: number;
  addedHere: number;
}>;

export type GrowthBaseline = Readonly<{
  gaps: readonly GrowthGap[];
  complete: boolean;
  current: boolean;
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
  baseline: GrowthBaseline;
  sequences: Readonly<Record<Faction, readonly GrowthMilestone[]>>;
}>;

export function growthGapIntroducedAmount(gap: GrowthGap): number {
  return gap.chains.reduce((total, chain) => total + chain.addedHere, 0);
}

export function growthGapIntroducedHere(gap: GrowthGap): boolean {
  return gap.chains.some((chain) => chain.addedHere > EPSILON);
}

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
  if (state.intent.kind === 'follow' && state.intent.tierMode === 'unrestricted') {
    return calculatePopulation({
      faction,
      houses: target.houses,
      maxTier: tier,
      livingSpace: state.livingSpace,
      senate: state.senate,
    });
  }
  return applyPopulationOverrides({
    faction,
    houses: target.houses,
    maxTier: tier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  }, state.overrides.map((override, index) => index < tier ? override?.value ?? null : null));
}

function buildFactionDescriptors(
  state: CalculatorState,
  targets: Record<Faction, ResolvedPopulationTarget>,
  actual: Record<Faction, readonly number[]>,
  faction: Faction,
): Descriptor[] {
  const result: Descriptor[] = [];
  const actualTop = topOccupiedTier(actual[faction]);
  if ((state.factions[faction].intent.kind === 'follow'
      && state.factions[faction].intent.tierMode === 'mirror')
    || targets[faction].maxTier < actualTop
    || targets[faction].effectivePopulations.reduce((sum, value) => sum + value, 0)
      <= actual[faction].reduce((sum, value) => sum + value, 0)) return result;
  let previous = actual[faction];
  const firstTier = Math.max(1, actualTop);
  const startTier = state.factions[faction].intent.kind === 'follow'
    && state.factions[faction].intent.tierMode === 'unrestricted'
    ? Math.max(1, actualTop + 1)
    : firstTier;
  for (let tier = startTier; tier <= targets[faction].maxTier; tier += 1) {
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

function compareGaps(left: GrowthGap, right: GrowthGap): number {
  return inputDepth(right.goodId) - inputDepth(left.goodId)
    || (catalogOrder.get(left.goodId) ?? Number.MAX_SAFE_INTEGER)
      - (catalogOrder.get(right.goodId) ?? Number.MAX_SAFE_INTEGER);
}

type Requirements = ReturnType<typeof calculateGrowthRequirements>;

function demandChainKey(chain: GrowthDemandChain): string {
  return `${chain.source.faction}:${chain.source.tier}:${chain.source.goodId}:${chain.rootNodeId}:${chain.pathNodeIds.join('>')}`;
}

function buildGaps(
  requirements: Requirements,
  previous: Requirements,
  baseline: Requirements,
  capacities: Partial<Record<GoodId, number | null>>,
): GrowthGap[] {
  return [...requirements].map(([goodId, snapshot]) => {
    const capacity = capacities[goodId] ?? 0;
    const previousRequired = previous.get(goodId)?.required ?? 0;
    const previousChains = new Map(
      (previous.get(goodId)?.chains ?? []).map((chain) => [demandChainKey(chain), chain.required]),
    );
    const baselineChains = new Map(
      (baseline.get(goodId)?.chains ?? []).map((chain) => [demandChainKey(chain), chain.required]),
    );
    const chains = snapshot.chains.map((chain): GrowthGapChain => {
      const previousChainRequired = previousChains.get(demandChainKey(chain)) ?? 0;
      return {
        ...chain,
        baselineRequired: baselineChains.get(demandChainKey(chain)) ?? 0,
        previousRequired: previousChainRequired,
        addedHere: Math.max(0, chain.required - previousChainRequired),
      };
    });
    return {
      goodId,
      required: snapshot.required,
      capacity,
      remaining: Math.max(0, snapshot.required - capacity),
      baselineRequired: baseline.get(goodId)?.required ?? 0,
      previousRequired,
      checkpointRequired: snapshot.required,
      addedHere: Math.max(0, snapshot.required - previousRequired),
      chains,
    };
  }).filter((gap) => gap.remaining > EPSILON).sort(compareGaps);
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
  const capacities = effectiveCapacities(islands, state.ignoredDemands);
  if (Object.values(capacities).some((capacity) => capacity === null)) return null;

  const baselineRequirements = calculateGrowthRequirements(actual, state.recycling, state.ignoredDemands);
  const baselineGaps = buildGaps(
    baselineRequirements,
    new Map(),
    baselineRequirements,
    capacities,
  );
  const sequences: Record<Faction, readonly GrowthMilestone[]> = {
    eco: [],
    tycoon: [],
    tech: [],
  };
  for (const faction of FACTIONS) {
    let previousPopulation = clonePopulations(actual);
    let previousRequirements = baselineRequirements;
    const milestones: Omit<GrowthMilestone, 'current'>[] = buildFactionDescriptors(
      state,
      targets,
      actual,
      faction,
    ).map((descriptor) => {
      const populationBefore = clonePopulations(previousPopulation);
      const populationAfter = {
        ...clonePopulations(actual),
        [faction]: [...descriptor.population],
      };
      const requirements = calculateGrowthRequirements(populationAfter, state.recycling, state.ignoredDemands);
      const gaps = buildGaps(requirements, previousRequirements, baselineRequirements, capacities);
      previousPopulation = populationAfter;
      previousRequirements = requirements;
      return {
        id: `${faction}-${descriptor.tier}-${descriptor.kind}`,
        kind: descriptor.kind,
        faction,
        tier: descriptor.tier,
        populationBefore,
        populationAfter,
        gaps,
        complete: gaps.every((gap) => !growthGapIntroducedHere(gap)),
      };
    });
    const currentIndex = milestones.findIndex((milestone) => !milestone.complete);
    sequences[faction] = milestones.map((milestone, index) => ({
      ...milestone,
      current: index === currentIndex,
    }));
  }
  return {
    baseline: {
      gaps: baselineGaps,
      complete: baselineGaps.length === 0,
      current: baselineGaps.length > 0,
    },
    sequences,
  };
}
