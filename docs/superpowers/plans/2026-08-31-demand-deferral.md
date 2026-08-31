# Source-Level Demand Deferral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users persistently ignore and restore one exact faction/tier/good final-demand source, with consistent effects across balances, Production, coverage, and Growth.

**Architecture:** Store typed source identities in the plan and centralize satisfaction masking in a small calculation module. Thread that policy through the two existing final-demand boundaries instead of adding per-view subtraction or replacing the demand engines. Extend Growth provenance to tier-specific source contributions so aggregated goods expose unambiguous Ignore actions.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, existing localStorage v4 format.

**Dependency:** Execute `2026-08-31-follow-modes-and-global-bonuses.md` first; this plan adds `ignoredDemands` to the v4 plan shape established there.

---

### Task 1: Add the typed demand policy and persisted state

**Files:**
- Create: `src/calculations/demand-policy.ts`
- Create: `src/calculations/demand-policy.test.ts`
- Modify: `src/model.ts` (`CalculatorState`, `createInitialState`)
- Modify: `src/storage.ts` (`sanitizePlan` and a new ignored-source sanitizer)
- Test: `src/storage.test.ts`

- [ ] **Step 1: Write failing policy and storage tests**

Create `src/calculations/demand-policy.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { isDemandIgnored, maskSatisfaction, type IgnoredDemandSource } from './demand-policy';

const ignored: readonly IgnoredDemandSource[] = [
  { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
];

describe('demand policy', () => {
  test('matches all three source dimensions and masks only that tier', () => {
    expect(isDemandIgnored(ignored, 'tech', 2, 'bionicsFactory')).toBe(true);
    expect(isDemandIgnored(ignored, 'tech', 1, 'bionicsFactory')).toBe(false);
    expect(isDemandIgnored(ignored, 'eco', 2, 'bionicsFactory')).toBe(false);
    expect(maskSatisfaction('bionicsFactory', 'tech', [0, 0, 1481], ignored))
      .toEqual([0, 0, 0]);
  });
});
```

Add storage tests:

```ts
test('round-trips and deduplicates known ignored demand sources', () => {
  const state = createInitialAppState();
  state.plan.ignoredDemands = [
    { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
    { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
  ];

  saveAppState(state);

  expect(loadAppState().state.plan.ignoredDemands).toEqual([
    { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
  ]);
});

test('defaults missing v4 ignored demand state without data loss', () => {
  const state = createInitialAppState();
  const plan = { ...state.plan } as Record<string, unknown>;
  delete plan.ignoredDemands;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, plan, islands: [] }));

  expect(loadAppState()).toMatchObject({
    storable: true,
    state: { plan: { ignoredDemands: [] } },
  });
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- src/calculations/demand-policy.test.ts src/storage.test.ts
```

Expected: FAIL because the policy module and persisted field do not exist.

- [ ] **Step 3: Implement source identity and masking**

Create `src/calculations/demand-policy.ts`:

```ts
import type { Faction } from './population';
import type { GoodId } from './goods';

export type IgnoredDemandSource = Readonly<{
  faction: Faction;
  tier: number;
  goodId: GoodId;
}>;

export function isDemandIgnored(
  ignored: readonly IgnoredDemandSource[],
  faction: Faction,
  tier: number,
  goodId: GoodId,
): boolean {
  return ignored.some((source) => source.faction === faction
    && source.tier === tier
    && source.goodId === goodId);
}

export function maskSatisfaction(
  goodId: GoodId,
  faction: Faction,
  satisfaction: readonly number[],
  ignored: readonly IgnoredDemandSource[],
): readonly number[] {
  return satisfaction.map((value, tier) => (
    isDemandIgnored(ignored, faction, tier, goodId) ? 0 : value
  ));
}
```

Add `ignoredDemands: readonly IgnoredDemandSource[]` to `CalculatorState` and initialize it to `[]`.

- [ ] **Step 4: Sanitize v4 ignored sources**

Import `GOODS`, `GoodId`, `IgnoredDemandSource`, and `Faction`. Validate typed fields against the catalog rather than labels:

