# Per-Island Actuals and Transfer Needs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-island actual state (residences, owned buildings, productivity) beside the untouched global plan, derive per-good capacity/demand/balance and a transfer-needs view, and harden storage to a preserving, tolerant v2 schema.

**Architecture:** The plan calculation keeps running on `PRODUCTION_NODES` unchanged. A new derived goods layer (`goods.ts`) converts the existing satisfaction/multiplier constants into per-good producer rates and consumption edges with load-time consistency validation; `island-balance.ts` computes island and empire balances from it. Islands are a new state slice persisted in a structurally versioned v2 payload `{version, plan, islands}`; a failed or future-version load preserves the stored payload and suppresses autosave until a real user change. Plan house counts gain an Auto mode equal to summed settled-island houses.

**Tech Stack:** React 19, TypeScript, Vite, Vitest 4, Testing Library, fast-check, pnpm, versioned-JSON localStorage.

**Spec:** `docs/superpowers/specs/2026-08-30-island-actuals-design.md`

---

## File structure

- Create `src/calculations/goods.ts`: derive goods, producer rates, final demands, and consumption edges from `PRODUCTION_NODES`/`ALTERNATIVE_GROUPS`; throw on cross-chain rate inconsistency.
- Create `src/calculations/goods.test.ts`: pinned derivations (microchips, fish, coal), consistency-validation failure cases, exhaustive coverage assertions.
- Create `src/island.ts`: `IslandState`, `FertilityState`, island creation/update helpers, island population resolution reusing `effectivePopulation`.
- Create `src/island.test.ts`: island helpers and population resolution.
- Create `src/calculations/island-balance.ts`: per-island and aggregated per-good capacity/demand/balance, transfer needs, epsilon handling, null propagation.
- Create `src/calculations/island-balance.test.ts` and `src/calculations/island-balance.property.test.ts`: pinned examples; zero-balance-mirror, monotonicity, and transfer-consistency properties.
- Modify `src/calculations/operating-impact.ts`: add flat owned-building impact totals.
- Modify `src/calculations/operating-impact.test.ts`: pinned owned-impact examples and null locality.
- Modify `src/calculations/building-data.ts`: add fertility/deposit requirement table keyed by `BuildingId`.
- Modify `src/calculations/building-data.test.ts`: requirement table covers every building with a verified value.
- Modify `src/model.ts`: `houses: EditableNumber | null` (null = Auto), `resolveHouses`, `AppState = { plan, islands }`.
- Modify `src/storage.ts`: v2 payload, v1 migration, tolerant per-entry validation, `LoadResult` with autosave suppression flag.
- Modify `src/storage.test.ts`: migration, preservation, tolerance, future-version cases.
- Create `src/components/IslandsSection.tsx`, `src/components/FertilityPicker.tsx`: islands UI.
- Modify `src/components/PopulationSection.tsx`: Auto affordance on plan houses.
- Modify `src/components/ProductionSection.tsx`: owned/capacity/balance columns on canonical rows, per-building impacts into tooltip, actual-impacts values, transfer-needs subsection.
- Modify `src/components/OperatingImpactValues.tsx`: reusable for actual totals.
- Modify `src/App.tsx`: `AppState`, dirty-gated autosave, balance wiring.
- Create/modify App integration tests: `src/App.islands.test.tsx`, `src/App.actuals.test.tsx`; update existing App tests for the `plan` state shape.
- Modify `src/styles.css`: island cards, fertility picker, new columns, tooltip.
- Modify `README.md`: completed behavior + roadmap.

### Task 1: Derived goods layer

**Files:**
- Create: `src/calculations/goods.ts`
- Create: `src/calculations/goods.test.ts`

- [ ] **Step 1: Write failing derivation tests**

```ts
// src/calculations/goods.test.ts
import { describe, expect, test } from 'vitest';

import { CONSUMPTION, GOODS, producedGood } from './goods';
import { PRODUCTION_NODES } from './production-data';
import { BUILDINGS, type BuildingId } from './building-data';

describe('GOODS derivation', () => {
  test('every canonical building produces exactly one good', () => {
    const producerIds = new Set(
      [...GOODS.values()].flatMap((good) => good.producers.map((producer) => producer.buildingId)),
    );
    for (const buildingId of Object.keys(BUILDINGS) as BuildingId[]) {
      expect(producedGood(buildingId), buildingId).not.toBeNull();
      expect(producerIds.has(buildingId), buildingId).toBe(true);
    }
  });

  test('alternative producers share the good at derived rates', () => {
    const microchips = GOODS.get('chipFactory')!;
    expect(microchips.producers).toContainEqual({ buildingId: 'chipFactory', rate: 1 });
    expect(microchips.producers).toContainEqual({ buildingId: 'electronicsRecycler', rate: 1.5 });
    const coal = GOODS.get('coalMine')!;
    expect(coal.producers).toContainEqual({ buildingId: 'rotaryExcavator', rate: 0.5 });
    const ironOre = GOODS.get('ironOreMine')!;
    expect(ironOre.producers).toContainEqual({ buildingId: 'ironMetalConverter', rate: 1.5 });
    const nuggets = GOODS.get('goldRefinery')!;
    expect(nuggets.producers).toContainEqual({ buildingId: 'goldMetalConverter', rate: 1 / 0.89 });
    const crudeOil = GOODS.get('oilRig')!;
    expect(crudeOil.producers).toContainEqual({ buildingId: 'oilDriller', rate: 1 / 3 });
  });

  test('fish aggregates final demand from all three factions', () => {
    const fish = GOODS.get('fishery')!;
    expect(fish.finalDemands).toHaveLength(3);
    expect(fish.finalDemands.map((demand) => demand.faction).sort()).toEqual(['eco', 'tech', 'tycoon']);
  });

  test('consumption edges dedupe consistently across chains', () => {
    const chipInputs = CONSUMPTION.get('chipFactory')!;
    expect(chipInputs).toContainEqual({ goodId: 'copperMine', rate: 0.5 });
    expect(chipInputs).toContainEqual({ goodId: 'sandExtractor', rate: 1 / 3 });
    // The recycler substitutes at the same microchips edge, so the electronics
    // factory consumes microchips at the canonical multiplier exactly once.
    expect(CONSUMPTION.get('electronicsFactory')!).toContainEqual({ goodId: 'chipFactory', rate: 1 });
    expect(CONSUMPTION.get('electronicsRecycler') ?? []).toEqual([]);
  });

  test('every material node is represented as a consumption edge', () => {
    for (const node of PRODUCTION_NODES) {
      if (node.calculation.kind !== 'material') continue;
      const parentBuilding = PRODUCTION_NODES.find((candidate) => candidate.id
        === (node.calculation as { parentId: string }).parentId)!.buildingId;
      const inputs = CONSUMPTION.get(parentBuilding) ?? [];
      expect(inputs.some((input) => input.goodId === producedGood(node.buildingId)), node.id).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/calculations/goods.test.ts`
