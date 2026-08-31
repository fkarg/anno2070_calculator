# Follow Modes and Global Population Bonuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-faction Mirror/Unrestricted Follow modes, hide redundant mirrored targets, and move faction-global population bonuses into the permanent residence overview.

**Architecture:** Extend the existing target-intent discriminator rather than snapshotting derived island values. Target resolution remains the single source of projected populations, while the overview chooses its column layout from the resolved intent and owns the existing global bonus update callback. Growth planning treats only Mirror as a zero-delta target.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, CSS, localStorage v4 migration.

**Dependency:** Implement this plan before `2026-08-31-demand-deferral.md`; that plan extends the same v4 persisted plan shape.

---

### Task 1: Persist an explicit Follow tier mode

**Files:**
- Modify: `src/model.ts` (`TargetIntent`, `createPlanFactionState`)
- Modify: `src/storage.ts` (`sanitizeTargetIntent`, version branches, `saveAppState`)
- Test: `src/model.test.ts`
- Test: `src/storage.test.ts`

- [ ] **Step 1: Write failing model and storage tests**

Add assertions that defaults and every legacy follow migration produce the explicit mode, while v4 round-trips both modes:

```ts
expect(createPlanFactionState('eco').intent).toEqual({
  kind: 'follow', tierMode: 'mirror',
});

test('migrates v3 follow intents to explicit mirror mode', () => {
  const state = createInitialAppState();
  const legacy = JSON.parse(JSON.stringify(state));
  legacy.plan.factions.eco.intent = { kind: 'follow' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, ...legacy }));

  expect(loadAppState()).toMatchObject({
    storable: true,
    state: { plan: { factions: { eco: { intent: { kind: 'follow', tierMode: 'mirror' } } } } },
  });
});

test('round-trips unrestricted follow mode in version 4', () => {
  const state = createInitialAppState();
  state.plan.factions.tech.intent = { kind: 'follow', tierMode: 'unrestricted' };

  saveAppState(state);

  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4);
  expect(loadAppState()).toEqual({ state, storable: true });
});
```

Update every existing expected follow intent in `src/model.test.ts` and `src/storage.test.ts` to include `tierMode: 'mirror'`; these are positive migration assertions, not absence tests.

- [ ] **Step 2: Run the focused tests and verify the new expectations fail**

Run:

```bash
npm test -- src/model.test.ts src/storage.test.ts
```

Expected: FAIL because follow intents lack `tierMode` and saved payloads still use version 3.

- [ ] **Step 3: Extend the state and sanitizer**

Use this discriminator in `src/model.ts`:

```ts
export type FollowTierMode = 'mirror' | 'unrestricted';

export type TargetIntent =
  | Readonly<{ kind: 'follow'; tierMode: FollowTierMode }>
  | Readonly<{ kind: 'residences'; houses: EditableNumber; maxTier: number }>
  | Readonly<{ kind: 'population'; tier: number; count: EditableNumber }>;

export function createPlanFactionState(faction: Faction): PlanFactionState {
  const { livingSpace, senate, overrides } = createFactionState(faction);
  return { intent: { kind: 'follow', tierMode: 'mirror' }, livingSpace, senate, overrides };
}
```

Make every legacy fallback and migration return Mirror. In `sanitizeTargetIntent`, accept a valid v4 mode and default missing v3 data without marking the payload lossy:

```ts
if (value.kind === 'follow') {
  return {
    kind: 'follow',
    tierMode: value.tierMode === 'unrestricted' ? 'unrestricted' : 'mirror',
  };
}
```

Load versions 1–3 through the existing migrations and the new default. Add a version 4 branch using the current plan/island sanitizers, and save `{ version: 4, plan, islands }`.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npm test -- src/model.test.ts src/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the state migration**

```bash
git add src/model.ts src/model.test.ts src/storage.ts src/storage.test.ts
git commit -m "feat: persist follow target modes"
```

### Task 2: Resolve Mirror and Unrestricted targets

**Files:**
- Modify: `src/calculations/population-target.ts` (`resolvePopulationTarget`)
- Test: `src/calculations/population-target.test.ts`

- [ ] **Step 1: Write failing target-resolution tests**

Retain the existing Mirror test and add explicit mode coverage:

```ts
test('projects followed houses through the full Tech ladder when unrestricted', () => {
  const state = {
    ...createPlanFactionState('tech'),
    intent: { kind: 'follow' as const, tierMode: 'unrestricted' as const },
  };

  const result = resolvePopulationTarget('tech', state, 100, [200, 900, 0]);

  expect(result).toMatchObject({ houses: 100, maxTier: 3 });
  expect(result?.normalPopulations).toEqual([200, 1260, 900]);
  expect(result?.effectivePopulations).toEqual([200, 1260, 900]);
});

test('applies global bonuses but not retained overrides to unrestricted follow', () => {
  const state = {
    ...createPlanFactionState('tech'),
    livingSpace: true,
    senate: true,
    overrides: [null, null, editable(1)],
    intent: { kind: 'follow' as const, tierMode: 'unrestricted' as const },
  };

  expect(resolvePopulationTarget('tech', state, 100, [200, 900, 0])?.effectivePopulations)
    .toEqual([200, 1287, 1176]);
});
```

The exact expected arrays come from the existing Tech distribution: 60 researcher-and-up houses and 30%/35% Genius allocation.

- [ ] **Step 2: Run the target tests and verify failure**

Run:

```bash
npm test -- src/calculations/population-target.test.ts
```

Expected: FAIL because every follow target still mirrors island populations.

- [ ] **Step 3: Implement the two resolution branches**

Split the current follow branch:

```ts
if (state.intent.kind === 'follow') {
  if (islandHouses === null || islandPopulations === null) return null;
  if (state.intent.tierMode === 'unrestricted') {
    const maxTier = tierCapacities(faction, state.livingSpace).length;
    const normal = population(faction, state, islandHouses, maxTier);
    return {
      intent: state.intent,
      houses: islandHouses,
      maxTier,
      normalPopulations: normal,
      effectivePopulations: normal,
      requested: null,
      achieved: normal[maxTier - 1],
      overshoot: 0,
      targetMetAfterOverrides: true,
    };
  }

  const maxTier = Math.max(
    1,
    islandPopulations.reduce((top, value, tier) => value > 0 ? tier + 1 : top, 1),
  );
  return {
    intent: state.intent,
    houses: islandHouses,
    maxTier,
    normalPopulations: islandPopulations,
    effectivePopulations: islandPopulations,
    requested: null,
    achieved: islandPopulations[maxTier - 1],
    overshoot: 0,
    targetMetAfterOverrides: true,
  };
}
```

- [ ] **Step 4: Run the target tests**

Run:

```bash
npm test -- src/calculations/population-target.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit target resolution**

```bash
git add src/calculations/population-target.ts src/calculations/population-target.test.ts
git commit -m "feat: project unrestricted followed residences"
```

### Task 3: Generate Growth milestones for Unrestricted Follow

**Files:**
- Modify: `src/calculations/planning.ts` (`targetAtTier`, `buildFactionDescriptors`)
- Test: `src/calculations/planning.test.ts`

- [ ] **Step 1: Write a failing planning test**

```ts
test('plans unrestricted ascension from mirrored island houses', () => {
  const state = createInitialAppState();
  const island = createIsland('Restricted');
  island.factions.tech.houses = editable(100);
  island.factions.tech.maxTier = 2;
  state.plan.factions.tech.intent = { kind: 'follow', tierMode: 'unrestricted' };

  const milestones = calculateGrowthPlanning(state.plan, [island])!.sequences.tech;

  expect(milestones.map(({ kind, tier }) => ({ kind, tier }))).toEqual([
    { kind: 'ascend', tier: 3 },
  ]);
  expect(milestones[0].populationAfter.tech).toEqual([200, 1260, 900]);
});
```

Keep the existing differently-tiered Mirror test, updating only its explicit default intent if required by TypeScript.

- [ ] **Step 2: Run the planning test and verify failure**

Run:

```bash
npm test -- src/calculations/planning.test.ts
```

Expected: FAIL because `buildFactionDescriptors` rejects every follow intent.

- [ ] **Step 3: Let Unrestricted use the normal projection at each checkpoint**

Import `calculatePopulation` and make `targetAtTier` bypass retained overrides for unrestricted follow:

```ts
if (state.intent.kind === 'follow' && state.intent.tierMode === 'unrestricted') {
  return calculatePopulation({
    faction,
    houses: target.houses,
    maxTier: tier,
    livingSpace: state.livingSpace,
    senate: state.senate,
  });
}
```

Replace the blanket follow guard in `buildFactionDescriptors` with:

```ts
if ((state.factions[faction].intent.kind === 'follow'
      && state.factions[faction].intent.tierMode === 'mirror')
    || targets[faction].maxTier < actualTop
    || targets[faction].effectivePopulations.reduce((sum, value) => sum + value, 0)
      <= actual[faction].reduce((sum, value) => sum + value, 0)) return result;