```ts
function sanitizeIgnoredDemands(value: unknown, loss: Loss): readonly IgnoredDemandSource[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    loss.markUnless(false);
    return [];
  }
  const result: IgnoredDemandSource[] = [];
  for (const entry of value) {
    if (!isRecord(entry)
      || !FACTIONS.includes(entry.faction as Faction)
      || !Number.isInteger(entry.tier)
      || typeof entry.goodId !== 'string') {
      loss.markUnless(false);
      continue;
    }
    const good = GOODS.get(entry.goodId as GoodId);
    const known = good?.finalDemands.some((demand) => demand.faction === entry.faction
      && demand.satisfaction[Number(entry.tier)] > 0) === true;
    if (!known) {
      loss.markUnless(false);
      continue;
    }
    const source = entry as IgnoredDemandSource;
    if (!result.some((candidate) => candidate.faction === source.faction
      && candidate.tier === source.tier
      && candidate.goodId === source.goodId)) result.push(source);
  }
  return result;
}
```

Set `ignoredDemands: sanitizeIgnoredDemands(record.ignoredDemands, loss)` in `sanitizePlan`. Missing values in v1–v4 become empty without marking an otherwise valid payload lossy.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/calculations/demand-policy.test.ts src/model.test.ts src/storage.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the policy state**

```bash
git add src/calculations/demand-policy.ts src/calculations/demand-policy.test.ts src/model.ts src/storage.ts src/storage.test.ts
git commit -m "feat: persist ignored demand sources"
```

### Task 2: Apply deferral to island balances and coverage

**Files:**
- Modify: `src/calculations/island-balance.ts`
- Modify: `src/calculations/supported-population.ts`
- Modify: `src/calculations/coverage.ts`
- Test: `src/calculations/island-balance.test.ts`
- Test: `src/calculations/supported-population.test.ts`
- Test: `src/calculations/coverage.test.ts`
- Test: `src/calculations/island-balance.property.test.ts`
- Test: `src/calculations/supported-population.property.test.ts`

- [ ] **Step 1: Write failing balance and coverage tests**

Add a helper source in the test files:

```ts
const ignoredBionics = [
  { faction: 'tech' as const, tier: 2, goodId: 'bionicsFactory' as const },
];
```

Add positive numeric invariants:

```ts
test('removes one final-demand source while retaining owned intermediate demand', () => {
  const island = createIsland('Geniuses');
  island.factions.tech.houses = editable(100);
  island.factions.tech.maxTier = 3;
  island.owned.bionicsFactory = editable(1);

  const active = calculateIslandBalance(island, []);
  const ignored = calculateIslandBalance(island, ignoredBionics);

  expect(active.bionicsFactory!.demand).toBeGreaterThan(0);
  expect(ignored.bionicsFactory!.demand).toBe(0);
  expect(ignored.biopolymerFactory!.demand).toBe(active.biopolymerFactory!.demand);
});

test('applies one ignored source across every island', () => {
  const first = createIsland('One');
  const second = createIsland('Two');
  for (const island of [first, second]) {
    island.factions.tech.houses = editable(100);
    island.factions.tech.maxTier = 3;
  }

  expect(aggregateGoodLoads([first, second], ignoredBionics).bionicsFactory?.finalDemand)
    .toBe(0);
});

test('retains another faction demand for the same good', () => {
  const island = createIsland('Shared fish');
  island.factions.eco.houses = editable(100);
  island.factions.eco.maxTier = 1;
  island.factions.tycoon.houses = editable(100);
  island.factions.tycoon.maxTier = 1;

  const loads = islandGoodLoads(island, [
    { faction: 'eco', tier: 0, goodId: 'fishery' },
  ]);

  expect(loads.fishery?.finalDemand).toBeCloseTo(800 / 250, 9);
});

test('restoration recalculates from the current population', () => {
  const island = createIsland('Growing Geniuses');
  island.factions.tech.houses = editable(100);
  island.factions.tech.maxTier = 3;
  const before = calculateIslandBalance(island, []).bionicsFactory!.demand!;
  expect(calculateIslandBalance(island, ignoredBionics).bionicsFactory!.demand).toBe(0);

  island.factions.tech.houses = editable(200);
  const restored = calculateIslandBalance(island, []).bionicsFactory!.demand!;

  expect(restored).toBeCloseTo(before * 2, 9);
});
```

