# Growth Planning and Workspace Tabs Implementation Plan

> **Execution:** Use superpowers:executing-plans inline. Repository instructions prohibit delegating code writing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add residence- and population-driven Growth targets, derive cumulative full-supply milestones with producer-specific island actions, and separate Islands, current Production, and Growth into clear workspaces beneath a read-only population overview.

**Architecture:** Split concrete island residence state from a discriminated plan target intent and migrate storage to v3. Resolve targets and milestones in pure calculation modules; App derives actual full demand, resolved targets, and Growth planning separately. UI tabs remain local state, Islands shows only actual-demand suggestions, Production shows current full demand, and Growth owns target controls and milestone actions.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Testing Library, fast-check, versioned JSON localStorage.

**Specs:**
- `docs/superpowers/specs/2026-08-31-planning-mode-design.md`
- `docs/research/2026-08-31-needs-ascension-language.md`

---

## File structure

- Create `src/calculations/population-target.ts`: resolve follow/residence/population target intents, including lower-bound inverse search.
- Create `src/calculations/population-target.test.ts`: exact, overshoot, bonuses, override, invalid, and minimum-house tests.
- Create `src/calculations/planning.ts`: cumulative checkpoint construction, canonical full-demand normalization, gap ordering, and current/complete state.
- Create `src/calculations/planning.test.ts`: expansion, ascension, cumulative shared demand, masked overrides, ordering, capacity, and null tests.
- Create `src/components/GrowthSection.tsx`: Growth section shell, target cards, and milestone list composition.
- Create `src/components/GrowthTargetFaction.tsx`: one faction's collapsible target intent editor and derived results.
- Create `src/components/GrowthMilestones.tsx`: milestone/gap presentation and producer-specific island actions.
- Create `src/App.navigation.test.tsx`, `src/App.population-overview.test.tsx`, and `src/App.growth.test.tsx`: new workspace and end-to-end behavior.
- Modify `src/model.ts`: separate `ResidenceFactionState` and `PlanFactionState`; add `TargetIntent`.
- Modify `src/island.ts`: use concrete residence state and export `stepOwnedBuilding`.
- Modify `src/storage.ts`: v3 sanitizer, v1/v2 migration, and v3 save.
- Modify `src/App.tsx`: derive actual demand and Growth separately; add tabs and apply action.
- Modify `src/components/PopulationSection.tsx`: replace editor with read-only Actual/Target/Headroom overview.
- Modify `src/components/PopulationFaction.tsx`: retain island-only residence editing and remove plan branches.
- Modify `src/components/IslandsSection.tsx`: remove target requirements/Plan column and use only current-demand suggestions.
- Modify `src/components/CoverageSection.tsx`: current full-demand view only.
- Modify `src/components/ProductionSection.tsx`: remove generic plan gaps and use current-full-demand language.
- Modify `src/calculations/coverage.ts`: expose reusable faction headroom for the overview.
- Modify `src/test/app-test-utils.tsx`: workspace and Growth-target interaction helpers.
- Modify affected App/model/storage tests, `src/styles.css`, and `README.md`.

### Task 1: Separate target intent and resolve population-driven goals

**Files:**
- Create: `src/calculations/population-target.ts`
- Create: `src/calculations/population-target.test.ts`
- Modify: `src/model.ts`
- Modify: `src/model.test.ts`
- Modify: `src/island.ts`

- [ ] **Step 1: Write failing target-resolution tests**

Create `src/calculations/population-target.test.ts` with focused examples:

```ts
import { describe, expect, test } from 'vitest';

import { resolvePopulationTarget } from './population-target';
import { createPlanFactionState } from '../model';

const editable = (value: number) => ({ raw: String(value), value });

describe('resolvePopulationTarget', () => {
  test('finds the minimum residences for a Tech population goal', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
    };
    const result = resolvePopulationTarget('tech', state, 0, [0, 0, 0]);
    expect(result).toMatchObject({ houses: 279, maxTier: 3, requested: 2500, achieved: 2500, overshoot: 0 });
    expect(result?.normalPopulations).toEqual([560, 3510, 2500]);
  });

  test('reports unavoidable whole-house overshoot and proves minimality', () => {
    const state = {
      ...createPlanFactionState('tech'),
      intent: { kind: 'population' as const, tier: 3, count: editable(2501) },
    };
    const result = resolvePopulationTarget('tech', state, 0, [0, 0, 0]);
    expect(result).toMatchObject({ houses: 284, requested: 2501, achieved: 2550, overshoot: 49 });
  });

  test('recomputes minimum houses through living-space bonuses', () => {
    const state = {
      ...createPlanFactionState('tech'),
      livingSpace: true,
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
    };
    expect(resolvePopulationTarget('tech', state, 0, [0, 0, 0])?.houses).toBe(250);
  });

  test('follows island totals without storing a derived target', () => {
    const result = resolvePopulationTarget('eco', createPlanFactionState('eco'), 12, [16, 75, 25, 0]);
    expect(result).toMatchObject({ houses: 12, maxTier: 3, requested: null, overshoot: 0 });
    expect(result?.effectivePopulations).toEqual([16, 75, 25, 0]);
  });

  test('advanced overrides take precedence and can leave the normal goal unmet', () => {
    const base = createPlanFactionState('tech');
    const state = {
      ...base,
      intent: { kind: 'population' as const, tier: 3, count: editable(2500) },
      overrides: [null, null, editable(2000)],
    };
    expect(resolvePopulationTarget('tech', state, 0, [0, 0, 0])).toMatchObject({
      achieved: 2500,
      targetMetAfterOverrides: false,
      effectivePopulations: [560, 3510, 2000],
    });
  });

  test('returns null for invalid inputs instead of NaN', () => {
    const state = {
      ...createPlanFactionState('eco'),
      intent: { kind: 'population' as const, tier: 4, count: { raw: 'x', value: null } },
    };
    expect(resolvePopulationTarget('eco', state, 0, [0, 0, 0, 0])).toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test and verify the missing API failure**

Run: `pnpm vitest run src/calculations/population-target.test.ts`

Expected: FAIL because `population-target.ts`, `TargetIntent`, and `createPlanFactionState` do not exist.

- [ ] **Step 3: Split plan and island faction state**

Replace the shared faction type and constructors in `src/model.ts` with:

```ts
export type PopulationSettings = {
  livingSpace: boolean;
  senate: boolean;
  overrides: PopulationOverride[];
};

