# Production Cost Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put rounded per-chain building costs first in production rows, keep fractional costs muted beneath them, and show root-scoped rounded building counts with the global chain total in every footer.

**Architecture:** Calculate a fractional production dataset independently of the existing whole-building display toggle, then extend `calculateOperatingImpacts` so it owns all rounding and root-variant membership. `ProductionSection` renders the returned rounded direct impacts and variant building counts; it does not infer or aggregate chain membership itself. Existing owned count/capacity/build-gap summaries remain unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Expose rounded direct impacts and root-scoped counts

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/calculations/operating-impact.ts`
- Test: `src/calculations/operating-impact.test.ts`

- [ ] **Step 1: Write failing calculation assertions**

Extend the fractional-direct test to require a whole-building counterpart:

```ts
expect(result.direct.ecoCommunicators).toEqual({
  maintenanceCredits: -2,
  power: -0.4,
  ecoBalance: -0.4,
});
expect(result.roundedDirect.ecoCommunicators).toEqual({
  maintenanceCredits: -20,
  power: -4,
  ecoBalance: -4,
});
```

Add a root-isolation assertion where the same building type has requirements in two roots:

```ts
requirements.ecoCommunicators = 1.1;
requirements.ecoMicrochipsCommunicators = 1.1;
requirements.ecoMicrochipsServiceBots = 9.1;

const full = calculateOperatingImpacts(requirements)
  .byRoot.ecoCommunicators.find((variant) => variant.id === 'ecoMicrochipsCommunicators')!;

