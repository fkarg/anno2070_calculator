# Production Coverage Growth Contexts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository policy forbids delegating code writing, so implementation stays with the primary agent; subagents may only explore or review.

**Goal:** Add active Growth milestone contexts and whole-building shortcuts to Production's Coverage & bottlenecks panel while preserving its Current diagnosis and adopting the approved neutral four-card layout.

**Architecture:** Keep Current bottleneck and Growth milestone calculations separate, then adapt both into a small shared card presentation model. `CoverageSection` owns ephemeral context selection and first-four/later partitioning; focused card and producer-action components own rendering and mutation. Extend Growth chain provenance with per-path deltas so breadcrumbs never attribute carried demand to the selected milestone.

**Tech Stack:** React 19, TypeScript 6, Vitest 4, Testing Library, CSS.

---

## File structure

- Modify `src/calculations/planning.ts`: decorate milestone demand chains with previous and added-here amounts.
- Modify `src/calculations/planning.test.ts`: pin per-chain comparison semantics.
- Create `src/components/coverage-card-model.ts`: pure adapters and breadcrumb/reason selection for Current and milestone cards.
- Create `src/components/coverage-card-model.test.ts`: test adapter ordering, provenance, and upstream Current actions.
- Create `src/components/ProducerActions.tsx`: reusable producer/island whole-building actions in compact and detailed variants.
- Create `src/components/ProducerActions.test.tsx`: pin producer identity, canonical contribution, and mutation arguments.
- Modify `src/components/GrowthGapCard.tsx`: reuse `ProducerActions` without changing Growth behavior.
- Create `src/components/CoverageBottleneckCard.tsx`: render the shared neutral compact card.
- Modify `src/components/CoverageSection.tsx`: add context tabs, milestone cards, later gaps, selection fallback, and actions.
- Modify `src/App.tsx`: pass `planning` and `applyBuilding` into Coverage.
- Modify `src/App.coverage.test.tsx`: cover contexts, actions, fallback, Current regression, empty/invalid behavior, and accessibility.
- Create `src/components/CoverageSection.test.tsx`: pin same-faction milestone advancement and Current fallback with controlled props.
- Modify `src/styles.css`: retain Growth's detailed producer-action layout after extraction, then implement the approved neutral Coverage layout and palette.

### Task 1: Add per-chain milestone provenance

**Files:**
- Modify: `src/calculations/planning.ts`
- Test: `src/calculations/planning.test.ts`

- [ ] **Step 1: Write the failing chain-delta tests**

Add tests that prove a same-faction path records its previous contribution, while an unrelated current-population path remains carried:

```ts
test('records previous and added demand on each milestone chain', () => {
  const state = createInitialAppState();
  state.plan.factions.eco.intent = {
    kind: 'residences', houses: editable(100), maxTier: 2,
  };

  const [workers, employees] = calculateGrowthPlanning(state.plan, [])!.sequences.eco;
  const previousFish = workers.gaps.find((gap) => gap.goodId === 'fishery')!
    .chains.find((chain) => chain.faction === 'eco')!;
  const nextFish = employees.gaps.find((gap) => gap.goodId === 'fishery')!
    .chains.find((chain) => chain.faction === 'eco')!;

  expect(nextFish.previousRequired).toBeCloseTo(previousFish.required);
  expect(nextFish.addedHere).toBeCloseTo(Math.max(
    0,
    nextFish.required - previousFish.required,
  ));
});

test('marks a current-population chain as carried in another faction milestone', () => {
  const state = createInitialAppState();
  const actual = createIsland('Tech');
  actual.factions.tech.houses = editable(10);
  actual.factions.tech.maxTier = 1;
  state.plan.factions.eco.intent = {
    kind: 'residences', houses: editable(100), maxTier: 3,
  };

  const milestone = calculateGrowthPlanning(state.plan, [actual])!.sequences.eco.at(-1)!;
  const chain = milestone.gaps.find((gap) => gap.goodId === 'aquafarm')!.chains[0];

  expect(chain.faction).toBe('tech');
  expect(chain.previousRequired).toBeCloseTo(chain.required);
  expect(chain.addedHere).toBe(0);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run src/calculations/planning.test.ts
```