Expected: FAIL — `./goods` does not exist.

- [ ] **Step 3: Implement the derivation**

```ts
// src/calculations/goods.ts
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
type OptionRole = Readonly<{ goodId: GoodId; rate: number; canonicalMultiplier: number }>;
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
      canonicalMultiplier,
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
const finalDemands = new Map<GoodId, FinalDemand[]>();
const consumption = new Map<BuildingId, Map<GoodId, number>>();

for (const node of PRODUCTION_NODES) {
  const goodId = goodOf(node);
  const rate = optionRoles.get(node.id)?.rate ?? 1;
  const rates = producerRates.get(goodId) ?? new Map<BuildingId, number>();
  rates.set(node.buildingId, assertConsistent('producer rate', `${goodId}/${node.buildingId}`, rates.get(node.buildingId), rate));
  producerRates.set(goodId, rates);

  if (node.calculation.kind === 'primary') {
    const demands = finalDemands.get(goodId) ?? [];
    if (demands.some((demand) => demand.faction === node.faction)) {
      throw new Error(`Duplicate final demand for ${goodId}/${node.faction}`);
    }
    demands.push({
      faction: node.faction,
      satisfaction: node.calculation.satisfaction,
      recyclable: Boolean(node.calculation.recyclable),
    });
    finalDemands.set(goodId, demands);
  } else {
    const parent = nodeById.get(node.calculation.parentId)!;
    // Units of this good consumed per parent building at 100%: the option-root
    // conversion makes alternative routes collapse onto one identical edge.
    const edgeRate = node.calculation.multiplier * rate;
    const inputs = consumption.get(parent.buildingId) ?? new Map<GoodId, number>();
    inputs.set(goodId, assertConsistent('consumption edge', `${parent.buildingId}->${goodId}`, inputs.get(goodId), edgeRate));
    consumption.set(parent.buildingId, inputs);
  }
}

export const GOODS: ReadonlyMap<GoodId, Good> = new Map(
  [...producerRates.entries()].map(([id, rates]) => [id, {
    id,
    producers: [...rates.entries()].map(([buildingId, rate]) => ({ buildingId, rate })),
    finalDemands: finalDemands.get(id) ?? [],
  }]),
);

export const CONSUMPTION: ReadonlyMap<BuildingId, readonly InputRate[]> = new Map(
  [...consumption.entries()].map(([buildingId, inputs]) => [
    buildingId,
    [...inputs.entries()].map(([goodId, rate]) => ({ goodId, rate })),
  ]),
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/calculations/goods.test.ts`
Expected: PASS. If the consistency assertion throws, the failure names the exact edge — fix the derivation, not the data.

- [ ] **Step 5: Run the whole suite, lint, and commit**

Run: `pnpm test && pnpm lint`

```bash
git add src/calculations/goods.ts src/calculations/goods.test.ts
git commit -m "feat: derive canonical goods and rates from production constants"
```

### Task 2: Island state model

**Files:**
- Create: `src/island.ts`
- Create: `src/island.test.ts`
- Modify: `src/model.ts` (export `createFactionState`)

- [ ] **Step 1: Write failing island model tests**

```ts
// src/island.test.ts
import { describe, expect, test } from 'vitest';

import { createIsland, islandPopulation, ownedCount, islandProductivity } from './island';

describe('island model', () => {
  test('creates a settled island with empty sparse records', () => {
    const island = createIsland('Walbruck');
    expect(island.name).toBe('Walbruck');
    expect(island.settled).toBe(true);
    expect(island.owned).toEqual({});
    expect(island.productivity).toEqual({});
    expect(island.fertilities).toEqual({});
    expect(island.id).not.toBe(createIsland('Walbruck').id);
  });

  test('missing owned and productivity entries default to 0 and 100', () => {
    const island = createIsland('A');
    expect(ownedCount(island, 'chipFactory')).toBe(0);
    expect(islandProductivity(island, 'chipFactory')).toBe(100);
    const edited = {
      ...island,
      owned: { chipFactory: { raw: '3', value: 3 } },
      productivity: { chipFactory: { raw: '50', value: 50 } },
    };
    expect(ownedCount(edited, 'chipFactory')).toBe(3);
    expect(islandProductivity(edited, 'chipFactory')).toBe(50);
  });

  test('invalid entries resolve to null', () => {
    const island = {
      ...createIsland('A'),
      owned: { chipFactory: { raw: 'x', value: null } },
      productivity: { fishery: { raw: '-1', value: null } },
    };
    expect(ownedCount(island, 'chipFactory')).toBeNull();
    expect(islandProductivity(island, 'fishery')).toBeNull();
  });

  test('island population uses the shared ascension model per faction', () => {
    const island = createIsland('A');
    const withHouses = {
      ...island,
      factions: {
        ...island.factions,
        eco: { ...island.factions.eco, houses: { raw: '10', value: 10 } },
      },
    };
    const population = islandPopulation(withHouses, 'eco');
    expect(population).not.toBeNull();
    expect(population!.reduce((total, tier) => total + tier, 0)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/island.test.ts`
