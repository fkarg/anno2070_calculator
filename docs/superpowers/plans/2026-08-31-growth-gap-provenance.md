# Growth Gap Provenance and Independent Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository policy requires inline execution; do not delegate code writing.

**Goal:** Make Growth show current supply shortages separately, calculate each faction's target milestones independently, and explain the population demand chains behind every capacity gap.

**Architecture:** Add a pure requirement-snapshot module that attributes canonical-good demand to faction/root paths. Rework the planner around one immutable actual baseline and three faction-local milestone arrays, then render that topology with a reusable gap card and collapsed carried-gap groups. All scenarios continue to compare against the same live empire-wide effective-capacity map.

**Tech Stack:** React 19, TypeScript 6, Vitest 4, Testing Library, CSS

---

### Task 1: Attribute canonical requirements to demand chains

**Files:**
- Create: `src/calculations/growth-requirements.ts`
- Create: `src/calculations/growth-requirements.test.ts`

- [ ] **Step 1: Write the failing snapshot tests**

Create `src/calculations/growth-requirements.test.ts` with focused scenarios:

```ts
import { describe, expect, test } from 'vitest';

import { calculateGrowthRequirements } from './growth-requirements';

const emptyPopulation = () => ({
  eco: [0, 0, 0, 0],
  tycoon: [0, 0, 0, 0],
  tech: [0, 0, 0],
});

describe('Growth requirement provenance', () => {
  test('attributes algae to the Tech functional-food chain', () => {
    const population = emptyPopulation();
    population.tech[1] = 444;

    const algae = calculateGrowthRequirements(population, false).get('aquafarm')!;

    expect(algae.required).toBeCloseTo(1);
    expect(algae.chains).toEqual([expect.objectContaining({
      faction: 'tech',
      rootNodeId: 'techFunctionalFood',
      pathNodeIds: ['techFunctionalFood', 'techAlgaeFunctionalFood'],
      required: 1,
    })]);
  });

  test('keeps shared-good contributions separate and sums them once', () => {
    const population = emptyPopulation();
    population.eco[0] = 250;
    population.tycoon[0] = 250;
    population.tech[0] = 800;

    const fish = calculateGrowthRequirements(population, false).get('fishery')!;

    expect(fish.required).toBeCloseTo(3);
    expect(fish.chains.map((chain) => chain.faction)).toEqual(['eco', 'tycoon', 'tech']);
    expect(fish.chains.reduce((sum, chain) => sum + chain.required, 0))
      .toBeCloseTo(fish.required);
  });

  test('does not count alternative producers as additional demand causes', () => {
    const population = emptyPopulation();
    population.tech[1] = 667;

    const chips = calculateGrowthRequirements(population, false).get('chipFactory')!;

    expect(chips.chains).toHaveLength(1);
    expect(chips.chains[0].pathNodeIds).toEqual([
      'techNeuroimplants', 'techMicrochips',
    ]);
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the missing-module failure**

Run: `pnpm vitest run src/calculations/growth-requirements.test.ts`

Expected: FAIL because `./growth-requirements` does not exist.

- [ ] **Step 3: Implement the pure snapshot module**

Create `src/calculations/growth-requirements.ts`:

```ts
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
```

- [ ] **Step 4: Run the focused tests**

Run: `pnpm vitest run src/calculations/growth-requirements.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the pure calculation**

```bash
git add src/calculations/growth-requirements.ts src/calculations/growth-requirements.test.ts
git commit -m "feat: explain Growth requirement chains"
```

### Task 2: Calculate a baseline and independent faction sequences

**Files:**
- Modify: `src/calculations/planning.ts`
- Modify: `src/calculations/planning.test.ts`

- [ ] **Step 1: Replace old cumulative-behavior tests with failing topology tests**

In `src/calculations/planning.test.ts`, remove `carries shared Fish demand cumulatively across factions` and `never drops current per-good demand when a larger aggregate target changes tier mix`. Add:

```ts
test('reports current shortages as a baseline without growth targets', () => {
  const state = createInitialAppState();
  const actual = createIsland('Actual');
  actual.factions.tech.houses = editable(10);
  actual.factions.tech.maxTier = 2;

  const planning = calculateGrowthPlanning(state.plan, [actual])!;

  expect(planning.baseline.gaps.find((gap) => gap.goodId === 'aquafarm')).toBeDefined();
  expect(planning.sequences.eco).toEqual([]);
  expect(planning.sequences.tycoon).toEqual([]);
  expect(planning.sequences.tech).toEqual([]);
});

test('keeps faction target branches independent', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
  state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(20), maxTier: 1 };

  const planning = calculateGrowthPlanning(state.plan, [])!;
  const eco = planning.sequences.eco[0];
  const tycoon = planning.sequences.tycoon[0];

  expect(eco.populationAfter.eco[0]).toBe(80);
  expect(eco.populationAfter.tycoon[0]).toBe(0);
  expect(tycoon.populationAfter.eco[0]).toBe(0);
  expect(tycoon.populationAfter.tycoon[0]).toBe(160);
  expect(eco.gaps.find((gap) => gap.goodId === 'fishery')?.required).toBeCloseTo(0.32);
  expect(tycoon.gaps.find((gap) => gap.goodId === 'fishery')?.required).toBeCloseTo(0.64);
});

test('marks the first incomplete step current in every faction branch', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };
  state.plan.factions.tycoon.intent = { kind: 'residences', houses: editable(10), maxTier: 1 };

  const planning = calculateGrowthPlanning(state.plan, [])!;

  expect(planning.sequences.eco[0].current).toBe(true);
  expect(planning.sequences.tycoon[0].current).toBe(true);
});

test('compares each checkpoint with its exact previous same-faction scenario', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = { kind: 'residences', houses: editable(100), maxTier: 2 };

  const [workers, employees] = calculateGrowthPlanning(state.plan, [])!.sequences.eco;
  const workerFish = workers.gaps.find((gap) => gap.goodId === 'fishery')!;
  const employeeFish = employees.gaps.find((gap) => gap.goodId === 'fishery')!;

  expect(employeeFish.previousRequired).toBeCloseTo(workerFish.required);
  expect(employeeFish.addedHere).toBeCloseTo(Math.max(
    0, employeeFish.required - workerFish.required,
  ));
});
```

- [ ] **Step 2: Run the planner tests and verify shape/semantic failures**

Run: `pnpm vitest run src/calculations/planning.test.ts`

Expected: FAIL because the result still has a flat `milestones` array and global cumulative state.

- [ ] **Step 3: Replace the planner result types and gap builder**

In `src/calculations/planning.ts`, import `calculateGrowthRequirements` and `GrowthDemandChain`, then replace the public result types with:

```ts
export type GrowthGap = Readonly<{
  goodId: GoodId;
  required: number;
  capacity: number;
  remaining: number;
  baselineRequired: number;
  previousRequired: number;
  checkpointRequired: number;
  addedHere: number;
  chains: readonly GrowthDemandChain[];
}>;

export type GrowthBaseline = Readonly<{
  gaps: readonly GrowthGap[];
  complete: boolean;
  current: boolean;
}>;

export type GrowthPlanningResult = Readonly<{
  baseline: GrowthBaseline;
  sequences: Readonly<Record<Faction, readonly GrowthMilestone[]>>;
}>;
```

Add a single gap builder used by baseline and milestones:

```ts
function buildGaps(
  requirements: ReturnType<typeof calculateGrowthRequirements>,
  previous: ReturnType<typeof calculateGrowthRequirements>,
  baseline: ReturnType<typeof calculateGrowthRequirements>,
  capacities: Record<GoodId, number>,
): GrowthGap[] {
  return [...requirements].map(([goodId, snapshot]) => {
    const capacity = capacities[goodId] ?? 0;
    const previousRequired = previous.get(goodId)?.required ?? 0;
    return {
      goodId,
      required: snapshot.required,
      capacity,
      remaining: Math.max(0, snapshot.required - capacity),
      baselineRequired: baseline.get(goodId)?.required ?? 0,
      previousRequired,
      checkpointRequired: snapshot.required,
      addedHere: Math.max(0, snapshot.required - previousRequired),
      chains: snapshot.chains,
    };
  }).filter((gap) => gap.remaining > EPSILON).sort(compareGaps);
}
```

Extract the existing input-depth/catalog comparison into `compareGaps(left, right)` without changing its ordering.

- [ ] **Step 4: Build each faction sequence from the immutable actual population**

Replace `buildDescriptors` with `buildFactionDescriptors`, which returns one faction's ascending descriptors without global sorting. In `calculateGrowthPlanning`, use this structure:

```ts
const baselineRequirements = calculateGrowthRequirements(actual, state.recycling);
const baselineGaps = buildGaps(
  baselineRequirements,
  new Map(),
  baselineRequirements,
  capacities as Record<GoodId, number>,
);

const sequences = Object.fromEntries(FACTIONS.map((faction) => {
  let previousPopulation = clonePopulations(actual);
  let previousRequirements = baselineRequirements;
  const milestones = buildFactionDescriptors(state, targets, actual, faction)
    .map((descriptor) => {
      const populationBefore = clonePopulations(previousPopulation);
      const populationAfter = {
        ...clonePopulations(actual),
        [faction]: [...descriptor.population],
      };
      const requirements = calculateGrowthRequirements(populationAfter, state.recycling);
      const gaps = buildGaps(
        requirements,
        previousRequirements,
        baselineRequirements,
        capacities as Record<GoodId, number>,
      );
      previousPopulation = populationAfter;
      previousRequirements = requirements;
      return {
        ...descriptor,
        id: `${faction}-${descriptor.tier}-${descriptor.kind}`,
        populationBefore,
        populationAfter,
        gaps,
        complete: gaps.length === 0,
        current: false,
      };
    });
  const currentIndex = milestones.findIndex((milestone) => !milestone.complete);
  return [faction, milestones.map((milestone, index) => ({
    ...milestone,
    current: index === currentIndex,
  }))];
})) as Record<Faction, readonly GrowthMilestone[]>;

return {
  baseline: {
    gaps: baselineGaps,
    complete: baselineGaps.length === 0,
    current: baselineGaps.length > 0,
  },
  sequences,
};
```

Delete the global `cumulative`, `requirementFloor`, flattened milestone sort, and global `currentIndex`.

- [ ] **Step 5: Update the remaining planner tests to read faction sequences**

Change lookups such as:

```ts
calculateGrowthPlanning(state.plan, [])!.milestones.find(...)
```

to the exact faction branch:

```ts
calculateGrowthPlanning(state.plan, [])!.sequences.eco.find(...)
```

For the follow/no-growth case, assert all three arrays are empty rather than comparing `milestones` to `[]`.

- [ ] **Step 6: Run the pure planner suite**

Run: `pnpm vitest run src/calculations/growth-requirements.test.ts src/calculations/planning.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit independent planning semantics**

```bash
git add src/calculations/planning.ts src/calculations/planning.test.ts
git commit -m "fix: make Growth milestones faction-independent"
```

### Task 3: Render the baseline, faction groups, and provenance

**Files:**
- Create: `src/components/GrowthGapCard.tsx`
- Create: `src/components/growth-milestones.css`
- Modify: `src/components/GrowthMilestones.tsx`
- Modify: `src/App.growth.test.tsx`
- Modify: `src/styles.test.ts`

- [ ] **Step 1: Add failing workflow assertions**

Extend `src/App.growth.test.tsx` with an actual Tech population and Eco growth target. Assert:

```ts
test('separates actual shortages from parallel faction growth steps', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'tech', '10');
  await setGrowthResidenceTarget('eco', '100');
  fireEvent.click(buttonWithLabel('Eco Engineers'));

  const baseline = byTestId('growth-baseline');
  const eco = byTestId('growth-sequence-eco');

  expect(baseline).toHaveTextContent('Supply current population');
  expect(baseline).toHaveTextContent('Aquafarm');
  expect(eco).toHaveTextContent('Changed in this step');
  expect(eco).toHaveTextContent('Carried gaps');
  expect(eco).toHaveTextContent('Already required by current population');
  expect(eco).toHaveTextContent('Why required?');
  expect(eco).toHaveTextContent('Tech');
  expect(eco).toHaveTextContent('Functional food factory');
});
```

Import `setIslandHouses` from `./test/app-test-utils`. Update the existing milestone tests to query within `growth-sequence-eco` while keeping their producer-action assertions.

- [ ] **Step 2: Run the App test and verify the missing baseline/group failure**

Run: `pnpm vitest run src/App.growth.test.tsx`

Expected: FAIL because the renderer still expects `planning.milestones` and has no baseline or faction groups.

- [ ] **Step 3: Extract a reusable gap card with chain explanation**

Move the existing gap article and producer buttons to `src/components/GrowthGapCard.tsx`. Its public props are:

```ts
type Props = {
  gap: GrowthGap;
  islands: readonly IslandState[];
  subtitle: string;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};
```

Keep the existing producer loop unchanged. Replace `Target full demand` with `subtitle`, change `Actual capacity` to `Actual effective capacity`, and add:

```tsx
<details className="growth-gap__why">
  <summary>Why required?</summary>
  <ul>
    {gap.chains.map((chain) => (
      <li key={`${chain.faction}-${chain.pathNodeIds.join('-')}`}>
        <span>{FACTION_CONFIGS[chain.faction].label} · {chain.pathNodeIds
          .map((id) => BUILDINGS[nodeById.get(id)!.buildingId].label)
          .join(' → ')}</span>
        <output>{formatRequirement(chain.required)}</output>
      </li>
    ))}
  </ul>