export type ResidenceFactionState = PopulationSettings & {
  houses: EditableNumber;
  maxTier: number;
};

export type TargetIntent =
  | Readonly<{ kind: 'follow' }>
  | Readonly<{ kind: 'residences'; houses: EditableNumber; maxTier: number }>
  | Readonly<{ kind: 'population'; tier: number; count: EditableNumber }>;

export type PlanFactionState = PopulationSettings & { intent: TargetIntent };

export type CalculatorState = {
  factions: Record<Faction, PlanFactionState>;
  productivity: Record<string, EditableNumber>;
  recycling: boolean;
  wholeBuildings: boolean;
};

function populationSettings(faction: Faction): PopulationSettings {
  return {
    livingSpace: false,
    senate: false,
    overrides: Array.from({ length: FACTION_CONFIGS[faction].tierLabels.length }, () => null),
  };
}

export function createResidenceFactionState(faction: Faction): ResidenceFactionState {
  return { ...populationSettings(faction), houses: { raw: '0', value: 0 }, maxTier: FACTION_CONFIGS[faction].tierLabels.length };
}

export function createPlanFactionState(faction: Faction): PlanFactionState {
  return { ...populationSettings(faction), intent: { kind: 'follow' } };
}
```

Update `createInitialState()` to call `createPlanFactionState`. Keep `effectivePopulation` only for `ResidenceFactionState`, using its concrete `houses.value`; delete `resolveHouses` and `effectivePopulations`. In `src/island.ts`, define `IslandFactionState = ResidenceFactionState & { recyclingCoverage: boolean }` and construct it with `createResidenceFactionState`.

- [ ] **Step 4: Implement the target resolver with lower-bound search**

Create `src/calculations/population-target.ts`:

```ts
import type { Faction } from './population';
import { applyPopulationOverrides, calculatePopulation, tierCapacities } from './population';
import type { PlanFactionState, TargetIntent } from '../model';

export type ResolvedPopulationTarget = Readonly<{
  intent: TargetIntent;
  houses: number;
  maxTier: number;
  normalPopulations: readonly number[];
  effectivePopulations: readonly number[];
  requested: number | null;
  achieved: number;
  overshoot: number;
  targetMetAfterOverrides: boolean;
}>;

function calculate(faction: Faction, state: PlanFactionState, houses: number, maxTier: number): number[] {
  return calculatePopulation({ faction, houses, maxTier, livingSpace: state.livingSpace, senate: state.senate });
}

function applyOverrides(
  faction: Faction,
  state: PlanFactionState,
  houses: number,
  maxTier: number,
): number[] | null {
  const overrides = state.overrides.map((entry) => entry?.value ?? null);
  if (state.overrides.some((entry) => entry !== null && entry.value === null)) return null;
  return applyPopulationOverrides(
    { faction, houses, maxTier, livingSpace: state.livingSpace, senate: state.senate },
    overrides,
  );
}

function minimumHouses(faction: Faction, state: PlanFactionState, tier: number, requested: number): number | null {
  if (requested === 0) return 0;
  const capacity = Math.max(...tierCapacities(faction, state.livingSpace));
  const safeLimit = Math.floor(Number.MAX_SAFE_INTEGER / capacity);
  const at = (houses: number) => calculate(faction, state, houses, tier)[tier - 1];
  let high = 1;
  while (high < safeLimit && at(high) < requested) high = Math.min(safeLimit, high * 2);
  if (!Number.isSafeInteger(at(high)) || at(high) < requested) return null;
  let low = 0;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (at(middle) >= requested) high = middle;
    else low = middle + 1;
  }
  return low;
}