For `coverage.test.ts`, ignore Eco Workers' Fish source and assert Tea becomes the numeric constraint while Fish capacity remains available:

```ts
const ignoredWorkerFish = [
  { faction: 'eco' as const, tier: 0, goodId: 'fishery' as const },
];

test('uses the same ignored source in current coverage and headroom', () => {
  const subject = island({ fishery: 4, teaPlantation: 4 }, 100, 1);
  const coverage = calculateCoverage([subject], ignoredWorkerFish);
  const headroom = tierHeadroom([subject], 'eco', 0, ignoredWorkerFish);

  expect(coverage.teaPlantation?.finalDemand).toBeCloseTo(800 / 375, 9);
  expect(headroom?.limitingGood).toBe('teaPlantation');
  expect(headroom?.additional).toBeCloseTo(700, 6);
});
```

Add a coal regression proving the ignored residence policy cannot change fixed plant fuel:

```ts
expect(calculateIslandBalance(withOwned({ coalPowerStation: 2 }), ignoredWorkerFish)
  .coalMine?.demand).toBeCloseTo(1, 9);
```

- [ ] **Step 2: Run focused calculation tests and verify failure**

Run:

```bash
npm test -- src/calculations/island-balance.test.ts src/calculations/coverage.test.ts src/calculations/supported-population.test.ts
```

Expected: FAIL because these APIs do not accept or apply ignored sources.

- [ ] **Step 3: Mask only island final-demand accumulation**

Add an `ignoredDemands` parameter to `islandGoodLoads`, `aggregateGoodLoads`, `calculateIslandBalance`, `aggregateBalances`, and `transferNeeds`. In the residence loop:

```ts
const satisfaction = maskSatisfaction(
  good.id,
  finalDemand.faction,
  finalDemand.satisfaction,
  ignoredDemands,
);
if (satisfaction.every((value) => value === 0)) continue;
const population = islandPopulation(island, finalDemand.faction);
const amount = population === null ? null : satisfaction.reduce((total, satisfied, tier) => {
  if (satisfied === 0) return total;
  const coverage = island.factions[finalDemand.faction].recyclingCoverage;
  const recyclingMultiplier = coverage && finalDemand.recyclable && tier > 0 ? 0.85 : 1;
  return total + population[tier] * recyclingMultiplier / satisfied;
}, 0);
```

Do not change the owned-building `CONSUMPTION` or `FUEL_CONSUMPTION` loops.

- [ ] **Step 4: Thread the policy through supported-population calculations**

Add `ignoredDemands` to `effectiveCapacities`, `throttleCause`, and `calculateSupportedPopulation`. Every internal `aggregateGoodLoads` or `effectiveCapacities` call must receive that same collection:

```ts
export function calculateSupportedPopulation(
  islands: readonly IslandState[],
  ignoredDemands: readonly IgnoredDemandSource[],
): SupportedPopulation {
  const loads = aggregateGoodLoads(islands, ignoredDemands);
  const capacities = effectiveCapacities(islands, ignoredDemands);
  // existing constraint calculation remains unchanged
}
```

- [ ] **Step 5: Thread the policy through coverage and marginal demand**

Add `ignoredDemands` to `calculateCoverage`, `tierHeadroom`, and `supportedAscensions`. Change `perInhabitantDemands` to mask each good/faction satisfaction before selecting the tier:

```ts
const satisfaction = maskSatisfaction(
  good.id,
  finalDemand.faction,
  finalDemand.satisfaction,
  ignoredDemands,
);
const satisfied = satisfaction[tier];
if (satisfied !== undefined && satisfied > 0) demands.set(good.id, 1 / satisfied);
```