Expected: FAIL — `./island` does not exist.

- [ ] **Step 3: Implement the island model**

In `src/model.ts`, export the currently-private `createFactionState`. Then:

```ts
// src/island.ts
import type { BuildingId } from './calculations/building-data';
import type { Faction } from './calculations/population';
import {
  createFactionState,
  effectivePopulation,
  type EditableNumber,
  type FactionState,
} from './model';

export type FertilityState = 'present' | 'absent'; // missing key = unknown

export type IslandFactionState = FactionState & { recyclingCoverage: boolean };

export type IslandState = {
  id: string;
  name: string;
  settled: boolean;
  fertilities: Record<string, FertilityState>;
  factions: Record<Faction, IslandFactionState>;
  owned: Record<string, EditableNumber>;
  productivity: Record<string, EditableNumber>;
};

const islandFaction = (faction: Faction): IslandFactionState => ({
  ...createFactionState(faction),
  recyclingCoverage: false,
});

export function createIsland(name: string): IslandState {
  return {
    id: crypto.randomUUID(),
    name,
    settled: true,
    fertilities: {},
    factions: { eco: islandFaction('eco'), tycoon: islandFaction('tycoon'), tech: islandFaction('tech') },
    owned: {},
    productivity: {},
  };
}

export function ownedCount(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.owned[buildingId];
  return entry === undefined ? 0 : entry.value;
}

export function islandProductivity(island: IslandState, buildingId: BuildingId): number | null {
  const entry = island.productivity[buildingId];
  return entry === undefined ? 100 : entry.value;
}

export function islandPopulation(island: IslandState, faction: Faction): number[] | null {
  return effectivePopulation(faction, island.factions[faction]);
}
```

Note: `createIsland` reuses the plan's faction defaults, so island houses default to `{raw: '0', value: 0}` — `effectivePopulation` works unchanged. (Task 5 makes the *plan's* houses nullable; island houses stay non-null, which the Task 5 type change must preserve — see its Step 3.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/island.test.ts src/model.test.ts 2>/dev/null || pnpm vitest run src/island.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite, lint, commit**

```bash
git add src/island.ts src/island.test.ts src/model.ts
git commit -m "feat: add per-island actual state model"
```

### Task 3: Island balances and transfer needs

**Files:**
- Create: `src/calculations/island-balance.ts`
- Create: `src/calculations/island-balance.test.ts`
- Create: `src/calculations/island-balance.property.test.ts`

- [ ] **Step 1: Write failing balance tests**

```ts
// src/calculations/island-balance.test.ts
import { describe, expect, test } from 'vitest';

import { createIsland } from '../island';
import { aggregateBalances, calculateIslandBalance, transferNeeds } from './island-balance';

const withOwned = (owned: Record<string, number>, productivity: Record<string, number> = {}) => ({
  ...createIsland('A'),
  owned: Object.fromEntries(Object.entries(owned).map(([id, value]) => [id, { raw: String(value), value }])),
  productivity: Object.fromEntries(
    Object.entries(productivity).map(([id, value]) => [id, { raw: String(value), value }]),
  ),
});

describe('calculateIslandBalance', () => {
  test('capacity scales with owned count, producer rate, and productivity', () => {
    const balances = calculateIslandBalance(withOwned({ electronicsRecycler: 2 }, { electronicsRecycler: 50 }));
    // 2 recyclers at 50% at rate 1.5 = 1.5 chip-factory units.
    expect(balances.chipFactory?.capacity).toBeCloseTo(1.5, 9);
  });

  test('owned consumers place intermediate demand on their own island', () => {
    const balances = calculateIslandBalance(withOwned({ chipFactory: 2 }));
    expect(balances.copperMine?.demand).toBeCloseTo(1, 9);      // 2 × 0.5
    expect(balances.sandExtractor?.demand).toBeCloseTo(2 / 3, 9);
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });

  test('final demand follows island population and satisfaction', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const balances = calculateIslandBalance(island);
    expect(balances.fishery?.demand).toBeGreaterThan(0);
  });

  test('recycling coverage reduces recyclable final demand by 15% above tier 0', () => {
    const island = createIsland('A');
    island.factions.eco.houses = { raw: '100', value: 100 };
    const covered = { ...island, factions: { ...island.factions, eco: { ...island.factions.eco, recyclingCoverage: true } } };
    const base = calculateIslandBalance(island).electronicsFactory!.demand!;
    const reduced = calculateIslandBalance(covered).electronicsFactory!.demand!;
    expect(reduced).toBeCloseTo(base * 0.85, 9);
    // Fish is not recyclable: unchanged.
    expect(calculateIslandBalance(covered).fishery!.demand!)
      .toBeCloseTo(calculateIslandBalance(island).fishery!.demand!, 9);
  });

  test('invalid entries null only the affected good', () => {
    const island = withOwned({ chipFactory: 2 });
    island.owned.fishery = { raw: 'x', value: null };
    const balances = calculateIslandBalance(island);
    expect(balances.fishery?.capacity).toBeNull();
    expect(balances.chipFactory?.capacity).toBeCloseTo(2, 9);
  });
});

describe('aggregateBalances and transferNeeds', () => {
  test('unsettled islands contribute nothing', () => {
    const settled = withOwned({ fishery: 2 });
    const unsettled = { ...withOwned({ fishery: 5 }), settled: false };
    const empire = aggregateBalances([settled, unsettled]);
    expect(empire.fishery?.capacity).toBeCloseTo(2, 9);
  });

  test('lists surplus and deficit islands per good, skipping one-signed goods', () => {
    const producer = withOwned({ fishery: 2 });
    const consumer = createIsland('B');
    consumer.factions.eco.houses = { raw: '500', value: 500 };
    const needs = transferNeeds([producer, consumer]);
    const fish = needs.find((need) => need.goodId === 'fishery')!;
    expect(fish.surpluses.map((entry) => entry.islandId)).toEqual([producer.id]);
    expect(fish.deficits.map((entry) => entry.islandId)).toEqual([consumer.id]);
    // A good only one island touches, with no counterpart, is not a transfer need.
    expect(needs.some((need) => need.goodId === 'chipFactory')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/calculations/island-balance.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement balances**

```ts
// src/calculations/island-balance.ts
import { islandPopulation, islandProductivity, ownedCount, type IslandState } from '../island';
import type { BuildingId } from './building-data';
import { CONSUMPTION, GOODS, producedGood, type GoodId } from './goods';