export function resolvePopulationTarget(
  faction: Faction,
  state: PlanFactionState,
  islandHouses: number | null,
  islandPopulations: readonly number[] | null,
): ResolvedPopulationTarget | null {
  if (state.intent.kind === 'follow') {
    if (islandHouses === null || islandPopulations === null) return null;
    const effective = islandPopulations.map((value, tier) => state.overrides[tier]?.value ?? value);
    if (effective.some((value) => value === null)) return null;
    const maxTier = Math.max(1, islandPopulations.reduce((top, value, tier) => value > 0 ? tier + 1 : top, 1));
    return { intent: state.intent, houses: islandHouses, maxTier, normalPopulations: islandPopulations, effectivePopulations: effective, requested: null, achieved: effective[maxTier - 1], overshoot: 0, targetMetAfterOverrides: true };
  }
  const maxTier = state.intent.kind === 'residences' ? state.intent.maxTier : state.intent.tier;
  const rawHouses = state.intent.kind === 'residences'
    ? state.intent.houses.value
    : state.intent.count.value === null ? null : minimumHouses(faction, state, maxTier, state.intent.count.value);
  if (rawHouses === null) return null;
  const normal = calculate(faction, state, rawHouses, maxTier);
  const effective = applyOverrides(faction, state, rawHouses, maxTier);
  if (effective === null || normal.some((value) => !Number.isSafeInteger(value))) return null;
  const requested = state.intent.kind === 'population' ? state.intent.count.value : null;
  const achieved = normal[maxTier - 1];
  return {
    intent: state.intent,
    houses: rawHouses,
    maxTier,
    normalPopulations: normal,
    effectivePopulations: effective,
    requested,
    achieved,
    overshoot: requested === null ? 0 : achieved - requested,
    targetMetAfterOverrides: requested === null || effective[maxTier - 1] >= requested,
  };
}
```

- [ ] **Step 5: Update constructor tests and run the target/model suite**

Replace `resolveHouses` tests in `src/model.test.ts` with assertions that plan factions default to `follow`, residence factions always have concrete houses, and invalid integer parsing remains unchanged.

Run: `pnpm vitest run src/model.test.ts src/calculations/population.test.ts src/calculations/population-target.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the state split and resolver**

```bash
git add src/model.ts src/model.test.ts src/island.ts src/calculations/population-target.ts src/calculations/population-target.test.ts
git commit -m "feat: resolve residence and population growth targets"
```

### Task 2: Migrate persisted plans to storage v3

**Files:**
- Modify: `src/storage.ts`
- Modify: `src/storage.test.ts`

- [ ] **Step 1: Replace implicit v2 fixtures and add failing migration tests**

In `src/storage.test.ts`, make the legacy plan payload explicit and add these assertions:

```ts
test('migrates v2 follow and manual houses into target intents', () => {
  const payload = validV2Payload();
  payload.plan.factions.eco.houses = null;
  payload.plan.factions.tech.houses = { raw: '120', value: 120 };
  payload.plan.factions.tech.maxTier = 2;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  const loaded = loadAppState();
  expect(loaded.storable).toBe(true);
  expect(loaded.state.plan.factions.eco.intent).toEqual({ kind: 'follow' });
  expect(loaded.state.plan.factions.tech.intent).toEqual({
    kind: 'residences', houses: { raw: '120', value: 120 }, maxTier: 2,
  });
});

test('round-trips a v3 population target without derived fields', () => {
  const state = createInitialAppState();
  state.plan.factions.tech.intent = {
    kind: 'population', tier: 3, count: { raw: '2500', value: 2500 },
  };
  saveAppState(state);
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(stored.version).toBe(3);
  expect(stored.plan.factions.tech.intent).toEqual(state.plan.factions.tech.intent);
  expect(JSON.stringify(stored)).not.toMatch(/normalPopulations|effectivePopulations|achieved/);
  expect(loadAppState()).toEqual({ state, storable: true });
});

test('preserves malformed v3 intent payloads until a user change', () => {
  const payload = validV3Payload();
  payload.plan.factions.tech.intent = { kind: 'population', tier: 4, count: { raw: 'x', value: 2 } };
  const raw = JSON.stringify(payload);
  localStorage.setItem(STORAGE_KEY, raw);
  expect(loadAppState().storable).toBe(false);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
});
```

- [ ] **Step 2: Run storage tests and verify v2-only failure**

Run: `pnpm vitest run src/storage.test.ts`

Expected: FAIL because saved payloads still use version 2 and plan sanitization expects legacy `houses`.

- [ ] **Step 3: Implement explicit legacy migration and v3 sanitization**

In `src/storage.ts`, keep the existing `Loss`, editable-number, sparse-map, and island sanitizers. Split faction handling into:

```ts
type LegacyFactionState = {
  houses: EditableNumber | null;
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
  overrides: PopulationOverride[];
};

function migrateLegacyPlanFaction(value: unknown, faction: Faction, loss: Loss): PlanFactionState {
  const legacy = sanitizeLegacyFactionState(value, faction, loss);
  return {
    intent: legacy.houses === null
      ? { kind: 'follow' }
      : { kind: 'residences', houses: legacy.houses, maxTier: legacy.maxTier },
    livingSpace: legacy.livingSpace,
    senate: legacy.senate,
    overrides: legacy.overrides,
  };
}

function sanitizeTargetIntent(value: unknown, faction: Faction, loss: Loss): TargetIntent {
  if (!isRecord(value) || !['follow', 'residences', 'population'].includes(String(value.kind))) {
    loss.markUnless(false);
    return { kind: 'follow' };
  }
  const tierCount = FACTION_CONFIGS[faction].tierLabels.length;
  if (value.kind === 'follow') return { kind: 'follow' };
  const tierKey = value.kind === 'residences' ? 'maxTier' : 'tier';
  const tier = loss.markUnless(Number.isInteger(value[tierKey]) && Number(value[tierKey]) >= 1 && Number(value[tierKey]) <= tierCount)
    ? Number(value[tierKey]) : tierCount;
  const entryKey = value.kind === 'residences' ? 'houses' : 'count';
  const entry = sanitizeEntry(value[entryKey], parseNonNegativeInteger, loss);
  if (entry === null) return { kind: 'follow' };
  return value.kind === 'residences'
    ? { kind: 'residences', houses: entry, maxTier: tier }
    : { kind: 'population', count: entry, tier };
}
```