Pass the same policy to `surpluses`, `aggregateGoodLoads`, and `effectiveCapacities`.

- [ ] **Step 6: Update existing direct callers in tests**

Every pre-existing calculation call in the five touched test files supplies `[]`, for example:

```ts
calculateCoverage([subject], []);
tierHeadroom([subject], 'eco', 0, []);
supportedAscensions([subject], 'eco', 0, []);
calculateIslandBalance(subject, []);
aggregateBalances([subject], []);
transferNeeds([subject], []);
```

Keep property generators unchanged; only add the empty policy argument to their calls.

- [ ] **Step 7: Run the calculation tests**

Run:

```bash
npm test -- src/calculations/island-balance.test.ts src/calculations/island-balance.property.test.ts src/calculations/coverage.test.ts src/calculations/supported-population.test.ts src/calculations/supported-population.property.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit balance and coverage behavior**

```bash
git add src/calculations/island-balance.ts src/calculations/supported-population.ts src/calculations/coverage.ts src/calculations/island-balance.test.ts src/calculations/island-balance.property.test.ts src/calculations/coverage.test.ts src/calculations/supported-population.test.ts src/calculations/supported-population.property.test.ts
git commit -m "feat: exclude deferred final demand from coverage"
```

### Task 3: Apply deferral to Production and tier-aware Growth provenance

**Files:**
- Modify: `src/calculations/calculate-production.ts`
- Modify: `src/calculations/growth-requirements.ts`
- Modify: `src/calculations/planning.ts`
- Test: `src/calculations/calculate-production.test.ts`
- Test: `src/calculations/calculate-production.property.test.ts`
- Test: `src/calculations/growth-requirements.test.ts`
- Test: `src/calculations/planning.test.ts`

- [ ] **Step 1: Write failing Production and Growth tests**

Add `ignoredDemands` to both production input types, then test the intended numbers before implementing masking:

```ts
test('removes ignored Bionics demand and its upstream production chain', () => {
  const population = { eco: [0, 0, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 1481] };
  const baseline = calculateProduction({
    population,
    productivity: createDefaultProductivity(),
    recycling: false,
    wholeBuildings: false,
    ignoredDemands: [],
  });
  const ignored = calculateProduction({
    population,
    productivity: createDefaultProductivity(),
    recycling: false,
    wholeBuildings: false,
    ignoredDemands: [{ faction: 'tech', tier: 2, goodId: 'bionicsFactory' }],
  });

  expect(baseline.techBionicSuits).toBeCloseTo(1);
  expect(ignored.techBionicSuits).toBe(0);
  expect(ignored.techBiopolymers).toBe(0);
  expect(ignored.techExoskeletons).toBe(0);
});
```

Add tier-aware Growth provenance:

```ts
test('attributes one canonical gap to exact faction-tier demand sources', () => {
  const population = emptyPopulation();
  population.tech[1] = 667;
  population.tech[2] = 667;

  const chips = calculateGrowthRequirements(population, false, []).get('chipFactory')!;

  expect(chips.chains.map((chain) => chain.source)).toEqual([
    { faction: 'tech', tier: 1, goodId: 'cyberneticFactory' },
    { faction: 'tech', tier: 2, goodId: 'cyberneticFactory' },
  ]);
  expect(chips.chains.reduce((sum, chain) => sum + chain.required, 0))
    .toBeCloseTo(chips.required);
});