</details>
```

Define `nodeById` locally from `PRODUCTION_NODES`; it is presentation lookup data, not planner state.

- [ ] **Step 4: Render baseline and three faction groups**

In `GrowthMilestones.tsx`, import `./growth-milestones.css`, define `const EPSILON = 1e-9`, and replace the flat `planning.milestones.map` with:

```tsx
const hasMilestones = FACTIONS.some((faction) => planning.sequences[faction].length > 0);
if (planning.baseline.complete && !hasMilestones) {
  return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>No population growth steps remain for these targets.</p></section>;
}

return <section className="growth-milestones">
  <header>
    <h3>Full-supply milestones</h3>
    <p>Current supply comes first; faction plans progress independently.</p>
  </header>
  {(!planning.baseline.complete || hasMilestones) && (
    <MilestoneDetails
      testId="growth-baseline"
      title="Supply current population"
      summary={planning.baseline.complete
        ? 'covered'
        : `${planning.baseline.gaps.length} capacity gaps`}
      gaps={planning.baseline.gaps}
      carriedSubtitle="Required by current population"
      baseline
      open={!planning.baseline.complete}
      state={planning.baseline.complete ? 'complete' : 'current'}
      islands={islands}
      onApplyBuilding={onApplyBuilding}
    />
  )}
  <div className="growth-milestones__branches">
    {FACTIONS.map((faction) => (
      <section
        key={faction}
        className={`growth-sequence growth-sequence--${faction}`}
        data-testid={`growth-sequence-${faction}`}
      >
        <h4>{FACTION_CONFIGS[faction].label}</h4>
        {planning.sequences[faction].map((milestone, index) => (
          <MilestoneDetails
            key={milestone.id}
            testId={`growth-milestone-${milestone.id}`}
            title={milestoneTitle(milestone)}
            summary={milestoneSummary(milestone)}
            gaps={milestone.gaps}
            carriedSubtitle={index === 0
              ? 'Already required by current population'
              : `Still required from the previous ${FACTION_CONFIGS[faction].label} step`}
            open={milestone.current}
            state={milestoneState(milestone)}
            islands={islands}
            onApplyBuilding={onApplyBuilding}
          />
        ))}
      </section>
    ))}
  </div>
</section>;
```

Implement the shared renderer and local label helpers in the same file:

```tsx
type MilestoneDetailsProps = {
  testId: string;
  title: string;
  summary: string;
  gaps: readonly GrowthGap[];
  carriedSubtitle: string;
  baseline?: boolean;
  open: boolean;
  state?: 'current' | 'future' | 'complete';
  islands: readonly IslandState[];
  onApplyBuilding: Props['onApplyBuilding'];
};

function MilestoneDetails(props: MilestoneDetailsProps) {
  const changed = props.gaps.filter((gap) => gap.addedHere > EPSILON);
  const carried = props.gaps.filter((gap) => gap.addedHere <= EPSILON);
  return <details
    className={`growth-milestone growth-milestone--${props.state ?? 'current'}`}
    data-testid={props.testId}
    open={props.open}
  >
    <summary><span>{props.title}</span><small>{props.summary}</small></summary>
    {props.gaps.length > 0 && <div className="growth-milestone__gaps">
      {props.baseline
        ? props.gaps.map((gap) => <GrowthGapCard
          key={gap.goodId}
          gap={gap}
          subtitle={props.carriedSubtitle}
          islands={props.islands}
          onApplyBuilding={props.onApplyBuilding}
        />)
        : <>{changed.length > 0 && <section>
        <h5 className="growth-milestone__group-title">Changed in this step</h5>
        {changed.map((gap) => <GrowthGapCard
          key={gap.goodId}
          gap={gap}
          subtitle={`This step adds +${formatRequirement(gap.addedHere)} required capacity`}
          islands={props.islands}
          onApplyBuilding={props.onApplyBuilding}
        />)}
      </section>}
      {carried.length > 0 && <details className="growth-milestone__carried">
        <summary>Carried gaps ({carried.length})</summary>
        {carried.map((gap) => <GrowthGapCard
          key={gap.goodId}
          gap={gap}
          subtitle={props.carriedSubtitle}
          islands={props.islands}
          onApplyBuilding={props.onApplyBuilding}
        />)}
      </details>}</>}
    </div>}
  </details>;
}

function milestoneTitle(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  const targetTier = config.tierLabels[milestone.tier - 1];
  return milestone.kind === 'expand'
    ? `Expand ${config.label} at ${targetTier}`
    : `${config.tierLabels[milestone.tier - 2]} to ${targetTier}`;
}