Use legacy plan sanitization for versions 1 and 2, v3 intent sanitization for version 3, and the concrete residence sanitizer for islands in every version. Change `saveAppState` to write `{ version: 3, plan, islands }`.

- [ ] **Step 4: Run storage tests**

Run: `pnpm vitest run src/storage.test.ts`

Expected: PASS. App integration is migrated and verified with the Growth editor in Task 7.

- [ ] **Step 5: Commit storage v3**

```bash
git add src/storage.ts src/storage.test.ts
git commit -m "feat: migrate growth targets to storage v3"
```

### Task 3: Make Islands actual-only and share owned-building stepping

**Files:**
- Modify: `src/island.ts`
- Modify: `src/island.test.ts`
- Modify: `src/components/IslandsSection.tsx`
- Modify: `src/App.islands.test.tsx`

- [ ] **Step 1: Write failing helper and suggestion-separation tests**

Add to `src/island.test.ts`:

```ts
test('steps sparse owned counts immutably and clamps at zero', () => {
  const island = createIsland('Walbruck');
  const one = stepOwnedBuilding(island, 'fishery', 1);
  expect(one).not.toBe(island);
  expect(one.owned.fishery).toEqual({ raw: '1', value: 1 });
  expect(stepOwnedBuilding(one, 'fishery', -2).owned.fishery).toEqual({ raw: '0', value: 0 });
});
```

Update the existing App suggestion test to seed actual island population and assert the reason contains `current full demand` and not `plan`. The Growth-only separation workflow is added after Growth exists in Task 8.

- [ ] **Step 2: Run the focused tests and verify failures**

Run: `pnpm vitest run src/island.test.ts src/App.islands.test.tsx`

Expected: FAIL because `stepOwnedBuilding` is missing and Islands still appends plan gaps.

- [ ] **Step 3: Add the shared step helper**

Add to `src/island.ts`:

```ts
export function stepOwnedBuilding(island: IslandState, buildingId: BuildingId, delta: number): IslandState {
  const value = Math.max(0, (island.owned[buildingId]?.value ?? 0) + delta);
  return {
    ...island,
    owned: { ...island.owned, [buildingId]: { raw: String(value), value } },
  };
}
```

Use it for the island ledger add-list, suggestion buttons, and ± steppers.

- [ ] **Step 4: Remove target plumbing and Plan language from Islands**

In `IslandsSection.tsx`:

- remove `planRequirements`, `planRequirementByBuilding`, and the global plan branch of `buildSuggestions`;
- change the suggestion reason to `current full demand ${formatRequirement(-balance.balance)} short`;
- remove the Plan table column/cells and adjust divider column spans;
- keep local deficit filtering, empire-import filtering, buildability, and canonical/alternative producer selection unchanged;
- change surrounding copy from “plan” to actual/current-full-demand wording.

- [ ] **Step 5: Run Island tests and commit**

Run: `pnpm vitest run src/island.test.ts src/App.islands.test.tsx`

Expected: PASS after temporary App compile adjustments required by the new prop shape.

```bash
git add src/island.ts src/island.test.ts src/components/IslandsSection.tsx src/App.islands.test.tsx src/App.tsx
git commit -m "refactor: keep island suggestions actual-only"
```

### Task 4: Add workspace tabs and make Production current-demand-only

**Files:**
- Create: `src/App.navigation.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/CoverageSection.tsx`
- Modify: `src/components/ProductionSection.tsx`
- Modify: `src/App.coverage.test.tsx`
- Modify: `src/App.actuals.test.tsx`
- Modify: `src/App.production-controls.test.tsx`
- Modify: `src/App.production-invalid.test.tsx`
- Modify: `src/App.production-structure.test.tsx`
- Modify: `src/test/app-test-utils.tsx`

- [ ] **Step 1: Add failing accessible-navigation tests**

Create `src/App.navigation.test.tsx`:

```tsx
import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { renderApp } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('switches three workspaces with keyboard-accessible tabs', () => {
  renderApp();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map((tab) => tab.textContent)).toEqual(['Islands', 'Production', 'Growth']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(document.querySelector('[role="tabpanel"]:not([hidden])')).toHaveAttribute('id', 'workspace-production');
});

test('keeps the residence overview visible while workspace content changes', () => {
  renderApp();
  const overview = document.querySelector('.population-section');
  fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((tab) => tab.textContent === 'Production')!);
  expect(document.querySelector('.population-section')).toBe(overview);
});
```