Expected: FAIL because `GrowthDemandChain` values do not yet expose `previousRequired` or `addedHere`.

- [ ] **Step 3: Implement chain comparison in gap construction**

Add a gap-specific chain type and match chains by their stable demand identity:

```ts
export type GrowthGapChain = GrowthDemandChain & Readonly<{
  previousRequired: number;
  addedHere: number;
}>;

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

function demandChainKey(chain: GrowthDemandChain): string {
  return `${chain.faction}:${chain.rootNodeId}:${chain.pathNodeIds.join('>')}`;
}
```

Inside `buildGaps`, construct a previous-chain lookup for each good and decorate the selected snapshot's chains:

```ts
const previousChains = new Map(
  (previous.get(goodId)?.chains ?? []).map((chain) => [demandChainKey(chain), chain.required]),
);
const chains = snapshot.chains.map((chain): GrowthGapChain => {
  const previousRequired = previousChains.get(demandChainKey(chain)) ?? 0;
  return {
    ...chain,
    previousRequired,
    addedHere: Math.max(0, chain.required - previousRequired),
  };
});
```

Return `chains` instead of `snapshot.chains`. Leave baseline and gap-level comparison behavior unchanged.

- [ ] **Step 4: Run planning tests**

Run:

```bash
npx vitest run src/calculations/planning.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the provenance change**

```bash
git add src/calculations/planning.ts src/calculations/planning.test.ts
git commit -m "feat: expose Growth chain deltas"
```

### Task 2: Build the shared Coverage card model

**Files:**
- Create: `src/components/coverage-card-model.ts`
- Create: `src/components/coverage-card-model.test.ts`
- Modify: `src/components/CoverageSection.tsx`

- [ ] **Step 1: Write failing pure adapter tests**

Create tests around exported `currentCoverageView` and `milestoneCoverageCards`:

```ts
import { describe, expect, test } from 'vitest';
import { createInitialAppState, createIsland } from '../island';
import type { EditableNumber } from '../model';
import { calculateGrowthPlanning } from '../calculations/planning';
import { currentCoverageView, milestoneCoverageCards } from './coverage-card-model';

const editable = (value: number): EditableNumber => ({ raw: String(value), value });

test('keeps an upstream action distinct from a starved downstream bottleneck', () => {
  const island = createIsland('Supply');
  island.factions.eco.houses = editable(100);
  island.factions.eco.maxTier = 2;
  island.owned.healthFoodFactory = editable(2);

  const card = currentCoverageView([island], null).cards
    .find((candidate) => candidate.goodId === 'healthFoodFactory')!;

  expect(card.actionGoodId).not.toBe(card.goodId);
  expect(card.outcome).toContain('starved');
});

test('chooses a changed milestone chain for the visible breadcrumb', () => {
  const state = createInitialAppState();
  state.plan.factions.tech.intent = {
    kind: 'residences', houses: editable(100), maxTier: 3,
  };
  const milestone = calculateGrowthPlanning(state.plan, [])!.sequences.tech.at(-1)!;
  const cards = milestoneCoverageCards(milestone);
  const copper = cards.find((card) => card.goodId === 'copperMine')!;

  expect(copper.breadcrumb.at(0)).toBe('Copper mine');
  expect(copper.breadcrumb.at(-1)).toMatch(/Tech: \+.* planned/);
  expect(copper.why.some((reason) => reason.kind === 'changed')).toBe(true);
});