expect(full.roundedBuildings).toContainEqual({
  nodeId: 'ecoMicrochipsCommunicators',
  count: 2,
});
expect(full.roundedBuildings).not.toContainEqual({
  nodeId: 'ecoMicrochipsServiceBots',
  count: 10,
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test src/calculations/operating-impact.test.ts
```

Expected: FAIL because `roundedDirect` and `roundedBuildings` do not exist.

- [ ] **Step 3: Add the calculation data**

Add these public shapes:

```ts
export type RoundedBuildingRequirement = Readonly<{
  nodeId: string;
  count: number;
}>;

export type VariantOperatingImpact = Readonly<{
  id: string;
  label: string;
  roundedBuildings: readonly RoundedBuildingRequirement[] | null;
  impact: OperatingImpact | null;
}>;

export type ProductionOperatingImpacts = Readonly<{
  direct: Readonly<Record<string, OperatingImpact | null>>;
  roundedDirect: Readonly<Record<string, OperatingImpact | null>>;
  byRoot: Readonly<Record<string, readonly VariantOperatingImpact[]>>;
}>;
```

Populate `roundedDirect` beside `direct` using `Math.ceil(count)`. While iterating each variant's existing `nodeIds`, append `{ nodeId, count: Math.ceil(count) }` only when the rounded count is greater than zero. If any requirement is invalid, return both `roundedBuildings: null` and `impact: null` for that variant. Return `{ direct, roundedDirect, byRoot }`.

In `App`, calculate the impact input independently of the Req-column toggle:

```ts
const fractionalProduction = calculateAvailableProduction({
  population: islandPopulations,
  productivity,
  recycling: state.plan.recycling,
  wholeBuildings: false,
});
const operatingImpacts = calculateOperatingImpacts(fractionalProduction);
```

Keep the existing `production` calculation, including `state.plan.wholeBuildings`, for the displayed requirements and downstream demand calculations.

- [ ] **Step 4: Run calculation tests and verify GREEN**

Run:

```bash
pnpm test src/calculations/operating-impact.test.ts
```

Expected: all operating-impact tests pass.

- [ ] **Step 5: Commit the calculation boundary**

```bash
git add src/App.tsx src/calculations/operating-impact.ts src/calculations/operating-impact.test.ts
git commit -m "feat: expose rounded chain operating costs"
```

### Task 2: Render rounded first, fractional second, and named footer counts

**Files:**
- Modify: `src/components/ProductionSection.tsx`
- Modify: `src/styles.css`
- Test: `src/App.actuals.test.tsx`
- Test: `src/App.production-structure.test.tsx`

- [ ] **Step 1: Write failing component assertions**

In `src/App.actuals.test.tsx`, set 100 Eco houses, then assert ordered Fishery impact lines (4.18 fractional buildings versus 5 rounded buildings):

```ts
const impacts = productionRow('ecoFish')
  .querySelectorAll('.production-node__impact-line');
expect(impacts[0]).toHaveClass('production-node__impact-line--rounded');
expect(impacts[1]).toHaveClass('production-node__impact-line--fractional');
expect(impacts[0]).toHaveTextContent('maintenance credits per minute:-25');
expect(impacts[1]).toHaveTextContent('maintenance credits per minute:-20.9');
```

Toggle `Round up to whole buildings` and assert these two cost lines retain the same distinct values while the Req field uses the whole-building result.

Replace the old owned-cost-line assertion with a check that owned counts and capacity still render in `extras-ecoFish`.

In `src/App.production-structure.test.tsx`, assert a footer renders its full-chain label and included rounded building counts:

```ts
const footer = byTestId('variant-ecoFish-full');
expect(footer).toHaveTextContent('Full chain');
expect(footer).toHaveTextContent(/Fishery ×\d+/);
```

- [ ] **Step 2: Run focused UI tests and verify RED**

Run:

```bash
pnpm test src/App.actuals.test.tsx src/App.production-structure.test.tsx
```

Expected: FAIL because the rounded/fractional classes and footer counts are not rendered.

- [ ] **Step 3: Render the new hierarchy**

In `ProductionSection`, read both direct maps:

```ts
const fractional = operatingImpacts.direct[node.id];
const rounded = operatingImpacts.roundedDirect[node.id];
```

Render rounded before fractional with explicit accessible context:

```tsx
<div className="production-node__impact-line production-node__impact-line--rounded">
  <span className="visually-hidden">Rounded required buildings: </span>
  {rounded === null ? <span>—</span> : <OperatingImpactValues impact={rounded} />}
</div>
<div className="production-node__impact-line production-node__impact-line--fractional">
  <span className="visually-hidden">Fractional requirement: </span>
  {fractional === null ? <span>—</span> : <OperatingImpactValues impact={fractional} />}
</div>
```

Remove the owned-building `actualImpact` aggregation and row. Keep `ownedTotal`, capacity, and build-gap calculation unchanged.

Change the impact header suffix from `costs · demand / actual / owned` to `costs · rounded / fractional / owned`.

Render each footer's rounded building list from `variant.roundedBuildings`:

```tsx
<span className="production-tree__variant-label">
  <strong>{variant.label}</strong>
  {variant.roundedBuildings?.map(({ nodeId, count }) => (
    <span key={nodeId}>{BUILDINGS[nodeById.get(nodeId)!.buildingId].label} ×{count}</span>
  ))}
</span>
```

When `roundedBuildings` is `null`, render the existing unavailable marker and no partial count list.

- [ ] **Step 4: Apply the explicit color hierarchy**

Replace the inherited impact colors with scoped rules:

```css
.production-node__impact-line--rounded { color: #f0d38d; }
.production-node__impact-line--fractional { color: var(--muted); font-size: .7rem; }
.production-tree__variant-label { display: flex; flex-wrap: wrap; gap: .2rem .55rem; }
.production-tree__variant-label > span { color: var(--muted); }
```

Keep `.production-tree__variants` orange so its total operating impact remains visually strongest.

- [ ] **Step 5: Run focused UI tests and verify GREEN**

Run:

```bash
pnpm test src/App.actuals.test.tsx src/App.production-structure.test.tsx
```

Expected: both test files pass.

- [ ] **Step 6: Commit the production view**

```bash
git add src/components/ProductionSection.tsx src/styles.css src/App.actuals.test.tsx src/App.production-structure.test.tsx
git commit -m "style: prioritize rounded production costs"
```

### Task 3: Visual and repository verification

**Files:**
- Modify only if verification exposes a defect in the files above.

- [ ] **Step 1: Inspect representative rows in the browser**

Use an Eco population that creates a fractional Fishery requirement and inspect:

- yellow whole-building impact on the first line;
- grey fractional impact on the second line;
- orange full-chain footer total;
- full-chain footer contains `Fishery ×N`;
- Communicators variants list only their own chain-specific chip-factory count.

- [ ] **Step 2: Run complete verification**

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

Expected: all tests pass, lint exits zero, production build succeeds, and the diff check is empty.

- [ ] **Step 3: Request a fresh-context read-only review**

Ask the reviewer to check rounded-versus-fractional semantics, root scoping for shared building types, invalid variants, accessible labels, and whether owned actuals remain available through the separate summaries. Fix any concrete defects and repeat Step 2.

- [ ] **Step 4: Commit verification fixes if needed**

```bash
git add src/calculations/operating-impact.ts src/calculations/operating-impact.test.ts src/components/ProductionSection.tsx src/styles.css src/App.actuals.test.tsx src/App.production-structure.test.tsx
git commit -m "fix: finish production cost hierarchy"
```