Add `selectWorkspace(name)` to `src/test/app-test-utils.tsx`, locating the tab by role/text and clicking it.

- [ ] **Step 2: Run navigation and production tests to establish the red state**

Run: `pnpm vitest run src/App.navigation.test.tsx src/App.coverage.test.tsx src/App.actuals.test.tsx`

Expected: FAIL because all sections still render linearly and Coverage retains a plan frame.

- [ ] **Step 3: Add local accessible tab state in App**

In `App.tsx`, add:

```ts
type Workspace = 'islands' | 'production' | 'growth';
const WORKSPACES: readonly Workspace[] = ['islands', 'production', 'growth'];
const [workspace, setWorkspace] = useState<Workspace>('islands');
const selectWorkspace = (next: Workspace) => setWorkspace(next);
const onTabKeyDown = (event: React.KeyboardEvent, current: Workspace) => {
  const index = WORKSPACES.indexOf(current);
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? WORKSPACES.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % WORKSPACES.length
        : event.key === 'ArrowLeft' ? (index - 1 + WORKSPACES.length) % WORKSPACES.length
          : null;
  if (next === null) return;
  event.preventDefault();
  selectWorkspace(WORKSPACES[next]);
  requestAnimationFrame(() => document.getElementById(`tab-${WORKSPACES[next]}`)?.focus());
};
```

Render a `role="tablist"` and three labeled tabpanels. Keep panel elements mounted but conditionally render only the active panel's component content. Islands is initial and tab selection is not persisted.

- [ ] **Step 4: Derive current full demand only from actual population**

Replace the ambiguous App `population`/`production` derivation with:

```ts
const actualHouses = sumIslandHouses(state.islands);
const actualPopulations = sumIslandPopulations(state.islands);
const productivity = Object.fromEntries(Object.entries(state.plan.productivity).map(([id, entry]) => [id, entry.value]));
const currentFullDemand = calculateAvailableProduction({
  population: actualPopulations,
  productivity,
  recycling: state.plan.recycling,
  wholeBuildings: state.plan.wholeBuildings,
});
const currentDemandOperatingImpacts = calculateOperatingImpacts(currentFullDemand);
```

Pass no target requirements to Islands. Render Coverage and Production together in the Production panel.

- [ ] **Step 5: Delete the Coverage plan frame and generic Production plan gaps**

Reduce `CoverageSection` to `{ islands }`, rename its internal view to `currentDemandView`, and remove `planCards`, frame state/buttons, and “Toward plan.” Update copy to say `current full demand`.

In `ProductionSection`, rename `results` to `currentFullDemand`, remove `planRequirementByGood`, `planByGood`, `buildGap`, and all `plan covered/build/over` output. Label requirement and impact rows `Current full demand` and `Actual`. Keep productivity, recycling, rounding, owned capacity, balances, transfers, and operating impacts.

- [ ] **Step 6: Update production tests to seed actuals and select Production**

Use `setIslandHouses` for actual demand and `selectWorkspace('Production')` before querying production/coverage. Replace assertions containing generic `plan` or `needed` with `current full demand`. Keep numerical expectations unchanged where actual population matches the old manual input.

- [ ] **Step 7: Run the workspace/current-demand suite and commit**

Run:

```bash
pnpm vitest run src/App.navigation.test.tsx src/App.coverage.test.tsx src/App.actuals.test.tsx \
  src/App.production-controls.test.tsx src/App.production-invalid.test.tsx src/App.production-structure.test.tsx
```

Expected: PASS.

```bash
git add src/App.tsx src/components/CoverageSection.tsx src/components/ProductionSection.tsx \
  src/test/app-test-utils.tsx src/App.navigation.test.tsx src/App.coverage.test.tsx src/App.actuals.test.tsx \
  src/App.production-controls.test.tsx src/App.production-invalid.test.tsx src/App.production-structure.test.tsx
git commit -m "feat: split actuals and production into workspaces"
```

### Task 5: Replace the global editor with the population overview

**Files:**
- Create: `src/App.population-overview.test.tsx`
- Modify: `src/calculations/coverage.ts`
- Modify: `src/calculations/coverage.test.ts`
- Modify: `src/components/PopulationSection.tsx`
- Modify: `src/components/PopulationFaction.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add failing reusable-headroom and overview tests**

Add a calculation test for `factionTopTierHeadroom(islands, faction)` returning actual top tier, additional supported residents, house equivalent, and limiting good. Create an App test asserting the permanent overview has `Actual`, `Target`, and `Headroom / limit` headings, has no inputs/buttons, and stays visible after selecting every workspace.

- [ ] **Step 2: Run tests and verify missing overview behavior**

Run: `pnpm vitest run src/calculations/coverage.test.ts src/App.population-overview.test.tsx`

Expected: FAIL because the helper does not exist and PopulationSection remains editable.

- [ ] **Step 3: Extract faction headroom from CoverageSection**

Move the existing top-tier calculation into `src/calculations/coverage.ts`:

```ts
export type FactionHeadroom = Readonly<{
  faction: Faction;
  tier: number;
  additional: number;
  houses: number;
  limitingGood: GoodId;
}>;