test('labels purely carried milestone provenance without blaming the target', () => {
  const state = createInitialAppState();
  const actual = createIsland('Tech');
  actual.factions.tech.houses = editable(10);
  actual.factions.tech.maxTier = 1;
  state.plan.factions.eco.intent = {
    kind: 'residences', houses: editable(100), maxTier: 3,
  };
  const milestone = calculateGrowthPlanning(state.plan, [actual])!.sequences.eco.at(-1)!;
  const algae = milestoneCoverageCards(milestone)
    .find((card) => card.goodId === 'aquafarm')!;

  expect(algae.breadcrumb.at(-1)).toMatch(/current population|previous Eco step/);
  expect(algae.why.every((reason) => reason.kind === 'carried')).toBe(true);
});

test('preserves input-first order for the four-card and later partitions', () => {
  const state = createInitialAppState();
  state.plan.factions.tech.intent = {
    kind: 'residences', houses: editable(100), maxTier: 3,
  };
  const milestone = calculateGrowthPlanning(state.plan, [])!.sequences.tech.at(-1)!;
  const cards = milestoneCoverageCards(milestone);

  expect(cards.slice(0, 4).map((card) => card.goodId))
    .toEqual(milestone.gaps.slice(0, 4).map((gap) => gap.goodId));
});
```

- [ ] **Step 2: Run the model tests and verify they fail**

Run:

```bash
npx vitest run src/components/coverage-card-model.test.ts
```

Expected: FAIL because `coverage-card-model.ts` does not exist.

- [ ] **Step 3: Create the presentation contract and formatting helpers**

Implement the focused module:

```ts
import { BUILDINGS } from '../calculations/building-data';
import type { GoodId } from '../calculations/goods';
import type { GrowthGap, GrowthGapChain, GrowthMilestone, GrowthPlanningResult } from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import { calculateSupportedPopulation, throttleCause } from '../calculations/supported-population';
import type { IslandState } from '../island';
import { FACTION_CONFIGS } from '../model';

export type CoverageReason = Readonly<{
  label: string;
  amount: number;
  kind: 'changed' | 'carried' | 'current';
}>;

export type CoverageCardModel = Readonly<{
  id: string;
  goodId: GoodId;
  actionGoodId: GoodId;
  title: string;
  requirement: string;
  breadcrumb: readonly string[];
  outcome: string;
  why: readonly CoverageReason[];
}>;

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));
const buildingLabel = (goodId: GoodId) => BUILDINGS[goodId].label;
const pathLabels = (chain: GrowthGapChain) => [...chain.pathNodeIds]
  .reverse()
  .map((id) => BUILDINGS[nodeById.get(id)!.buildingId].label);

function selectedChain(gap: GrowthGap): GrowthGapChain | null {
  return [...gap.chains].sort((left, right) =>
    right.addedHere - left.addedHere || right.required - left.required,
  )[0] ?? null;
}

function targetDelta(milestone: GrowthMilestone): number {
  return milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
}
```

Implement `milestoneCoverageCards(milestone)` by mapping `milestone.gaps` in their existing order. Use the selected chain's reversed labels, then append either `<Faction>: +N <tier> planned` when the chain changed or a carried source label when it did not. Map every chain into a `CoverageReason`, preserving its scenario amount and changed/carried classification.

Implement `currentCoverageView(islands, planning)` by moving the existing `demandView` mapping out of `CoverageSection`. Return `{ cards, unbuilt }`, preserve acute filtering, scale ranking, starvation detection, and the complete ordered list. Set `actionGoodId` to the deepest `throttleCause.goodId` when starved and otherwise to the constraint good. When a matching `planning?.baseline.gaps` chain exists, add its reversed path ending in `current population`; otherwise return an empty breadcrumb.

- [ ] **Step 4: Replace CoverageSection's local Card/demandView with the adapter**

Remove the local `Card` type and `demandView` function. Import `currentCoverageView`, while retaining the current headroom calculation until Task 4 wires the full context UI.

- [ ] **Step 5: Run the focused calculation and model tests**

Run:

```bash
npx vitest run src/calculations/planning.test.ts src/components/coverage-card-model.test.ts src/App.coverage.test.tsx
```

Expected: PASS, including the unchanged Current integration tests.

- [ ] **Step 6: Commit the shared model**

```bash
git add src/components/coverage-card-model.ts src/components/coverage-card-model.test.ts src/components/CoverageSection.tsx
git commit -m "refactor: model Coverage cards consistently"
```

### Task 3: Extract reusable whole-building producer actions

**Files:**
- Create: `src/components/ProducerActions.tsx`
- Create: `src/components/ProducerActions.test.tsx`
- Modify: `src/components/GrowthGapCard.tsx`
- Modify: `src/styles.css`
- Test: `src/App.growth.test.tsx`

- [ ] **Step 1: Write a failing isolated test for producer identity, output, and mutation**

Create `src/components/ProducerActions.test.tsx`:

```ts
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { createIsland } from '../island';
import { ProducerActions } from './ProducerActions';