export const BALANCE_EPSILON = 1e-9;

export type GoodBalance = { capacity: number | null; demand: number | null; balance: number | null };
export type IslandBalances = Partial<Record<GoodId, GoodBalance>>;
export type TransferNeed = Readonly<{
  goodId: GoodId;
  surpluses: readonly Readonly<{ islandId: string; amount: number }>[];
  deficits: readonly Readonly<{ islandId: string; amount: number }>[];
  empireNet: number | null;
}>;

const add = (current: number | null | undefined, amount: number | null): number | null => {
  if (amount === null || current === null) return null;
  return (current ?? 0) + amount;
};

export function calculateIslandBalance(island: IslandState): IslandBalances {
  const capacity: Partial<Record<GoodId, number | null>> = {};
  const demand: Partial<Record<GoodId, number | null>> = {};

  for (const [buildingId, entry] of Object.entries(island.owned)) {
    const goodId = producedGood(buildingId as BuildingId);
    if (goodId === null) continue;
    const productivity = islandProductivity(island, buildingId as BuildingId);
    const output = entry.value === null || productivity === null
      ? null
      : entry.value * (productivity / 100)
        * GOODS.get(goodId)!.producers.find((producer) => producer.buildingId === buildingId)!.rate;
    capacity[goodId] = add(capacity[goodId], output);

    for (const input of CONSUMPTION.get(buildingId as BuildingId) ?? []) {
      const consumed = entry.value === null || productivity === null
        ? null
        : entry.value * (productivity / 100) * input.rate;
      demand[input.goodId] = add(demand[input.goodId], consumed);
    }
  }

  for (const good of GOODS.values()) {
    for (const finalDemand of good.finalDemands) {
      if (finalDemand.satisfaction.every((value) => value === 0)) continue;
      const population = islandPopulation(island, finalDemand.faction);
      const amount = population === null ? null : finalDemand.satisfaction.reduce((total, satisfied, tier) => {
        if (satisfied === 0) return total;
        const coverage = island.factions[finalDemand.faction].recyclingCoverage;
        const recyclingMultiplier = coverage && finalDemand.recyclable && tier > 0 ? 0.85 : 1;
        return total + population[tier] * recyclingMultiplier / satisfied;
      }, 0);
      if (amount === null || amount > 0) demand[good.id] = add(demand[good.id], amount);
    }
  }

  const balances: IslandBalances = {};
  for (const goodId of new Set([...Object.keys(capacity), ...Object.keys(demand)]) as Set<GoodId>) {
    // undefined means untouched (0); null means invalid input and must survive.
    const goodCapacity = capacity[goodId] === undefined ? 0 : capacity[goodId];
    const goodDemand = demand[goodId] === undefined ? 0 : demand[goodId];
    balances[goodId] = {
      capacity: goodCapacity,
      demand: goodDemand,
      balance: goodCapacity === null || goodDemand === null ? null : goodCapacity - goodDemand,
    };
  }
  return balances;
}

export function aggregateBalances(islands: readonly IslandState[]): IslandBalances {
  const empire: IslandBalances = {};
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [goodId, balance] of Object.entries(calculateIslandBalance(island)) as [GoodId, GoodBalance][]) {
      const current = empire[goodId] ?? { capacity: 0, demand: 0, balance: 0 };
      empire[goodId] = {
        capacity: add(current.capacity, balance.capacity),
        demand: add(current.demand, balance.demand),
        balance: add(current.balance, balance.balance),
      };
    }
  }
  return empire;
}

export function transferNeeds(islands: readonly IslandState[]): readonly TransferNeed[] {
  const perIsland = islands
    .filter((island) => island.settled)
    .map((island) => ({ island, balances: calculateIslandBalance(island) }));
  const goodIds = new Set(perIsland.flatMap(({ balances }) => Object.keys(balances)) as GoodId[]);

  const needs: TransferNeed[] = [];
  for (const goodId of goodIds) {
    const surpluses: { islandId: string; amount: number }[] = [];
    const deficits: { islandId: string; amount: number }[] = [];
    let empireNet: number | null = 0;
    for (const { island, balances } of perIsland) {
      const balance = balances[goodId]?.balance;
      if (balance === undefined) continue;
      empireNet = add(empireNet, balance);
      if (balance === null) continue;
      if (balance > BALANCE_EPSILON) surpluses.push({ islandId: island.id, amount: balance });
      if (balance < -BALANCE_EPSILON) deficits.push({ islandId: island.id, amount: -balance });
    }
    if (deficits.length > 0 && (surpluses.length > 0 || empireNet === null || empireNet < -BALANCE_EPSILON)) {
      needs.push({ goodId, surpluses, deficits, empireNet });
    }
  }
  return needs;
}
```

Note the `ownedCount` import stays unused here — remove it from the import list if the linter flags it; `calculateIslandBalance` iterates `island.owned` directly so untouched buildings cost nothing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/calculations/island-balance.test.ts`
Expected: PASS.

- [ ] **Step 5: Add property tests**