export function factionTopTierHeadroom(islands: readonly IslandState[], faction: Faction): FactionHeadroom | null {
  const population = sumIslandPopulations(islands)[faction];
  if (population === null) return null;
  const tier = population.reduce((top, value, index) => value > 0 ? index : top, -1);
  if (tier < 0) return null;
  const headroom = tierHeadroom(islands, faction, tier);
  if (headroom === null) return null;
  const perHouse = tierCapacities(faction, islands[0]?.factions[faction].livingSpace ?? false)[tier];
  return {
    faction,
    tier,
    additional: Math.floor(headroom.additional + BALANCE_EPSILON),
    houses: Math.floor(headroom.additional / perHouse + BALANCE_EPSILON),
    limitingGood: headroom.limitingGood,
  };
}
```

Use this helper from both CoverageSection and the overview.

- [ ] **Step 4: Render a read-only overview**

Change `PopulationSection` props to:

```ts
type PopulationSectionProps = {
  actualHouses: FactionHouses;
  actualPopulations: Record<Faction, readonly number[] | null>;
  targets: Record<Faction, ResolvedPopulationTarget | null>;
  islands: readonly IslandState[];
};
```

Render faction cards with separate Actual, Target, and Headroom / limit columns. A follow target naturally repeats actual values. Use `—` for invalid/unavailable data and `BUILDINGS[limitingGood].label` for exhausted limits. Remove every target input, bonus, tier, and override callback from this component.

Repurpose `PopulationFaction` as the island-only editor: concrete houses, tier cap, tier overrides; remove `variant`, follow/manual mode, and plan bonus branches.

- [ ] **Step 5: Run overview/island tests and commit**

Run: `pnpm vitest run src/calculations/coverage.test.ts src/App.population-overview.test.tsx src/App.islands.test.tsx`

Expected: PASS.

```bash
git add src/calculations/coverage.ts src/calculations/coverage.test.ts src/components/PopulationSection.tsx \
  src/components/PopulationFaction.tsx src/App.tsx src/App.population-overview.test.tsx src/App.islands.test.tsx
git commit -m "feat: show actual target and headroom overview"
```

### Task 6: Derive cumulative full-supply milestones

**Files:**
- Create: `src/calculations/planning.ts`
- Create: `src/calculations/planning.test.ts`

- [ ] **Step 1: Write failing milestone tests**

Create `planning.test.ts` with these pinned invariants:

```ts
test('emits a tier-one expansion with canonical full-demand gaps', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = {
    kind: 'residences', houses: editable(10), maxTier: 1,
  };
  const result = calculateGrowthPlanning(state.plan, state.islands);
  expect(result?.milestones).toHaveLength(1);
  expect(result?.milestones[0]).toMatchObject({ kind: 'expand', faction: 'eco', tier: 1, current: true });
  expect(result?.milestones[0].gaps.find((gap) => gap.goodId === 'fish')?.required).toBeCloseTo(80 / 250);
});

test('carries shared Fish demand cumulatively across factions', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
  state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
  const milestones = calculateGrowthPlanning(state.plan, [])!.milestones;
  expect(milestones[0].gaps.find((gap) => gap.goodId === 'fish')?.required).toBeCloseTo(0.32);
  expect(milestones[1].gaps.find((gap) => gap.goodId === 'fish')?.required).toBeCloseTo(0.64);
});

test('masks overrides above an earlier ascension checkpoint', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 4 };
  state.plan.factions.eco.overrides[3] = editable(800);
  const milestones = calculateGrowthPlanning(state.plan, [])!.milestones;
  expect(milestones.find((step) => step.tier === 2)?.populationAfter.eco[3]).toBe(0);
});

test('orders inputs before their consuming producer and advances after actuals catch up', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };
  const first = calculateGrowthPlanning(state.plan, [])!;
  const employeeStep = first.milestones.find((step) => step.tier === 2)!;
  expect(employeeStep.gaps.findIndex((gap) => gap.goodId === 'rice'))
    .toBeLessThan(employeeStep.gaps.findIndex((gap) => gap.goodId === 'healthFood'));
});