test('filters the same source from Growth baseline and future checkpoints', () => {
  const state = createInitialAppState();
  const actual = createIsland('Geniuses');
  actual.factions.tech.houses = editable(100);
  actual.factions.tech.maxTier = 3;
  state.plan.ignoredDemands = [
    { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
  ];

  const planning = calculateGrowthPlanning(state.plan, [actual])!;
  expect(planning.baseline.gaps.every((gap) => gap.chains.every((chain) => (
    chain.source.goodId !== 'bionicsFactory'
  )))).toBe(true);
});
```

The last assertion is not an absence-only UI test: it pins the positive invariant that every retained numerical gap has an active provenance source.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- src/calculations/calculate-production.test.ts src/calculations/growth-requirements.test.ts src/calculations/planning.test.ts
```

Expected: FAIL because production ignores no policy and Growth chains lack source identity.

- [ ] **Step 3: Mask primary Production satisfaction**

Add `ignoredDemands: readonly IgnoredDemandSource[]` to `ProductionInput` and `AvailableProductionInput`. For each primary node, derive its good and mask the satisfaction array:

```ts
const satisfaction = maskSatisfaction(
  producedGood(node.buildingId)!,
  node.faction,
  node.calculation.satisfaction,
  input.ignoredDemands,
);
result[node.id] = calculatePrimary(
  satisfaction,
  input.population[node.faction],
  productivity,
  Boolean(node.calculation.recyclable && input.recycling),
  input.wholeBuildings,
);
```

The material-node branch remains unchanged and therefore propagates a zero parent requirement through the complete upstream chain.

- [ ] **Step 4: Make Growth provenance source-specific**

Extend the chain shape:

```ts
export type GrowthDemandChain = Readonly<{
  source: IgnoredDemandSource;
  faction: Faction;
  rootNodeId: string;
  pathNodeIds: readonly string[];
  required: number;
}>;
```

Replace occurrence-total provenance with tier contributions. For every canonical node occurrence, find its primary root, then calculate one source tier through the same path:

```ts
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
```

Change the public signature and chain loop:

```ts
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
    root.calculation.satisfaction.forEach((satisfied, tier) => {
      if (satisfied === 0
        || isDemandIgnored(ignoredDemands, root.faction, tier, sourceGoodId)) return;
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
```

Pass `state.ignoredDemands` into baseline and milestone requirement snapshots in `planning.ts`, and pass it into `effectiveCapacities(islands, state.ignoredDemands)` so the planning capacity path uses the same filtered intermediate loads.

- [ ] **Step 5: Update existing Production and Growth test callers**

Add `ignoredDemands: []` to every `ProductionInput` and `AvailableProductionInput` fixture in:

- `src/calculations/calculate-production.test.ts`
- `src/calculations/calculate-production.property.test.ts`
- `src/calculations/island-balance.property.test.ts`
- `src/calculations/supported-population.property.test.ts`

Pass `[]` as the third argument to existing `calculateGrowthRequirements` calls. Update existing expected chain objects by adding their exact source, for example:

```ts
source: { faction: 'tech', tier: 1, goodId: 'functionalFoodFactory' },
```

- [ ] **Step 6: Run Production, provenance, and planning tests**

Run:

```bash
npm test -- src/calculations/calculate-production.test.ts src/calculations/calculate-production.property.test.ts src/calculations/growth-requirements.test.ts src/calculations/planning.test.ts src/calculations/island-balance.property.test.ts src/calculations/supported-population.property.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Production and Growth policy propagation**

```bash
git add src/calculations/calculate-production.ts src/calculations/calculate-production.test.ts src/calculations/calculate-production.property.test.ts src/calculations/growth-requirements.ts src/calculations/growth-requirements.test.ts src/calculations/planning.ts src/calculations/planning.test.ts src/calculations/island-balance.property.test.ts src/calculations/supported-population.property.test.ts
git commit -m "feat: defer demand through production planning"
```

### Task 4: Add unambiguous Ignore actions and one restore manager

**Files:**
- Create: `src/components/DemandSourceActions.tsx`
- Create: `src/components/IgnoredDemandManager.tsx`
- Modify: `src/components/CoverageSection.tsx`
- Modify: `src/components/GrowthGapCard.tsx`
- Modify: `src/components/GrowthMilestones.tsx`
- Modify: `src/components/GrowthSection.tsx`
- Modify: `src/components/PopulationSection.tsx`
- Modify: `src/components/IslandsSection.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/growth-milestones.css`
- Test: `src/App.coverage.test.tsx`
- Test: `src/App.growth.test.tsx`
- Test: `src/App.population-overview.test.tsx`

- [ ] **Step 1: Write a failing end-to-end deferral workflow test**

Add a Tech island with Geniuses through the existing configuration UI, switch to Production, and exercise the exact source action:

```ts
test('ignores and restores one current demand source everywhere', async () => {
  renderApp();
  addIsland();
  fireEvent.click(buttonWithLabel('Configure island Island 1'));
  fireEvent.click(buttonWithLabel('Tech Geniuses', byTestId('island-0')));
  await replaceInput(input('island-0-config-tech-houses'), '100');
  fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
  selectWorkspace('Production');

  const before = requiredBuildings('techBionicSuits').textContent;
  fireEvent.click(buttonWithLabel('Ignore Tech · Geniuses · Bionics factory everywhere'));

  expect(requiredBuildings('techBionicSuits')).toHaveTextContent('0');
  expect(buttonWithLabel('Manage 1 ignored demand')).toBeVisible();

  selectWorkspace('Growth');
  const manager = byTestId('ignored-demand-manager');
  fireEvent.click(manager.querySelector('summary')!);
  expect(manager).toHaveTextContent('Tech · Geniuses · Bionics factory');
  fireEvent.click(buttonWithLabel('Restore Tech · Geniuses · Bionics factory', manager));

  selectWorkspace('Production');
  expect(requiredBuildings('techBionicSuits').textContent).toBe(before);
});
```

Add an Eco Worker island, ignore its Fish and Tea sources, and positively assert truthful status:

```ts
expect(document.querySelector('.coverage-section__empty'))
  .toHaveTextContent('No active bottlenecks · 2 demands ignored');
```

Add a future-source test in `src/App.growth.test.tsx`:

```ts
test('keeps an ignored future demand visible while it is inactive', async () => {
  renderApp();
  await setGrowthResidenceTarget('tech', '100');
  fireEvent.click(buttonWithLabel('Tech Geniuses'));
  fireEvent.click(buttonWithLabel('Ignore Tech · Geniuses · Bionics factory everywhere'));

  const manager = byTestId('ignored-demand-manager');
  fireEvent.click(manager.querySelector('summary')!);
  expect(manager).toHaveTextContent('Tech · Geniuses · Bionics factory');
  expect(manager).toHaveTextContent('Not currently applicable');
});
```

- [ ] **Step 2: Run the App tests and verify failure**

Run:

```bash
npm test -- src/App.coverage.test.tsx src/App.growth.test.tsx src/App.population-overview.test.tsx
```

Expected: FAIL because source actions, ignored status, and restore manager do not exist.

- [ ] **Step 3: Create a reusable source-action renderer**

Create `src/components/DemandSourceActions.tsx`:

```tsx
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import { BUILDINGS } from '../calculations/building-data';
import { FACTION_CONFIGS } from '../model';

type Props = {
  sources: readonly IgnoredDemandSource[];
  onIgnore: (source: IgnoredDemandSource) => void;
};

export function demandSourceLabel(source: IgnoredDemandSource): string {
  const faction = FACTION_CONFIGS[source.faction];
  return `${faction.label} · ${faction.tierLabels[source.tier]} · ${BUILDINGS[source.goodId].label}`;
}

export function DemandSourceActions({ sources, onIgnore }: Props) {
  return <ul className="demand-source-actions">
    {sources.map((source) => {
      const label = demandSourceLabel(source);
      return <li key={`${source.faction}-${source.tier}-${source.goodId}`}>
        <span>{label}</span>
        <button
          type="button"
          aria-label={`Ignore ${label} everywhere`}
          onClick={() => onIgnore(source)}
        >Ignore</button>
      </li>;
    })}
  </ul>;
}
```

This renderer receives already-active, nonignored sources; it does not calculate demand.

- [ ] **Step 4: Expose active sources on Coverage rows**

Add a pure helper in `CoverageSection.tsx` that uses `GOODS`, summed actual populations, and `isDemandIgnored`:

```ts
function activeSources(
  goodId: GoodId,
  populations: Record<Faction, readonly number[] | null>,
  ignored: readonly IgnoredDemandSource[],
): IgnoredDemandSource[] {
  return (GOODS.get(goodId)?.finalDemands ?? []).flatMap((demand) =>
    demand.satisfaction.flatMap((satisfied, tier) => (
      satisfied > 0
        && (populations[demand.faction]?.[tier] ?? 0) > 0
        && !isDemandIgnored(ignored, demand.faction, tier, goodId)
        ? [{ faction: demand.faction, tier, goodId }]
        : []
    )),
  );
}
```

Add these props:

```ts
type CoverageSectionProps = {
  islands: readonly IslandState[];
  ignoredDemands: readonly IgnoredDemandSource[];
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
};
```

Pass the policy into `calculateSupportedPopulation`, `tierHeadroom`, and `throttleCause`. Add `sources` to each acute and unbuilt card model and render `DemandSourceActions`. When no cards remain, include the ignored count in the existing empty paragraph.

- [ ] **Step 5: Expose tier-specific Growth sources**

Thread `onIgnoreDemand` from `GrowthSection` through `GrowthMilestones` and `GrowthGapCard`. In `GrowthGapCard`, deduplicate `gap.chains.map((chain) => chain.source)` by structured field comparison and render `DemandSourceActions` inside `Why required?` after the provenance list.

Retain the existing chain rows and required amounts. Update their React key to include source tier:

```tsx
key={`${chain.source.faction}-${chain.source.tier}-${chain.source.goodId}-${chain.pathNodeIds.join('-')}`}
```

- [ ] **Step 6: Create the centralized restore manager**

Create `src/components/IgnoredDemandManager.tsx`:

```tsx
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import type { Faction } from '../calculations/population';
import { demandSourceLabel } from './DemandSourceActions';

type Props = {
  ignored: readonly IgnoredDemandSource[];
  actualPopulations: Record<Faction, readonly number[] | null>;
  onRestore: (source: IgnoredDemandSource) => void;
  onRestoreAll: () => void;
};

export function IgnoredDemandManager({ ignored, actualPopulations, onRestore, onRestoreAll }: Props) {
  if (ignored.length === 0) return null;
  return <details id="ignored-demands" className="ignored-demands" data-testid="ignored-demand-manager">
    <summary aria-label={`Show ${ignored.length} ignored ${ignored.length === 1 ? 'demand' : 'demands'}`}>
      Ignored demands ({ignored.length})
    </summary>
    <ul>
      {ignored.map((source) => {
        const label = demandSourceLabel(source);
        const active = (actualPopulations[source.faction]?.[source.tier] ?? 0) > 0;
        return <li key={`${source.faction}-${source.tier}-${source.goodId}`}>
          <span>{label}</span>
          <small>{active ? 'Currently applicable' : 'Not currently applicable'}</small>
          <button type="button" aria-label={`Restore ${label}`} onClick={() => onRestore(source)}>Restore</button>
        </li>;
      })}
    </ul>
    <button type="button" onClick={onRestoreAll}>Restore all</button>
  </details>;
}
```

Render it once in `GrowthSection`, above milestones, using actual populations passed from `App`.

- [ ] **Step 7: Add the persistent status control and App state operations**

Add `ignoredDemandCount` and `onManageIgnoredDemands` to `PopulationSection`. Render one quiet button in its section heading when the count is positive:

```tsx
<button
  type="button"
  className="ignored-demand-status"
  aria-label={`Manage ${ignoredDemandCount} ignored ${ignoredDemandCount === 1 ? 'demand' : 'demands'}`}
  onClick={onManageIgnoredDemands}
>
  {ignoredDemandCount} {ignoredDemandCount === 1 ? 'demand' : 'demands'} ignored
</button>
```

Implement structured, idempotent operations in `App`:

```ts
const sameDemandSource = (left: IgnoredDemandSource, right: IgnoredDemandSource) =>
  left.faction === right.faction && left.tier === right.tier && left.goodId === right.goodId;

const ignoreDemand = (source: IgnoredDemandSource) => updatePlan((current) => (
  current.ignoredDemands.some((entry) => sameDemandSource(entry, source))
    ? current
    : { ...current, ignoredDemands: [...current.ignoredDemands, source] }
));
const restoreDemand = (source: IgnoredDemandSource) => updatePlan((current) => ({
  ...current,
  ignoredDemands: current.ignoredDemands.filter((entry) => !sameDemandSource(entry, source)),
}));
const restoreAllDemands = () => updatePlan((current) => ({
  ...current,
  ignoredDemands: [],
}));
```

Pass `state.plan.ignoredDemands` into both Production calculations, balances, transfer needs, Coverage, Islands, the permanent overview, and Growth. Pass `restoreDemand` and `restoreAllDemands` into `IgnoredDemandManager`. `PopulationSection` passes the policy into every `tierHeadroom` call. `IslandsSection` accepts the policy as a prop and passes it into `aggregateBalances`, `transferNeeds`, and each `calculateIslandBalance` call. `calculateGrowthPlanning` already reads it from plan state after Task 3.

For the persistent manager link, switch to Growth and focus the native summary after React reveals the panel:

```ts
const manageIgnoredDemands = () => {
  setWorkspace('growth');
  window.setTimeout(() => document.querySelector<HTMLElement>('#ignored-demands > summary')?.focus(), 0);
};
```

- [ ] **Step 8: Add compact, non-warning styling**

Add localized rules:

```css
.ignored-demand-status,
.demand-source-actions button,
.ignored-demands button {
  font-size: .78rem;
}

.ignored-demand-status {
  color: var(--muted);
  background: transparent;
  border-color: var(--line);
}

.demand-source-actions,
.ignored-demands ul {
  display: grid;
  gap: .3rem;
  margin: .5rem 0 0;
  padding: 0;
  list-style: none;
}

.demand-source-actions li,
.ignored-demands li {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.ignored-demands small {
  color: var(--muted);
  margin-left: auto;
}
```

Use the existing `--muted` and `--line` variables shown above; do not introduce warning colors or a banner.

- [ ] **Step 9: Run the App workflow tests**

Run:

```bash
npm test -- src/App.coverage.test.tsx src/App.growth.test.tsx src/App.population-overview.test.tsx src/App.production-structure.test.tsx src/App.islands.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit the UI workflow**

```bash
git add src/App.tsx src/components/DemandSourceActions.tsx src/components/IgnoredDemandManager.tsx src/components/CoverageSection.tsx src/components/GrowthGapCard.tsx src/components/GrowthMilestones.tsx src/components/GrowthSection.tsx src/components/PopulationSection.tsx src/components/IslandsSection.tsx src/styles.css src/components/growth-milestones.css src/App.coverage.test.tsx src/App.growth.test.tsx src/App.population-overview.test.tsx
git commit -m "feat: manage deferred demand sources"
```

### Task 5: Verify consistent demand deferral

**Files:**
- Verify only; modify files from Tasks 1–4 if a command exposes a defect.

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: every Vitest test passes, including property tests with explicit empty policies.

- [ ] **Step 2: Run static verification**

```bash
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0 and `git diff --check` prints nothing.

- [ ] **Step 3: Inspect the complete workflow visually**

Start the visual companion outside the sandbox on the known-free follow-up port:

```bash
npm run dev -- --host 0.0.0.0 --port 62579
```

Open `http://localhost:62579` and confirm:

- a multi-source good shows separate faction/tier Ignore actions;
- ignoring Bionics updates Production, Coverage, island balance, and Growth together;
- the persistent ignored count is quiet but discoverable in every workspace;
- Growth contains one restore manager, including inactive future entries;
- all-ignored empty states report the ignored count without shortage styling;
- Restore recalculates from the current population rather than the value at ignore time.

If visual or automated verification exposes a defect, return to the task that owns that behavior, add a focused failing assertion there, and repeat that task's test, implementation, and commit steps before rerunning Task 5.