```

- [ ] **Step 4: Run planning and target tests**

Run:

```bash
npm test -- src/calculations/planning.test.ts src/calculations/population-target.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Growth behavior**

```bash
git add src/calculations/planning.ts src/calculations/planning.test.ts
git commit -m "feat: plan unrestricted follow ascensions"
```

### Task 4: Move global bonuses and render mode-specific overview columns

**Files:**
- Modify: `src/components/GrowthTargetFaction.tsx`
- Modify: `src/components/GrowthSection.tsx`
- Modify: `src/components/PopulationSection.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.growth-targets.test.tsx`
- Test: `src/App.population-overview.test.tsx`

- [ ] **Step 1: Replace outdated overview tests with positive behavior tests**

Replace the test asserting there are no overview controls. Add tests that operate the new controls and modes:

```ts
test('owns faction-global population bonuses in the permanent overview', async () => {
  renderApp();
  addIsland();
  fireEvent.click(buttonWithLabel('Configure island Island 1'));
  fireEvent.click(buttonWithLabel('Tech Geniuses', byTestId('island-0')));
  await replaceInput(input('island-0-config-tech-houses'), '100');
  fireEvent.click(buttonWithLabel('Finish configuring island Island 1'));
  const tech = document.querySelector('.population-faction--tech')!;
  expect(byTestId('overview-tech-actual-tier-2')).toHaveTextContent('900');

  fireEvent.click(input('overview-tech-living-space'));
  fireEvent.click(input('overview-tech-senate'));

  expect(input('overview-tech-living-space')).toBeChecked();
  expect(input('overview-tech-senate')).toBeChecked();
  expect(byTestId('overview-tech-actual-tier-2')).toHaveTextContent('1176');
});

test('switches Follow islands from mirrored actuals to unrestricted ascension', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'tech', '100');

  const tech = document.querySelector('.population-faction--tech')!;
  expect(tech).toHaveAttribute('data-target-layout', 'mirror');
  expect(tech).toHaveTextContent('Following actual tiers');

  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel('Project Tech through unrestricted ascension'));

  expect(tech).toHaveAttribute('data-target-layout', 'target');
  expect(tech).toHaveTextContent('Following houses · unrestricted ascension');
  expect(byTestId('overview-tech-target-tier-2')).toHaveTextContent('900');
});
```

Use the existing helpers from `src/test/app-test-utils.tsx`; add `id` attributes to the two overview checkboxes so `input(...)` can address them.

- [ ] **Step 2: Run the UI tests and verify failure**

Run:

```bash
npm test -- src/App.growth-targets.test.tsx src/App.population-overview.test.tsx
```

Expected: FAIL because Follow has no submode selector and bonus inputs still live in Growth.

- [ ] **Step 3: Add the Follow submode selector and remove Growth bonus controls**

Remove `onBonusChange` from `GrowthTargetFaction` and `GrowthSection`. In `GrowthTargetFaction`, preserve the chosen Follow submode and render:

```tsx
const setMode = (kind: 'follow' | 'residences' | 'population') => onChange({
  ...state,
  intent: kind === 'follow'
    ? { kind, tierMode: state.intent.kind === 'follow' ? state.intent.tierMode : 'mirror' }
    : kind === 'residences'
      ? { kind, houses: entry(String(resolved?.houses ?? 0)), maxTier: tier }
      : { kind, tier, count: entry('0') },
});

{state.intent.kind === 'follow' && <div className="growth-target__follow-modes">
  <button
    type="button"
    aria-pressed={state.intent.tierMode === 'mirror'}
    aria-label={`Mirror ${config.label} actual tiers`}
    onClick={() => onChange({ ...state, intent: { kind: 'follow', tierMode: 'mirror' } })}
  >Mirror actual tiers</button>
  <button
    type="button"
    aria-pressed={state.intent.tierMode === 'unrestricted'}
    aria-label={`Project ${config.label} through unrestricted ascension`}
    onClick={() => onChange({ ...state, intent: { kind: 'follow', tierMode: 'unrestricted' } })}
  >Unrestricted ascension</button>
</div>}
```

Delete the `.population-options--compact` bonus block. Do not leave an editable, disabled, or read-only bonus duplicate in Growth.

Update the card summary so the selected Follow behavior stays visible while collapsed:

```tsx
<summary>{config.label} · {
  state.intent.kind === 'follow'
    ? state.intent.tierMode === 'mirror'
      ? 'Follow islands · Mirror actual tiers'
      : 'Follow islands · Unrestricted ascension'
    : state.intent.kind === 'residences'
      ? 'By residences'
      : 'By population'
}</summary>
```

- [ ] **Step 4: Give the overview ownership of bonuses and its per-card layout**

Replace `targetKinds` with the complete plan faction state and add the existing callback:

```ts
type Props = {
  actualHouses: FactionHouses;
  actualPopulations: Record<Faction, readonly number[] | null>;
  targets: Record<Faction, ResolvedPopulationTarget | null>;
  factionStates: CalculatorState['factions'];
  islands: readonly IslandState[];
  onBonusChange: (faction: Faction, bonus: 'livingSpace' | 'senate', checked: boolean) => void;
};
```

For each card derive:

```tsx
const mirror = factionStates[faction].intent.kind === 'follow'
  && factionStates[faction].intent.tierMode === 'mirror';
const modeLabel = mirror
  ? 'Following actual tiers'
  : factionStates[faction].intent.kind === 'follow'
    ? 'Following houses · unrestricted ascension'
    : 'Growth target';
```

Set `data-target-layout={mirror ? 'mirror' : 'target'}`. Render the target header and target outputs only when `!mirror`. Add this group inside each faction card:

```tsx
<fieldset className="population-faction__bonuses">
  <legend>Global bonuses</legend>
  <label>
    <input
      id={`overview-${faction}-living-space`}
      type="checkbox"
      checked={factionStates[faction].livingSpace}
      onChange={(event) => onBonusChange(faction, 'livingSpace', event.target.checked)}
    />
    {config.livingSpaceLabel}
  </label>
  <label>
    <input
      id={`overview-${faction}-senate`}
      type="checkbox"
      checked={factionStates[faction].senate}
      onChange={(event) => onBonusChange(faction, 'senate', event.target.checked)}
    />
    {config.senateLabel}
  </label>
</fieldset>
```

Pass `factionStates={state.plan.factions}` and `onBonusChange={updateBonus}` from `App`. Remove `onBonusChange` from `GrowthSection`.

- [ ] **Step 5: Style the two layouts and compact controls**

Use one variable column definition so each card remains independently responsive:

```css
.population-faction[data-target-layout='mirror'] .population-overview-columns,
.population-faction[data-target-layout='mirror'] .pop-rows--overview .pop-row {
  grid-template-columns: 32px minmax(0, 1fr) minmax(4rem, .65fr) minmax(8rem, 1fr);
}

.population-faction__bonuses {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem .8rem;
  margin: .5rem 0;
  padding: 0;
  border: 0;
}

.population-faction__bonuses legend {
  width: 100%;
  color: var(--muted);
  font-size: .75rem;
}

.growth-target__follow-modes {
  display: flex;
  gap: .35rem;
}
```

Adjust existing selectors only where the current four-column grid is hard-coded; do not redesign the cards.

- [ ] **Step 6: Run the focused UI tests**

Run:

```bash
npm test -- src/App.growth-targets.test.tsx src/App.population-overview.test.tsx src/App.growth.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the UI move**

```bash
git add src/App.tsx src/components/GrowthSection.tsx src/components/GrowthTargetFaction.tsx src/components/PopulationSection.tsx src/styles.css src/App.growth-targets.test.tsx src/App.population-overview.test.tsx
git commit -m "feat: expose follow modes in population overview"
```

### Task 5: Verify the complete Follow-mode change

**Files:**
- Verify only; modify the files from Tasks 1–4 if a command exposes a defect.

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: every Vitest test passes.

- [ ] **Step 2: Run static verification**

```bash
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0 and `git diff --check` prints nothing.

- [ ] **Step 3: Inspect the responsive UI**

Run the project visual companion on an available port, outside the sandbox as required by `AGENTS.md`:

```bash
npm run dev -- --host 0.0.0.0 --port 62579
```

Open `http://localhost:62579` and confirm:

- Mirror cards show Actual + Headroom with no empty fourth column;
- Unrestricted and explicit targets retain a readable Target column;
- global bonus controls fit each faction card at desktop and narrow widths;
- Growth shows the Follow submode selector without duplicate bonus controls.

If visual or automated verification exposes a defect, return to the task that owns that behavior, add a focused failing assertion there, and repeat that task's test, implementation, and commit steps before rerunning Task 5.