test('returns null for invalid targets or actual capacity', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: { raw: 'x', value: null }, maxTier: 2 };
  expect(calculateGrowthPlanning(state.plan, [])).toBeNull();
});
```

Use actual IDs from `BUILDINGS`/`producedGood` when implementing the test; do not invent aliases if the canonical good IDs differ.

- [ ] **Step 2: Run tests and verify missing planning module**

Run: `pnpm vitest run src/calculations/planning.test.ts`

Expected: FAIL because `calculateGrowthPlanning` does not exist.

- [ ] **Step 3: Implement typed checkpoint and gap shapes**

Create `src/calculations/planning.ts` with:

```ts
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
  targets: Record<Faction, ResolvedPopulationTarget>;
  milestones: readonly GrowthMilestone[];
}>;
```

- [ ] **Step 4: Implement cumulative checkpoints and canonical normalization**

Implementation requirements:

1. Resolve all three targets from plan plus `sumIslandHouses/Populations`; return null if any target is unavailable.
2. Build expand/ascend descriptors from actual top tiers to resolved target tiers; omit descriptors whose truncated population equals the preceding state.
3. Sort descriptors by one-based tier, then `FACTIONS` order, with expansion before ascension for the same faction/tier.
4. Carry one cumulative population record forward. Earlier descriptors remain applied; later factions remain actual.
5. Mask overrides above the active tier before calculating the active truncated target.
6. Call `calculateAvailableProduction` with every production node at 100%, `wholeBuildings:false`, and the plan recycling choice.
7. Normalize only canonical occurrences (`producedGood(node.buildingId) === node.buildingId`) into `Map<GoodId, number>`, aggregating before any display rounding and returning null if any occurrence is null.
8. Compare with `effectiveCapacities`; missing means zero, null makes the entire result unavailable.
9. Sort remaining positive gaps by recursively calculated canonical `CONSUMPTION` depth descending (inputs first), then production catalog order.
10. Mark every zero-gap milestone complete and only the first incomplete milestone current.

- [ ] **Step 5: Add capacity/alternative and completion regression tests**

Add fixtures where an alternative producer and non-100% island productivity reduce the canonical gap by `producer.rate × productivity/100`, and where applying enough actual capacity completes the first milestone and moves `current` to the next one.

- [ ] **Step 6: Run the planning suite and commit**

Run: `pnpm vitest run src/calculations/planning.test.ts src/calculations/supported-population.test.ts src/calculations/goods.test.ts`

Expected: PASS.

```bash
git add src/calculations/planning.ts src/calculations/planning.test.ts
git commit -m "feat: derive cumulative growth milestones"
```

### Task 7: Add the Growth target editor

**Files:**
- Create: `src/components/GrowthSection.tsx`
- Create: `src/components/GrowthTargetFaction.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.population.test.tsx`
- Modify: `src/App.population-overrides.test.tsx`
- Modify: `src/App.storage.test.tsx`
- Modify: `src/test/app-test-utils.tsx`

- [ ] **Step 1: Add failing Growth target interaction tests**

Add helpers:

```ts
export function selectWorkspace(name: 'Islands' | 'Production' | 'Growth'): void {
  fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((tab) => tab.textContent === name)!);
}

export async function setGrowthResidenceTarget(faction: Faction, houses: string, tier: number): Promise<void> {
  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel(`Plan ${FACTION_CONFIGS[faction].label} by residences`));
  await replaceInput(input(`growth-${faction}-houses`), houses);
  fireEvent.click(buttonWithLabel(`${FACTION_CONFIGS[faction].label} ${FACTION_CONFIGS[faction].tierLabels[tier - 1]}`));
}
```

Test Follow islands, residence ±10 clamping, population target `2500 → 279`, bonus recomputation, requested/achieved overshoot, advanced override precedence/warning, and persistence after reload.

- [ ] **Step 2: Run target UI tests and verify Growth is empty**

Run: `pnpm vitest run src/App.population.test.tsx src/App.population-overrides.test.tsx src/App.storage.test.tsx`

Expected: FAIL because Growth target controls are not rendered.

- [ ] **Step 3: Implement the faction target editor**

Create `GrowthTargetFaction.tsx` using a native `<details>` card. It must:

- show the active intent/resolved target in `<summary>`;
- expose mutually exclusive Follow islands, By residences, and By population buttons with `aria-pressed`;
- render residence houses + ±10 + tier cap only for `residences`;
- render tier + minimum count only for `population`;
- show derived houses and normal populations read-only;
- show requested, achieved, and overshoot separately;
- keep bonuses and Advanced overrides inside Growth;
- show an explicit warning when `targetMetAfterOverrides` is false;
- never store derived values.

Use `NumericInput`, `parseNonNegativeInteger`, `FACTION_CONFIGS`, and existing accessible tier-button patterns rather than adding a form library.

- [ ] **Step 4: Compose target cards in GrowthSection and wire App updates**

`GrowthSection` initially accepts target/state props and renders the three faction editors. App's plan updater changes `PlanFactionState`; bonus updates continue mirroring `livingSpace`/`senate` to every island faction so actual and target calculations use consistent global bonuses.

- [ ] **Step 5: Run target, storage, and overview tests and commit**

Run:

```bash
pnpm vitest run src/App.population.test.tsx src/App.population-overrides.test.tsx \
  src/App.storage.test.tsx src/App.population-overview.test.tsx
```

Expected: PASS.

```bash
git add src/components/GrowthSection.tsx src/components/GrowthTargetFaction.tsx src/App.tsx \
  src/test/app-test-utils.tsx src/App.population.test.tsx src/App.population-overrides.test.tsx src/App.storage.test.tsx
git commit -m "feat: edit population targets in Growth"
```

### Task 8: Render milestones and apply concrete producers

**Files:**
- Create: `src/components/GrowthMilestones.tsx`
- Create: `src/App.growth.test.tsx`
- Modify: `src/components/GrowthSection.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing Growth workflow test**

Create `src/App.growth.test.tsx` covering:

```tsx
test('applies a concrete buildable producer and shrinks the current full-demand gap', async () => {
  renderApp();
  addIsland();
  await setGrowthResidenceTarget('eco', '10', 1);

  const milestone = byTestId('growth-milestone-eco-1-expand');
  const before = byTestId('growth-gap-fishery').textContent;
  fireEvent.click(buttonWithLabel('Build one Fishery on Island 1', milestone));

  selectWorkspace('Islands');
  expect(input('island-0-owned-fishery')).toHaveValue('1');
  selectWorkspace('Growth');
  expect(byTestId('growth-gap-fishery').textContent).not.toBe(before);
});
```