```ts
// src/calculations/island-balance.property.test.ts
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

import { calculatePopulation } from './population';
import { calculateProduction, createDefaultProductivity } from './calculate-production';
import { PRODUCTION_NODES } from './production-data';
import { producedGood } from './goods';
import { createIsland } from '../island';
import { calculateIslandBalance, transferNeeds, BALANCE_EPSILON } from './island-balance';

describe('island balance properties', () => {
  test('an island owning exactly the plan requirement balances to ~zero', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 500 }), (houses) => {
      const population = {
        eco: calculatePopulation({ faction: 'eco', houses, maxTier: 4, livingSpace: false, senate: false }),
        tycoon: calculatePopulation({ faction: 'tycoon', houses, maxTier: 4, livingSpace: false, senate: false }),
        tech: calculatePopulation({ faction: 'tech', houses, maxTier: 3, livingSpace: false, senate: false }),
      };
      const required = calculateProduction({
        population, productivity: createDefaultProductivity(), recycling: false, wholeBuildings: false,
      });
      const island = createIsland('Mirror');
      for (const faction of ['eco', 'tycoon', 'tech'] as const) {
        island.factions[faction].houses = { raw: String(houses), value: houses };
      }
      // Sum plan node requirements per building; skip non-canonical alternatives,
      // whose demand the canonical producer already covers at full requirement.
      const owned: Record<string, number> = {};
      for (const node of PRODUCTION_NODES) {
        if (producedGood(node.buildingId) !== node.buildingId) continue;
        owned[node.buildingId] = (owned[node.buildingId] ?? 0) + required[node.id];
      }
      island.owned = Object.fromEntries(
        Object.entries(owned).map(([id, value]) => [id, { raw: String(value), value }]),
      );
      for (const [goodId, balance] of Object.entries(calculateIslandBalance(island))) {
        expect(Math.abs(balance.balance ?? 0), goodId).toBeLessThan(1e-6);
      }
    }), { numRuns: 25 });
  });

  test('capacity is monotone in owned count and linear in productivity', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 400 }),
      (count, productivity) => {
        const island = createIsland('A');
        island.owned = { fishery: { raw: String(count), value: count } };
        island.productivity = { fishery: { raw: String(productivity), value: productivity } };
        const capacity = calculateIslandBalance(island).fishery?.capacity ?? 0;
        expect(capacity).toBeCloseTo(count * productivity / 100, 9);
      },
    ));
  });

  test('transfer needs are consistent with island balances', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ fisheries: fc.integer({ min: 0, max: 5 }), houses: fc.integer({ min: 0, max: 300 }) }), { maxLength: 4 }),
      (configs) => {
        const islands = configs.map((config, index) => {
          const island = createIsland(`I${index}`);
          island.owned = { fishery: { raw: String(config.fisheries), value: config.fisheries } };
          island.factions.eco.houses = { raw: String(config.houses), value: config.houses };
          return island;
        });
        for (const need of transferNeeds(islands)) {
          expect(need.deficits.length).toBeGreaterThan(0);
          for (const entry of [...need.surpluses, ...need.deficits]) {
            expect(entry.amount).toBeGreaterThan(BALANCE_EPSILON);
          }
        }
      },
    ));
  });
});
```

- [ ] **Step 6: Run all new tests, full suite, lint, commit**

Run: `pnpm test && pnpm lint`

```bash
git add src/calculations/island-balance.ts src/calculations/island-balance.test.ts src/calculations/island-balance.property.test.ts
git commit -m "feat: calculate island balances and transfer needs"
```

### Task 4: Actual operating impacts

**Files:**
- Modify: `src/calculations/operating-impact.ts`
- Modify: `src/calculations/operating-impact.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `operating-impact.test.ts`:

```ts
import { calculateOwnedImpact } from './operating-impact';
import { createIsland } from '../island';