describe('ProducerActions', () => {
  test('identifies concrete alternative producers and applies one whole building', () => {
    const land = createIsland('Land');
    land.settled = true;
    const deep = createIsland('Deep');
    deep.settled = true;
    deep.underwater = true;
    const apply = vi.fn();

    render(<ProducerActions
      goodId="chipFactory"
      islands={[land, deep]}
      variant="compact"
      onApplyBuilding={apply}
    />);

    const chip = screen.getByRole('button', { name: 'Build one Chip factory on Land' });
    const recycler = screen.getByRole('button', { name: 'Build one Electronics recycler on Deep' });
    expect(chip).toHaveTextContent('+1 nominal output');
    expect(recycler).toHaveTextContent('+1.5 nominal output');

    fireEvent.click(recycler);
    expect(apply).toHaveBeenCalledWith(deep.id, 'electronicsRecycler');
  });
});
```

- [ ] **Step 2: Run the focused test before extraction**

Run:

```bash
npx vitest run src/components/ProducerActions.test.tsx
```

Expected: FAIL because `ProducerActions.tsx` does not exist.

- [ ] **Step 3: Create ProducerActions with detailed and compact variants**

Move the producer/island enumeration from `GrowthGapCard` into:

```tsx
import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { GOODS, type GoodId } from '../calculations/goods';
import { formatRequirement } from '../calculations/production';
import { canBuildOn, islandProductivity, type IslandState } from '../island';
import { OperatingImpactValues } from './OperatingImpactValues';