function milestoneSummary(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  const targetTier = config.tierLabels[milestone.tier - 1];
  const delta = milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
  const changed = milestone.gaps.filter((gap) => gap.addedHere > EPSILON).length;
  const carried = milestone.gaps.length - changed;
  return `${delta >= 0 ? '+' : ''}${delta} ${targetTier} · ${milestone.complete
    ? 'covered'
    : `${milestone.gaps.length} gaps · ${changed} changed here · ${carried} carried`}`;
}

function milestoneState(milestone: GrowthMilestone): 'current' | 'future' | 'complete' {
  if (milestone.complete) return 'complete';
  return milestone.current ? 'current' : 'future';
}
```

`MilestoneDetails` derives the changed/carried partition directly from `gaps`.

- [ ] **Step 5: Add responsive faction-group and provenance styles**

Create `src/components/growth-milestones.css` so this work does not overlap the pre-existing concurrent `src/styles.css` changes:

```css
.growth-milestones__branches { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; align-items: start; }
.growth-sequence { display: grid; gap: .55rem; min-width: 0; }
.growth-sequence > h4 { margin: .15rem 0 0; color: var(--muted); text-transform: uppercase; font-size: .72rem; letter-spacing: .08em; }
.growth-milestone__group-title { margin: .15rem 0; font-size: .72rem; color: var(--muted); }
.growth-milestone__carried > summary,
.growth-gap__why > summary { color: var(--muted); cursor: pointer; font-size: .7rem; }
.growth-gap__why ul { display: grid; gap: .2rem; margin: .35rem 0 0; padding: 0; list-style: none; }
.growth-gap__why li { display: flex; justify-content: space-between; gap: .75rem; font-size: .68rem; }
.growth-gap__why output { flex: 0 0 auto; font-variant-numeric: tabular-nums; }

@media (max-width: 1050px) {
  .growth-milestones__branches { grid-template-columns: 1fr; }
}
```

Update `src/styles.test.ts`:

```ts
const growthCss = readFileSync('src/components/growth-milestones.css', 'utf8');
expect(growthCss).toMatch(/\.growth-milestones__branches \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
expect(growthCss).toMatch(/@media \(max-width: 1050px\)[\s\S]*\.growth-milestones__branches \{ grid-template-columns: 1fr; \}/);
```

- [ ] **Step 6: Run the focused UI and style tests**

Run: `pnpm vitest run src/App.growth.test.tsx src/styles.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the Growth presentation**

```bash
git add src/components/GrowthGapCard.tsx src/components/GrowthMilestones.tsx src/components/growth-milestones.css src/App.growth.test.tsx src/styles.test.ts
git commit -m "feat: show independent Growth supply plans"
```

### Task 4: Regression verification and review

**Files:**
- Modify only if a verified regression requires a scoped fix.

- [ ] **Step 1: Run all automated tests**

Run: `pnpm test`

Expected: all tests PASS.

- [ ] **Step 2: Run static verification**

Run: `pnpm lint`

Expected: exit 0.

Run: `pnpm build`

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 3: Review the completed diff against the design**

Run:

```bash
git diff --check
git diff 97c0509..HEAD -- src/calculations/growth-requirements.ts src/calculations/planning.ts src/components/GrowthGapCard.tsx src/components/GrowthMilestones.tsx src/components/growth-milestones.css src/App.growth.test.tsx src/calculations/planning.test.ts src/styles.test.ts
```

Confirm:

- baseline actual shortages have their own checkpoint;
- no faction target population enters another faction branch;
- only earlier milestones in the same faction provide the comparison scenario;
- requirements are exact scenario totals rather than retained peaks;
- every displayed chain contribution sums to the canonical requirement;
- alternative producers remain build choices, not duplicate demand causes;
- unrelated concurrent worktree changes are absent from these commits.

- [ ] **Step 4: Run the required independent diff review**

Run in the foreground:

```bash
git diff 97c0509..HEAD | peer-review --mode diff-review --cd /home/pars/Coding/anno2070_calculator "Review the Growth baseline, faction-independent milestones, requirement provenance, tests, and UI against docs/superpowers/specs/2026-08-31-growth-gap-provenance-design.md. Try to falsify faction independence and chain accounting."
```

Record the serving model, attempted falsifications, and whether each finding changed code, added verification, found a unique defect, was rejected with evidence, or had no impact. Fix confirmed defects test-first, rerun the focused suite, and create a scoped follow-up commit.

- [ ] **Step 5: Confirm final repository state**

Run:

```bash
git status --short --branch
git log --oneline -6
```

Expected: the Growth commits are present; any remaining modified files are the pre-existing concurrent island/goods/style work identified before execution, not unstaged Growth changes.