describe('calculateOwnedImpact', () => {
  test('sums flat per-building impacts across settled islands', () => {
    const a = createIsland('A');
    a.owned = { fishery: { raw: '2', value: 2 } };            // -5 credits, -1 power each
    const b = createIsland('B');
    b.owned = { chipFactory: { raw: '1', value: 1 } };        // -10, -2, -4
    const unsettled = { ...createIsland('C'), settled: false, owned: { fishery: { raw: '9', value: 9 } } };
    expect(calculateOwnedImpact([a, b, unsettled])).toEqual({
      maintenanceCredits: -20, power: -4, ecoBalance: -4,
    });
  });

  test('productivity does not affect owned impacts', () => {
    const island = createIsland('A');
    island.owned = { fishery: { raw: '2', value: 2 } };
    island.productivity = { fishery: { raw: '250', value: 250 } };
    expect(calculateOwnedImpact([island])!.maintenanceCredits).toBe(-10);
  });

  test('an invalid owned count makes the total unavailable', () => {
    const island = createIsland('A');
    island.owned = { fishery: { raw: 'x', value: null } };
    expect(calculateOwnedImpact([island])).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Run: `pnpm vitest run src/calculations/operating-impact.test.ts` → FAIL.

Append to `operating-impact.ts` (matching its existing `OperatingImpact` shape from `building-data.ts`):

```ts
import { BUILDINGS, type BuildingId, type OperatingImpact } from './building-data';
import type { IslandState } from '../island';

export function calculateOwnedImpact(islands: readonly IslandState[]): OperatingImpact | null {
  let maintenanceCredits = 0; let power = 0; let ecoBalance = 0;
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned)) {
      if (entry.value === null) return null;
      const impact = BUILDINGS[buildingId as BuildingId].operatingImpact;
      maintenanceCredits += entry.value * impact.maintenanceCredits;
      power += entry.value * impact.power;
      ecoBalance += entry.value * impact.ecoBalance;
    }
  }
  return { maintenanceCredits, power, ecoBalance };
}
```

Merge this import with the file's existing imports rather than duplicating them.

- [ ] **Step 3: Run tests, full suite, lint, commit**

Run: `pnpm test && pnpm lint`

```bash
git add src/calculations/operating-impact.ts src/calculations/operating-impact.test.ts
git commit -m "feat: total flat operating impacts of owned buildings"
```

### Task 5: Plan houses Auto mode

**Files:**
- Modify: `src/model.ts`
- Modify: `src/components/PopulationSection.tsx`
- Modify: `src/App.tsx` (pass island sums)
- Modify: `src/App.population.test.tsx` (state-shape updates happen in Task 6; here only add the Auto test alongside minimal prop plumbing)

- [ ] **Step 1: Write failing model tests** (in a new `describe` inside `src/storage.test.ts`'s sibling `src/model.test.ts` if absent — create `src/model.test.ts`)

```ts
// src/model.test.ts (create if missing)
import { describe, expect, test } from 'vitest';

import { createFactionState, resolveHouses } from './model';

describe('resolveHouses', () => {
  test('null houses resolve to the settled-island sum', () => {
    const state = { ...createFactionState('eco'), houses: null };
    expect(resolveHouses(state, 42)).toEqual({ raw: '42', value: 42 });
  });

  test('manual houses override the island sum', () => {
    const state = { ...createFactionState('eco'), houses: { raw: '7', value: 7 } };
    expect(resolveHouses(state, 42)).toEqual({ raw: '7', value: 7 });
  });
});
```

- [ ] **Step 2: Implement in `model.ts`**

- Change `FactionState.houses` to `EditableNumber | null` (null = Auto).
- `createFactionState` keeps returning `houses: { raw: '0', value: 0 }` so islands (Task 2) and migrated v1 states stay manual by default; the *initial plan state* switches to `houses: null` in `createInitialState` so a fresh app follows islands automatically.
- Add:

```ts
export function resolveHouses(state: FactionState, settledIslandHouses: number): EditableNumber {
  return state.houses ?? { raw: String(settledIslandHouses), value: settledIslandHouses };
}
```

- `derivePopulation` gains the resolved value: change its `houses` read to a `resolvedHouses: EditableNumber` parameter supplied by callers (`derivePopulation(faction, state, resolveHouses(state, sum))`), and thread the same through `effectivePopulation`/`effectivePopulations` with a `Record<Faction, number>` of island sums (default `{eco: 0, tycoon: 0, tech: 0}` so `src/island.ts`'s use stays unchanged — an island's own houses are always manual).
- Compute the sums in `App.tsx`: `const islandHouses = { eco: sumHouses('eco'), ... }` where `sumHouses` adds `factions[faction].houses?.value ?? 0` over settled islands (null island houses cannot occur; treat null values as invalid → propagate null like other EditableNumbers).

- [ ] **Step 3: Update `PopulationSection.tsx`**

The houses input renders `resolveHouses(...)`; when `state.houses === null` the field carries the existing `population-override` highlight convention in reverse: Auto is the unhighlighted state, and a highlighted manual state shows the same `Auto` reset button the per-tier overrides already use (reuse the exact markup/CSS class of the override Auto control). Editing the field always produces a manual value; the Auto button sets `houses: null`.

- [ ] **Step 4: Run tests, fix ripples, commit**

Run: `pnpm test` — existing tests constructing `FactionState` literals still typecheck (`EditableNumber` remains assignable); fix any that break on the new `derivePopulation` signature by passing `resolveHouses(state, 0)`.

```bash
git add src/model.ts src/model.test.ts src/components/PopulationSection.tsx src/App.tsx
git commit -m "feat: auto-derive plan houses from settled islands"
```

### Task 6: Storage v2 with migration, tolerance, and preservation

**Files:**
- Modify: `src/storage.ts`
- Modify: `src/storage.test.ts`
- Modify: `src/model.ts` (add `AppState`)
- Modify: `src/App.tsx`
- Modify: `src/test/app-test-utils.tsx` and existing `src/App.*.test.tsx` for the `{plan, islands}` shape

- [ ] **Step 1: Write failing storage tests**

Replace the existing describe blocks that assume v1-only behavior; keep their intent. New coverage:

```ts
// key cases for src/storage.test.ts
import { beforeEach, describe, expect, test } from 'vitest';

import { createInitialState } from './model';
import { loadAppState, saveAppState, STORAGE_KEY } from './storage';

beforeEach(() => localStorage.clear());

describe('loadAppState', () => {
  test('empty storage loads defaults and allows saving', () => {
    const result = loadAppState();
    expect(result.state.islands).toEqual([]);
    expect(result.storable).toBe(true);
  });

  test('valid v1 payloads migrate losslessly with houses kept manual', () => {
    const v1 = { version: 1, state: createV1State() }; // helper: today's shape with houses: {raw:'12',value:12}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    expect(result.state.plan.factions.eco.houses).toEqual({ raw: '12', value: 12 });
    expect(result.state.islands).toEqual([]);
  });

  test('corrupted payloads are preserved and autosave is suppressed', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const result = loadAppState();
    expect(result.storable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not json');
  });

  test('future versions are preserved and autosave is suppressed', () => {
    const payload = JSON.stringify({ version: 99, anything: true });
    localStorage.setItem(STORAGE_KEY, payload);
    const result = loadAppState();
    expect(result.storable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
  });

  test('missing productivity keys default instead of invalidating the document', () => {
    const v2 = validV2(); // helper: fresh saved state
    delete v2.plan.productivity.ecoFish;
    v2.plan.productivity.unknownNode = { raw: '100', value: 100 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    expect(result.state.plan.productivity.ecoFish).toEqual({ raw: '100', value: 100 });
    expect('unknownNode' in result.state.plan.productivity).toBe(false);
  });

  test('island entries validate individually', () => {
    const v2 = validV2();
    v2.islands = [validIsland(), { nonsense: true }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    const result = loadAppState();
    expect(result.storable).toBe(false); // document readable but lossy: preserve original
    expect(result.state.islands).toHaveLength(1);
  });
});
```

Also keep a `saveAppState` round-trip test: save → load → deep-equal.

- [ ] **Step 2: Implement storage v2**

In `model.ts`:

```ts
export type AppState = { plan: CalculatorState; islands: IslandState[] };
export function createInitialAppState(): AppState {
  return { plan: createInitialState(), islands: [] };
}
```

(Import `IslandState` from `./island`; if this creates a cycle because `island.ts` imports `model.ts`, put `AppState` in `island.ts` instead and re-export from `model.ts` — `island.ts` already imports model, so `AppState` lives in `island.ts`.)

In `storage.ts`, replace `loadCalculatorState`/`saveCalculatorState` with:

```ts
export type LoadResult = { state: AppState; storable: boolean };

export function loadAppState(): LoadResult { /* dispatch on version */ }
export function saveAppState(state: AppState): void { /* {version: 2, plan, islands} */ }
```

Validation rules (tolerant):
- `EditableNumber` checks stay as today.
- Faction state: `houses` may be `null` or a valid `EditableNumber`; overrides as today; island factions additionally require `recyclingCoverage: boolean`.
- `productivity`/`owned` maps: iterate the *known* ids (`PRODUCTION_NODES` for plan productivity, `Object.keys(BUILDINGS)` for island maps); take valid stored entries, substitute defaults for missing/invalid-shape keys, drop unknown keys. Track whether anything was dropped or substituted; any loss ⇒ `storable: false` (state usable, original payload preserved until the user edits).
- Islands: array; each entry must have string `id`/`name`, boolean `settled`, fertilities as a record of `'present' | 'absent'`; invalid entries are dropped (⇒ `storable: false`).
- v1 payloads: validate with the same tolerant approach, then `{plan: migrated, islands: []}`; v1 houses remain the stored `EditableNumber` (manual).
- Anything unreadable (bad JSON, non-record, unknown version): `{state: createInitialAppState(), storable: false}` — never write in `loadAppState`.

In `App.tsx`:

```tsx
const [{ state: initialState, storable }] = useState(loadAppState);
const [state, setState] = useState(initialState);
const [dirty, setDirty] = useState(false);
useEffect(() => {
  if (storable || dirty) saveAppState(state);
}, [state, storable, dirty]);
```

Every user-driven `setState` call goes through a wrapper that also sets `dirty` (a single `update(fn)` helper replacing direct `setState` in handlers, including Reset all). The existing state reads become `state.plan.…`; islands live at `state.islands`.

- [ ] **Step 3: Update `app-test-utils.tsx` and existing App tests**

The utils' state seeding and any direct `loadCalculatorState`/`saveCalculatorState` references switch to `loadAppState`/`saveAppState` and the `{plan, islands}` shape. Run the whole suite and fix each App test's state references (`state.factions` → `state.plan.factions`) — mechanical, no behavior change.

- [ ] **Step 4: Run everything, commit**

Run: `pnpm test && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat: versioned app storage with migration and preservation"
```

### Task 7: Fertility requirements data and picker

**Files:**
- Modify: `src/calculations/building-data.ts`
- Modify: `src/calculations/building-data.test.ts`
- Create: `src/components/FertilityPicker.tsx`
- Create: `src/components/FertilityPicker.test.tsx`

Data verified against the Anno 2070 wiki (Fertility, Goods, All Items pages plus per-building pages, 2026-08-30). Two research caveats, acceptable for picker-only semantics: the Gold Refinery's gold-deposit requirement is inferred from the resource-refill item system, and land placement of Bionics Factory/Hydraulic Plant is confirmed only indirectly (placement is not modeled anyway).

- [ ] **Step 1: Add the requirement model and table to `building-data.ts`**

```ts
export type IslandRequirement = Readonly<{
  id: string;
  label: string;
  image: string;         // existing good asset
  kind: 'fertility' | 'deposit';
}>;

const fertility = (id: string, label: string, image: string): IslandRequirement =>
  ({ id, label, image, kind: 'fertility' });
const deposit = (id: string, label: string, image: string): IslandRequirement =>
  ({ id, label, image, kind: 'deposit' });

export const ISLAND_REQUIREMENTS: readonly IslandRequirement[] = [
  fertility('tea', 'Tea', 'Tea_Qoor.png'),
  fertility('rice', 'Rice', 'Rice_Qoor.png'),
  fertility('vegetable', 'Vegetable', 'Vegetables_Qoor.png'),
  fertility('fruit', 'Fruit', 'Fruits_Qoor.png'),
  fertility('durumWheat', 'Durum wheat', 'Durum wheat_Qoor.png'),
  fertility('corn', 'Corn', 'Corn_Qoor.png'),
  fertility('coffee', 'Coffee', 'Caffeine_Qoor.png'),
  fertility('sugar', 'Sugar', 'Sugar_Qoor.png'),
  fertility('grapes', 'Grapes', 'Grapes_Qoor.png'),
  fertility('truffle', 'Truffle', 'Truffle_Qoor.png'),
  fertility('algae', 'Algae', 'Algae_Qoor.png'),
  fertility('diamond', 'Diamond', 'Diamonds_Qoor.png'),
  fertility('manganeseNodule', 'Manganese nodules', 'Manganese nodules_Qoor.png'),
  fertility('spongeCultures', 'Sponge cultures', 'Sponges_Qoor.png'),
  deposit('copperDeposit', 'Copper deposit', 'Copper_Qoor.png'),
  deposit('coalMountain', 'Coal deposit (mountain)', 'Coal_Qoor.png'),
  deposit('coalGround', 'Coal deposit (ground)', 'Coal_Qoor.png'),
  deposit('ironOreDeposit', 'Iron ore deposit', 'Iron Ore_Qoor.png'),
  deposit('sandDeposit', 'Sand deposit (river slot)', 'Sand_Qoor.png'),
  deposit('goldDeposit', 'Gold deposit (river slot)', 'Gold nuggets_Qoor.png'),
  deposit('oilLand', 'Crude oil (land)', 'Crude oil_Qoor.png'),
  deposit('oilUnderwater', 'Crude oil (underwater)', 'Crude oil_Qoor.png'),
  deposit('blackSmoker', 'Black smoker', 'gold_converter_Qoor.png'),
];

export const BUILDING_REQUIREMENTS: Partial<Record<BuildingId, string>> = {
  teaPlantation: 'tea',
  riceFarm: 'rice',
  distillery: 'rice',
  farmhouse: 'vegetable',
  flavorLab: 'vegetable',
  fruitPlantation: 'fruit',
  grainFarm: 'durumWheat',
  cornFarm: 'corn',
  coffeePlantation: 'coffee',
  sugarBeetPlantation: 'sugar',
  vineyard: 'grapes',
  truffleFarm: 'truffle',
  aquafarm: 'algae',
  diamondHarvestingStation: 'diamond',
  manganeseExcavationRobot: 'manganeseNodule',
  spongeFarm: 'spongeCultures',
  copperMine: 'copperDeposit',
  coalMine: 'coalMountain',
  rotaryExcavator: 'coalGround',
  ironOreMine: 'ironOreDeposit',
  sandExtractor: 'sandDeposit',
  goldRefinery: 'goldDeposit',
  oilDriller: 'oilLand',
  oilRig: 'oilUnderwater',
  goldMetalConverter: 'blackSmoker',
  platinumMetalConverter: 'blackSmoker',
  ironMetalConverter: 'blackSmoker',
};
```

All other buildings (fisheries, factories, dairy farm, meat factory, lobster farm, electronics recycler, lithium production facility, …) have no island requirement and are absent from the map.

Tests: every `BUILDING_REQUIREMENTS` value exists in `ISLAND_REQUIREMENTS`; every requirement's image exists (extend `assets.test.ts` pattern); pinned spot checks (teaPlantation → tea fertility, copperMine → copper deposit, fishery → none).

- [ ] **Step 2: Implement the tri-state picker**

`FertilityPicker` renders one icon button per `ISLAND_REQUIREMENTS` entry. Click cycles unknown → present → absent → unknown. Buttons expose state via `aria-pressed` (present) plus a visually distinct absent style and a `?` badge for unknown; each has an accessible label `${label}: present/absent/unknown`. Component test drives the cycle and asserts labels.

- [ ] **Step 3: Test, lint, commit**

```bash
git add src/calculations/building-data.ts src/calculations/building-data.test.ts src/components/FertilityPicker.tsx src/components/FertilityPicker.test.tsx
git commit -m "feat: island fertility requirements and tri-state picker"
```

### Task 8: Islands section UI

**Files:**
- Create: `src/components/IslandsSection.tsx`
- Create: `src/App.islands.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

- [ ] **Step 1: Write failing integration tests**

`App.islands.test.tsx` (using `app-test-utils`): add an island via the "Add island" button and rename it; enter eco houses and see the island's population and fish demand render; enter an owned fishery count and see the island's fish balance change sign; mark a fertility absent and see the corresponding building disappear from the picker; toggle settled off and see the plan's Auto houses drop.

- [ ] **Step 2: Implement `IslandsSection`**

One `calculator-section` with a card per island: name input; settled checkbox; `FertilityPicker`; per-faction inputs reusing the population-section control markup (houses, highest tier, bonus toggles labelled "assumes all residences covered", recycling coverage, per-tier overrides); an owned-buildings list showing only buildings with a nonzero/invalid entry plus an add-picker `<select>` sorted by plan-requirement-minus-owned gap (descending) and filtered by absent fertilities; per-building count and productivity `NumericInput`s; the island balance table (good icon, capacity, demand, balance, two-decimal formatting via `formatRequirement`, shortfall/surplus classes). Remove button with a confirm-free single click is fine — state is one Ctrl+Z-less browser app, so guard with `window.confirm`.

All state changes flow through App's `update` helper into `state.islands`.

- [ ] **Step 3: Test, lint, commit**

```bash
git add src/components/IslandsSection.tsx src/App.islands.test.tsx src/App.tsx src/styles.css
git commit -m "feat: add islands section with actuals entry"
```

### Task 9: Actuals in the production view

**Files:**
- Modify: `src/components/ProductionSection.tsx`, `src/components/OperatingImpactValues.tsx`, `src/styles.css`
- Create: `src/App.actuals.test.tsx`

- [ ] **Step 1: Write failing integration tests**

With one island owning two fisheries: the production table's fishery row shows owned `2`, actual capacity `2`, and a balance cell classed surplus or shortfall against the plan requirement; alternative (grey) rows show no owned/balance cells; per-building impact values are inside a toggleable tooltip (`aria-expanded` button, not title-only); an actual-impacts summary shows `-10` credits next to the planned total; the transfer-needs list shows fish moving from the surplus island to a deficit island when a second consuming island exists; goods with negative empire net carry a distinct class.

- [ ] **Step 2: Implement**

- `ProductionSection` receives `islands` (plus derived `empireBalances = aggregateBalances(islands)`, `needs = transferNeeds(islands)`, `ownedImpact = calculateOwnedImpact(islands)` computed in `App.tsx`).
- Each non-alternative row whose node's building is the good's canonical producer gains three cells: Σ owned (across settled islands), capacity, balance = capacity − plan requirement for that good (sum of the good's canonical plan rows). Alternative rows render empty cells. Column headers make "Σ owned" explicitly empire-wide.
- Per-building impact `OperatingImpactValues` moves into a `<button aria-expanded>`-controlled popover on the row (works via click/keyboard; no hover-only).
- The freed inline slot shows actual operating impacts where planned ones show today, labelled actual.
- Transfer needs render as a list after the faction totals: per good, icon + "surplus: A (+1.50) → deficit: B (−2.00)", with an `empire-shortfall` class when the net is negative.

- [ ] **Step 3: Test, lint, commit**

```bash
git add src/components/ProductionSection.tsx src/components/OperatingImpactValues.tsx src/App.actuals.test.tsx src/App.tsx src/styles.css
git commit -m "feat: show actuals and transfer needs in production view"
```

### Task 10: README and final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README** — move per-island actuals/balances/transfer needs into current functionality; rewrite the roadmap: next = supported-population/bottleneck view, then step-wise ascension planning and settle proposals; note the Dexie revisit trigger (multi-document state).

- [ ] **Step 2: Full verification**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 3: Visual check** — `pnpm dev`, verify island cards, new columns at the wide layout, tooltip behavior, and that a fresh profile (empty storage) still loads instantly.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: record island actuals in README"
```