type Props = {
  goodId: GoodId;
  islands: readonly IslandState[];
  variant: 'compact' | 'detailed';
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

export function ProducerActions({ goodId, islands, variant, onApplyBuilding }: Props) {
  return <div className={`producer-actions producer-actions--${variant}`}>
    {GOODS.get(goodId)!.producers.flatMap((producer) => islands
      .filter((island) => island.settled && canBuildOn(island, producer.buildingId))
      .flatMap((island) => {
        const productivity = islandProductivity(island, producer.buildingId);
        if (productivity === null) return [];
        const building = BUILDINGS[producer.buildingId];
        const contribution = producer.rate * productivity / 100;
        return [<button
          key={`${producer.buildingId}-${island.id}`}
          type="button"
          className={`producer-action producer-action--${variant}`}
          aria-label={`Build one ${building.label} on ${island.name}`}
          onClick={() => onApplyBuilding(island.id, producer.buildingId)}
        >
          <img src={`/assets/${building.image}`} alt="" width={variant === 'detailed' ? 28 : 20} height={variant === 'detailed' ? 28 : 20} />
          <span>+1 {building.label} · {island.name}</span>
          <small>+{formatRequirement(contribution)} nominal output</small>
          {variant === 'detailed' && <OperatingImpactValues
            impact={building.operatingImpact}
            ecoUnavailable={island.underwater}
          />}
        </button>];
      }))}
  </div>;
}
```

- [ ] **Step 4: Reuse ProducerActions in GrowthGapCard**

Replace the current `good.producers.flatMap(...)` block with:

```tsx
<ProducerActions
  goodId={gap.goodId}
  islands={islands}
  variant="detailed"
  onApplyBuilding={onApplyBuilding}
/>
```

Remove imports now owned by `ProducerActions`. Update the Growth action selectors in `src/styles.css` from `.growth-gap__actions` / `.growth-producer-action` to the detailed variant classes while preserving the current rendered layout.

- [ ] **Step 5: Run Growth tests and visual regression build**

Run:

```bash
npx vitest run src/components/ProducerActions.test.tsx src/App.growth.test.tsx
npm run build
```

Expected: both commands PASS; Growth action labels, mutations, operating impacts, and layout remain available.

- [ ] **Step 6: Commit the extraction**

```bash
git add src/components/ProducerActions.tsx src/components/ProducerActions.test.tsx src/components/GrowthGapCard.tsx src/styles.css
git commit -m "refactor: share producer build actions"
```

### Task 4: Add Coverage contexts, cards, actions, and fallback

**Files:**
- Create: `src/components/CoverageBottleneckCard.tsx`
- Create: `src/components/CoverageSection.test.tsx`
- Modify: `src/components/CoverageSection.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.coverage.test.tsx`

- [ ] **Step 1: Write failing context and quick-build integration tests**

Add helpers to switch to Production and select a Coverage context by accessible label. Add these tests:

```ts
test('keeps Current as the default and exposes active faction milestones', async () => {
  renderApp();
  addIsland();
  await setGrowthResidenceTarget('eco', '100');
  selectWorkspace('Production');

  expect(buttonWithLabel('Show Current coverage')).toHaveAttribute('aria-selected', 'true');
  expect(buttonWithLabel('Show Eco Engineers coverage')).toBeInTheDocument();
  expect(document.querySelector('[aria-label="Show Tycoon Engineers coverage"]')).toBeNull();
});

test('renders the selected milestone as an input-first four-card work queue', async () => {
  renderApp();
  addIsland();
  await setGrowthResidenceTarget('tech', '100');
  selectWorkspace('Production');
  fireEvent.click(buttonWithLabel('Show Tech Researchers coverage'));

  expect(byTestId('coverage-scenario-summary')).toHaveTextContent('Full-demand supply toward');
  expect(document.querySelectorAll('.bottleneck-card')).toHaveLength(4);
  expect(byTestId('coverage-later-gaps')).toBeInTheDocument();
  expect(document.querySelector('.bottleneck-card__breadcrumb')).toHaveTextContent('→');
  expect(document.querySelector('.bottleneck-card details summary')).toHaveTextContent('Why required?');
});

test('adds a concrete building from a milestone bottleneck card', async () => {
  renderApp();
  addIsland();
  await setGrowthResidenceTarget('eco', '100');
  selectWorkspace('Production');
  fireEvent.click(buttonWithLabel('Show Eco Workers coverage'));

  fireEvent.click(buttonWithLabel('Build one Fishery on Island 1'));
  selectWorkspace('Islands');
  expect(input('island-0-owned-fishery')).toHaveValue('1');
});

test('adds the recommended whole building from a Current bottleneck card', async () => {
  renderApp();
  addIsland();
  await setIslandHouses(0, 'eco', '100');
  addBuilding(0, 'fishery');
  await replaceInput(input('island-0-owned-fishery'), '2');
  selectWorkspace('Production');

  fireEvent.click(buttonWithLabel('Build one Fishery on Island 1'));
  selectWorkspace('Islands');
  expect(input('island-0-owned-fishery')).toHaveValue('3');
});

test('keeps a manual milestone visible without settled islands but renders no actions', async () => {
  renderApp();
  await setGrowthResidenceTarget('eco', '100');
  selectWorkspace('Production');

  fireEvent.click(buttonWithLabel('Show Eco Workers coverage'));
  expect(byTestId('coverage-scenario-summary')).toBeInTheDocument();
  expect(document.querySelector('.producer-action')).toBeNull();
});

test('hides milestone contexts when planning inputs are invalid', async () => {
  renderApp();
  await setGrowthResidenceTarget('eco', 'not-a-number');
  selectWorkspace('Production');

  expect(buttonWithLabel('Show Current coverage')).toBeInTheDocument();
  expect(document.querySelector('[aria-label^="Show Eco "]')).toBeNull();
});
```

Create `src/components/CoverageSection.test.tsx` with a controlled plan. Use a helper that creates a minimal milestone with zeroed population arrays and a Fishery gap, then verify same-faction advancement and Current fallback:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { GrowthMilestone, GrowthPlanningResult } from '../calculations/planning';
import { CoverageSection } from './CoverageSection';

const populations = { eco: [0, 0, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] };
const gap = {
  goodId: 'fishery' as const,
  required: 1,
  capacity: 0,
  remaining: 1,
  baselineRequired: 0,
  previousRequired: 0,
  checkpointRequired: 1,
  addedHere: 1,
  chains: [],
};

function milestone(tier: number, complete: boolean): GrowthMilestone {
  return {
    id: `eco-${tier}-step`,
    kind: tier === 1 ? 'expand' : 'ascend',
    faction: 'eco',
    tier,
    populationBefore: populations,
    populationAfter: populations,
    gaps: complete ? [] : [gap],
    complete,
    current: !complete,
  };
}

function planning(firstComplete: boolean, secondComplete: boolean): GrowthPlanningResult {
  return {
    baseline: { gaps: [], complete: true, current: false },
    sequences: {
      eco: [milestone(1, firstComplete), milestone(2, secondComplete)],
      tycoon: [],
      tech: [],
    },
  };
}

test('advances a selected faction context, then falls back to Current', () => {
  const props = { islands: [], onApplyBuilding: vi.fn() };
  const view = render(<CoverageSection {...props} planning={planning(false, false)} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Show Eco Workers coverage' }));

  view.rerender(<CoverageSection {...props} planning={planning(true, false)} />);
  expect(screen.getByRole('tab', { name: 'Show Eco Employees coverage' }))
    .toHaveAttribute('aria-selected', 'true');

  view.rerender(<CoverageSection {...props} planning={planning(true, true)} />);
  expect(screen.getByRole('tab', { name: 'Show Current coverage' }))
    .toHaveAttribute('aria-selected', 'true');
});
```

- [ ] **Step 2: Run Coverage tests and verify the new cases fail**

Run:

```bash
npx vitest run src/App.coverage.test.tsx src/components/CoverageSection.test.tsx
```

Expected: FAIL because Coverage does not yet accept planning, render context tabs, or expose actions.

- [ ] **Step 3: Create the shared bottleneck card renderer**

Create:

```tsx
import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import type { IslandState } from '../island';
import type { CoverageCardModel } from './coverage-card-model';
import { ProducerActions } from './ProducerActions';

type Props = {
  card: CoverageCardModel;
  rank: number;
  islands: readonly IslandState[];
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

export function CoverageBottleneckCard({ card, rank, islands, onApplyBuilding }: Props) {
  return <li className="bottleneck-card" data-testid={`bottleneck-${card.id}`}>
    <h3>
      <img src={`/assets/${BUILDINGS[card.goodId].image}`} alt="" width="26" height="26" />
      <span>{rank}. {card.title}</span>
    </h3>
    <p className="bottleneck-card__requirement">{card.requirement}</p>
    {card.breadcrumb.length > 0 && <p className="bottleneck-card__breadcrumb">
      {card.breadcrumb.join(' → ')}
    </p>}
    <p className="bottleneck-card__outcome">{card.outcome}</p>
    <ProducerActions
      goodId={card.actionGoodId}
      islands={islands}
      variant="compact"
      onApplyBuilding={onApplyBuilding}
    />
    {card.why.length > 0 && <details className="bottleneck-card__why">
      <summary>Why required? · {card.why.length} demand {card.why.length === 1 ? 'path' : 'paths'}</summary>
      <ul>{card.why.map((reason) => <li key={reason.label}>
        <span>{reason.label} · {reason.kind}</span><output>{reason.amount}</output>
      </li>)}</ul>
    </details>}
  </li>;
}
```

Use `formatRequirement` for reason outputs rather than rendering raw numbers.

- [ ] **Step 4: Extend CoverageSection props and render active contexts**

Change its public contract:

```ts
type CoverageSectionProps = {
  islands: readonly IslandState[];
  planning: GrowthPlanningResult | null;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};
```

Store `const [selected, setSelected] = useState<'current' | Faction>('current')`. Derive active milestones with:

```ts
const activeMilestones = Object.fromEntries(FACTIONS.map((faction) => [
  faction,
  planning?.sequences[faction].find((milestone) => !milestone.complete) ?? null,
])) as Record<Faction, GrowthMilestone | null>;

const selectedMilestone = selected === 'current' ? null : activeMilestones[selected];
const effectiveSelection = selected !== 'current' && selectedMilestone === null ? 'current' : selected;
```

Use an effect to commit fallback to Current when a selected branch disappears. Render native tab buttons for Current and non-null faction milestones, with `role="tablist"`, `role="tab"`, `aria-selected`, and labels like `Show Eco Engineers coverage`.

For Current, retain the qualified **Built-chain supply room** strip, Current cards, and `Chains not built yet`. For a milestone, render its same-faction step summary, `milestoneCoverageCards(selectedMilestone).slice(0, 4)`, and chips for `.slice(4)`.

Do not return `null` solely because there is no settled island. Return `null` only when there is neither a settled island nor any active milestone.

- [ ] **Step 5: Wire App's existing planning and mutation into Coverage**

Replace:

```tsx
<CoverageSection islands={state.islands} />
```

with:

```tsx
<CoverageSection
  islands={state.islands}
  planning={planning}
  onApplyBuilding={applyBuilding}
/>
```

- [ ] **Step 6: Run Coverage and Growth integration tests**

Run:

```bash
npx vitest run src/App.coverage.test.tsx src/App.growth.test.tsx src/App.navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the functional UI**

```bash
git add src/components/CoverageBottleneckCard.tsx src/components/CoverageSection.test.tsx src/components/CoverageSection.tsx src/App.tsx src/App.coverage.test.tsx
git commit -m "feat: add Growth contexts to Coverage"
```

### Task 5: Apply the approved neutral visual language

**Files:**
- Modify: `src/styles.css`
- Test: `src/App.coverage.test.tsx`

- [ ] **Step 1: Add semantic class assertions before changing styles**

Add one integration assertion that the selected tab and card sub-elements expose stable classes rather than coupling tests to color values:

```ts
expect(buttonWithLabel('Show Tech Researchers coverage'))
  .toHaveClass('coverage-context-tab--active');
expect(document.querySelector('.bottleneck-card__breadcrumb')).toBeInTheDocument();
expect(document.querySelector('.bottleneck-card__outcome')).toBeInTheDocument();
expect(document.querySelector('.producer-actions--compact')).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npx vitest run src/App.coverage.test.tsx
```

Expected: PASS for semantic structure, or FAIL only for a missing stable class that must be added before CSS.

- [ ] **Step 3: Replace the alarm palette and implement the A1 layout**

Update the Coverage block in `src/styles.css` with panel-local neutral variables and four-column behavior:

```css
.coverage-section {
  --coverage-surface: #202b31;
  --coverage-surface-raised: #25333b;
  --coverage-line: #41545f;
  --coverage-path: #8fb6ca;
  --coverage-outcome: #9fc4aa;
}

.coverage-contexts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  border-bottom: 1px solid var(--coverage-line);
}