Also assert a Growth-only target does not create an Islands suggestion, complete milestones collapse, the first incomplete is current, future milestones are muted, an underwater alternative action names the recycler rather than chip factory, and no settled islands still shows gaps without buttons.

- [ ] **Step 2: Run the Growth test and verify missing milestone UI**

Run: `pnpm vitest run src/App.growth.test.tsx`

Expected: FAIL because milestones and producer actions are not rendered.

- [ ] **Step 3: Implement GrowthMilestones**

For every gap, iterate `GOODS.get(gap.goodId)?.producers`, then settled islands passing `canBuildOn`. Suppress an action when `islandProductivity` is null. Display:

```ts
const contribution = producer.rate * (islandProductivity(island, producer.buildingId)! / 100);
const impact = BUILDINGS[producer.buildingId].operatingImpact;
```

Render accessible buttons labeled `Build one ${building.label} on ${island.name}`, visible text `+1 ${building.label} on ${island.name}`, canonical contribution, and `OperatingImpactValues`. Use `remaining` as canonical full-demand capacity; do not render `built X of N`, a milestone total cost, or “necessary.”

- [ ] **Step 4: Wire derived planning and the shared apply action in App**

Derive `planning = calculateGrowthPlanning(state.plan, state.islands)`. Pass it to Growth. Apply with:

```ts
const applyBuilding = (islandId: string, buildingId: BuildingId) => update((current) => ({
  ...current,
  islands: current.islands.map((island) => island.id === islandId
    ? stepOwnedBuilding(island, buildingId, 1)
    : island),
}));
```

- [ ] **Step 5: Run Growth and actual-state regression tests and commit**

Run: `pnpm vitest run src/App.growth.test.tsx src/App.islands.test.tsx src/App.actuals.test.tsx`

Expected: PASS.

```bash
git add src/components/GrowthMilestones.tsx src/components/GrowthSection.tsx src/App.tsx src/App.growth.test.tsx
git commit -m "feat: apply growth milestones to island actuals"
```

### Task 9: Finish styles, guidance, and whole-project verification

**Files:**
- Modify: `src/styles.css`
- Modify: `README.md`
- Modify: `src/styles.test.ts` only if an existing invariant intentionally changes
- Modify: any remaining App tests that still use old plan controls or wording

- [ ] **Step 1: Add focused workspace and Growth styles**

Add rules for `.workspace-tabs`, tab selected/focus states, `.workspace-panel`, population overview columns, `.growth-targets`, `.growth-target`, `.growth-milestones`, milestone complete/current/future states, `.growth-gap`, and `.growth-producer-action`. Reuse existing faction colors, section shell, inputs, tier buttons, and operating-impact styles. Remove obsolete Coverage frame styles. Preserve horizontal scrolling for the wide production trees and the existing narrow-screen `main` behavior.

- [ ] **Step 2: Update guidance and roadmap language**

Update README current functionality to include:

- actual/target/headroom residence overview;
- Islands, Production, and Growth workspaces;
- residence- and population-driven targets;
- cumulative full-supply milestones and producer-specific island actions;
- storage v3 migration.

Remove the completed step-wise-planning roadmap item. Retain exact partial satisfaction, retention/ascension minimums, taxation, and population-threshold unlocks as future work, using the vocabulary in `docs/research/2026-08-31-needs-ascension-language.md`.

- [ ] **Step 3: Search for stale semantics and fix each real UI occurrence**

Run:

```bash
rg -n "Toward plan|plan covered|plan \+|needed by|build gap|Manual plan|Following islands" src README.md
```

Expected: no stale generic-plan copy. Type/property names inside storage migration fixtures may retain `houses` and comments may name the legacy plan; do not rewrite historical schema facts.

- [ ] **Step 4: Run the entire automated suite**

Run: `pnpm test`

Expected: all Vitest suites PASS with no skipped/todo tests.

- [ ] **Step 5: Run static verification**

Run:

```bash
pnpm build
pnpm lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Perform a focused diff review**

Run:

```bash
git diff --check
git status --short
```

Confirm only intended feature files and the user's pre-existing untracked `AGENTS.md` remain. Run the repository-required foreground peer review:

```bash
git diff --cached | peer-review --mode diff-review --cd /home/pars/Coding/anno2070_calculator \
  "Review Growth planning for target/actual separation, cumulative capacity correctness, storage migration, accessible tabs, and vocabulary."
```

Classify every finding as changed decision, added verification, unique defect fixed, rejected false positive with reason, or no impact.

- [ ] **Step 7: Commit the polish and documentation**

```bash
git add src/styles.css README.md src/styles.test.ts
git commit -m "feat: finish Growth planning workspace"
```

- [ ] **Step 8: Re-run verification on the committed tree**

Run: `pnpm test && pnpm build && pnpm lint && git status --short --branch`

Expected: tests/build/lint PASS; branch is `main`; only the pre-existing untracked `AGENTS.md` is reported.