.coverage-context-tab {
  border: 0;
  border-right: 1px solid var(--coverage-line);
  border-radius: 0;
  background: transparent;
  color: var(--muted);
  padding: .55rem .7rem;
}

.coverage-context-tab--active {
  background: #2d3d46;
  color: #edf1f2;
  box-shadow: inset 0 -2px #5c9dc1;
}

.coverage-context-tab--active.coverage-context-tab--eco { box-shadow: inset 0 -2px var(--eco); }
.coverage-context-tab--active.coverage-context-tab--tycoon { box-shadow: inset 0 -2px #899197; }
.coverage-context-tab--active.coverage-context-tab--tech { box-shadow: inset 0 -2px var(--tech); }

.coverage-section__cards {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.bottleneck-card {
  border: 1px solid var(--coverage-line);
  background: var(--coverage-surface);
}

.bottleneck-card h3 { color: #dde6ea; }
.bottleneck-card__breadcrumb { color: var(--coverage-path); }
.bottleneck-card__outcome { color: var(--coverage-outcome); }
```

Style compact producer buttons in slate/steel-blue and `Why required?` as a quiet disclosure. Keep faction accents only on the selected tab modifier. Add responsive rules:

```css
@media (max-width: 1100px) {
  .coverage-section__cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 650px) {
  .coverage-section__cards { grid-template-columns: 1fr; }
}
```

Do not use the warning/amber palette for routine card borders, headings, gaps, or active tabs.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests PASS, ESLint exits 0, and TypeScript/Vite build exits 0.

- [ ] **Step 5: Inspect the rendered panel through the existing visual/browser path**

Run the development server with the host-reachable command already established for this repository, open the Production tab, and verify:

- Current retains its headroom and unbuilt-chain hierarchy;
- four cards fit at the wide screenshot viewport without clipped buttons;
- milestone tabs and selected state match the approved neutral A1 mockup;
- breadcrumbs, outcomes, disclosures, and actions remain legible;
- at two-card and one-card breakpoints, nothing overlaps or disappears;
- ordinary gaps have no orange/alarm styling.

- [ ] **Step 6: Commit styling and any verification fixes**

```bash
git add src/styles.css src/App.coverage.test.tsx
git commit -m "style: neutralize Coverage bottlenecks"
```

### Task 6: Independent review and final repository verification

**Files:**
- Modify only files implicated by confirmed review findings.

- [ ] **Step 1: Review the complete diff against the approved spec**

Run:

```bash
git diff c1a3184..HEAD -- src docs/superpowers/specs/2026-08-31-production-coverage-growth-contexts-design.md
```

Check specifically for false ascension claims, Current regressions, alternative-producer mislabelling, stale selected contexts, inaccessible tabs, and routine amber styling.

- [ ] **Step 2: Get a fresh independent diff review**

Run in the foreground:

```bash
git diff c1a3184..HEAD | peer-review --mode diff-review --cd /home/pars/Coding/anno2070_calculator "Review the Production Coverage Growth-context implementation against docs/superpowers/specs/2026-08-31-production-coverage-growth-contexts-design.md. Look for incorrect demand attribution, unsafe or wrong building mutations, stale React state, accessibility regressions, alternative-producer errors, and missing tests."
```

Record the serving model and classify every finding as decision-changing, added verification, unique defect, rejected false positive with reason, or no impact. If `peer-review` cannot obtain a different serving family, use a fresh-context review subagent and state that fallback.

- [ ] **Step 3: Fix confirmed findings test-first**

For each confirmed defect, add the smallest failing test to the closest existing test file, run that focused test to see it fail, apply the minimal fix, and rerun it to PASS. Do not implement speculative review suggestions outside the approved scope.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short --branch
```

Expected: tests PASS, lint/build exit 0, no whitespace errors, and only known concurrent user files remain untracked or modified.

- [ ] **Step 5: Commit review fixes if any**

```bash
git add src/calculations/planning.ts src/calculations/planning.test.ts src/components/coverage-card-model.ts src/components/coverage-card-model.test.ts src/components/ProducerActions.tsx src/components/ProducerActions.test.tsx src/components/GrowthGapCard.tsx src/components/CoverageBottleneckCard.tsx src/components/CoverageSection.tsx src/components/CoverageSection.test.tsx src/App.tsx src/App.coverage.test.tsx src/styles.css
git commit -m "fix: address Coverage context review"
```

If there are no confirmed findings, do not create an empty commit.
