# Automatic Anno 2070 Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local React calculator that preserves the archived Anno 2070 formulas and imagery while recalculating automatically and supporting per-population-field manual overrides.

**Architecture:** Pure TypeScript calculation modules accept validated values and synchronously return populations and production requirements. React owns only editable state, derives all results during render, and uses controlled inputs to distinguish automatic values from explicit overrides. Literal chain data preserves the legacy calculation order and rounding semantics.

**Tech Stack:** pnpm, React, TypeScript, Vite, Vitest, Testing Library, fast-check, CSS

---

### Task 1: Scaffold the application and verification harness

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/test/setup.ts`
- Modify: `README.md`

- [ ] **Step 1: Add the React/Vite package manifest**

Use scripts `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`), `test:watch`, and `lint` (`eslint .`). Add React runtime packages and TypeScript, Vite, the React Vite plugin, Vitest, jsdom, Testing Library, ESLint, fast-check, and `@fast-check/vitest` as development packages.

- [ ] **Step 2: Install with pnpm**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and dependency installation succeeds.

- [ ] **Step 3: Add the smallest bootable React entry point and test setup**

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

Configure Vitest for `jsdom`, globals, and `src/test/setup.ts`, which imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 4: Verify the empty harness**

Run: `pnpm test && pnpm build`

Expected: Vitest exits successfully with no tests and Vite creates `dist/`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml index.html tsconfig*.json vite.config.ts src/main.tsx src/test/setup.ts README.md
git commit -m "build: scaffold React calculator"
```

### Task 2: Implement population formulas test-first

**Files:**
- Create: `src/calculations/population.ts`
- Create: `src/calculations/population.test.ts`
- Create: `src/calculations/population.property.test.ts`

- [ ] **Step 1: Define compatibility tests before implementation**

Test all maximum-tier branches for both population models, zero houses, and the living-space/Senate combinations. Pin representative legacy values such as:

```ts
expect(calculatePopulation({ faction: 'eco', houses: 100, maxTier: 4, livingSpace: false, senate: false }))
  .toEqual([160, 480, 900, 960]);
expect(calculatePopulation({ faction: 'eco', houses: 100, maxTier: 4, livingSpace: true, senate: true }))
  .toEqual([160, 512, 924, 1188]);
expect(calculatePopulation({ faction: 'tech', houses: 100, maxTier: 3, livingSpace: false, senate: false }))
  .toEqual([200, 1260, 900]);
expect(calculatePopulation({ faction: 'tech', houses: 0, maxTier: 3, livingSpace: true, senate: true }))
  .toEqual([0, 0, 0]);
```

- [ ] **Step 2: Run the compatibility test and verify failure**

Run: `pnpm vitest run src/calculations/population.test.ts`

Expected: FAIL because `population.ts` does not exist.

- [ ] **Step 3: Implement the pure population API literally from legacy lines 37-168**

```ts
export type Faction = 'eco' | 'tycoon' | 'tech';
export type PopulationInput = {
  faction: Faction;
  houses: number;
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
};

export function calculatePopulation(input: PopulationInput): number[] {
  if (input.faction === 'tech') return calculateTechPopulation(input);
  return calculateEcoTycoonPopulation(input);
}
```

Preserve the exact floor order: promotion counts are floored before subtraction, and living-space multipliers are floored into per-house capacity before multiplying by house counts.

- [ ] **Step 4: Verify compatibility tests pass**

Run: `pnpm vitest run src/calculations/population.test.ts`

Expected: PASS.

- [ ] **Step 5: Add property tests**

Generate integer houses from 0 through 100,000, valid faction tiers, and both booleans. Verify finite/non-negative integers, zero houses, zero tiers above the maximum, Eco/Tycoon symmetry, and that bonuses never reduce total inhabitants.

```ts
test.prop({ houses: fc.integer({ min: 0, max: 100_000 }), maxTier: fc.integer({ min: 1, max: 4 }) })
  ('returns valid eco populations', ({ houses, maxTier }) => {
    const result = calculatePopulation({ faction: 'eco', houses, maxTier, livingSpace: false, senate: false });
    expect(result.every(Number.isSafeInteger)).toBe(true);
    expect(result.every((value) => value >= 0)).toBe(true);
    expect(result.slice(maxTier).every((value) => value === 0)).toBe(true);
  });
```

- [ ] **Step 6: Run calculation tests and commit**

Run: `pnpm vitest run src/calculations/population.test.ts src/calculations/population.property.test.ts`

Expected: PASS.

```bash
git add src/calculations/population.ts src/calculations/population*.test.ts
git commit -m "feat: add tested population calculations"
```

### Task 3: Implement production primitives test-first

**Files:**
- Create: `src/calculations/production.ts`
- Create: `src/calculations/production.test.ts`
- Create: `src/calculations/production.property.test.ts`

- [ ] **Step 1: Test primary and dependent production semantics**

```ts
expect(calculatePrimary([250, 364, 571, 800], [250, 364, 571, 800], 100, false, false)).toBe(4);
expect(calculatePrimary([0, 571, 800, 1250], [0, 571, 800, 1250], 100, true, false)).toBeCloseTo(3.55);
expect(calculateMaterial(1.01, 2, 100, true)).toBe(3);
expect(formatRequirement(1.23001)).toBe('1.24');
```

The primary function accepts satisfaction values, tier populations, productivity percent, the recycling flag, and the whole-building flag. Recycling multiplies tiers 2-4 by `0.85`. Whole-building rounding applies before a parent result feeds a child.

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run src/calculations/production.test.ts`

Expected: FAIL because the production module does not exist.

- [ ] **Step 3: Implement the pure primitives from legacy lines 172-211**

```ts
export function calculateMaterial(parent: number, multiplier: number, productivity: number, wholeBuildings: boolean): number {
  const result = parent * multiplier / (productivity / 100);
  return wholeBuildings ? Math.ceil(result) : result;
}

export function formatRequirement(value: number): string {
  return String(Math.ceil(value * 100) / 100);
}
```

`calculatePrimary` must skip satisfaction entries equal to zero instead of dividing by them.

- [ ] **Step 4: Add generated invariants**

For valid positive productivity and non-negative populations, verify finite/non-negative results, population monotonicity, productivity antitonicity, recycling non-increase, whole-building integrality, and whole-building results greater than or equal to fractional results.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm vitest run src/calculations/production.test.ts src/calculations/production.property.test.ts`

Expected: PASS.

```bash
git add src/calculations/production.ts src/calculations/production*.test.ts
git commit -m "feat: add tested production primitives"
```

### Task 4: Encode and verify every legacy supply chain

**Files:**
- Create: `src/calculations/production-data.ts`
- Create: `src/calculations/calculate-production.ts`
- Create: `src/calculations/calculate-production.test.ts`
- Create: `src/calculations/calculate-production.property.test.ts`

- [ ] **Step 1: Define stable building identifiers and literal chain nodes**

```ts
export type ProductionNode = {
  id: string;
  label: string;
  faction: Faction;
  image: string;
  depth: number;
  alternate?: boolean;
  calculation:
    | { kind: 'primary'; satisfaction: readonly number[]; recyclable?: boolean }
    | { kind: 'material'; parentId: string; multiplier: number };
};
```

Transcribe every call from archived `functions_Qoor.js:226-328` in the same parent-before-child order. Correct spelling only in stable IDs and labels; keep separate nodes for repeated legacy inputs such as the two Eco vegetable, chip, copper, and sand chains and the two Tech algae/platinum chains.

- [ ] **Step 2: Add exhaustive structural and compatibility tests before the evaluator**

Assert that IDs are unique, each material parent appears earlier in the same faction, every node maps to an existing downloaded image, and the faction counts match the archived form. Use all-100% representative fixtures for Eco, Tycoon, and Tech to pin every returned ID, not only top-level goods. For the example below, use Eco population `[1000, 2000, 3000, 4000]`.

```ts
expect(Object.keys(result)).toEqual(PRODUCTION_NODES.map(({ id }) => id));
expect(result.ecoHealthFood).toBeCloseTo(2000 / 667 + 3000 / 857 + 4000 / 1000);
expect(result.ecoVegetablesHealthFood).toBeCloseTo(result.ecoHealthFood * 2);
```

- [ ] **Step 3: Run and verify failure**

Run: `pnpm vitest run src/calculations/calculate-production.test.ts`

Expected: FAIL because the data and evaluator do not exist.

- [ ] **Step 4: Implement one ordered evaluator**

```ts
export type ProductionInput = {
  population: Record<Faction, readonly number[]>;
  productivity: Record<string, number>;
  recycling: boolean;
  wholeBuildings: boolean;
};

export function calculateProduction(input: ProductionInput): Record<string, number> {
  const result: Record<string, number> = {};
  for (const node of PRODUCTION_NODES) {
    const productivity = input.productivity[node.id];
    result[node.id] = node.calculation.kind === 'primary'
      ? calculatePrimary(node.calculation.satisfaction, input.population[node.faction], productivity, Boolean(node.calculation.recyclable && input.recycling), input.wholeBuildings)
      : calculateMaterial(result[node.calculation.parentId], node.calculation.multiplier, productivity, input.wholeBuildings);
  }
  return result;
}
```

- [ ] **Step 5: Add whole-engine properties**

Generate valid faction populations and productivity maps. Verify all outputs are finite/non-negative, zero population makes all nodes zero, increased productivity affects only the node and its descendants without increasing either, recycling changes only the three intended Eco subtrees, and whole-building mode produces integers at every node.

- [ ] **Step 6: Run all calculation tests and commit**

Run: `pnpm vitest run src/calculations`

Expected: all calculation example and property tests PASS.

```bash
git add src/calculations/production-data.ts src/calculations/calculate-production.ts src/calculations/calculate-production*.test.ts
git commit -m "feat: encode tested production chains"
```

### Task 5: Add controlled calculator state and population UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/model.ts`
- Create: `src/components/NumericInput.tsx`
- Create: `src/components/PopulationSection.tsx`
- Create: `src/components/PopulationFaction.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Test automatic recalculation and per-field overrides**

Render `App`, enter Eco houses, select a tier portrait, and assert the four visible populations update without a Calculate button. Edit Engineers, assert its Manual state and value persist across a house change, click its Auto control, and assert it shows the new derived value. Test zero houses, invalid input, and Reset all.

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run src/App.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement stored and derived state**

```ts
export type EditableNumber = { raw: string; value: number | null };
export type PopulationOverride = EditableNumber | null;

const derived = calculatePopulation(validFactionInput);
const effective = derived.map((value, index) => overrides[index]?.value ?? value);
```

Keep the raw input string at the UI boundary so an empty field is typeable. Mark it invalid when parsing fails; do not call the calculation engine until all dependencies are valid.

- [ ] **Step 4: Implement the original-image tier selector and manual styling**

Use downloaded `eco_01_Qoor.png` through `eco_04_Qoor.png`, Tycoon equivalents, and Tech equivalents. Each portrait is a labelled radio-style button with `aria-pressed`; selected state must not rely only on color. Population inputs always remain visible. A manual field gets a text label, class, and field-level Auto button.

- [ ] **Step 5: Run UI and calculation tests and commit**

Run: `pnpm test`

Expected: PASS.

```bash
git add src/App.tsx src/model.ts src/components src/App.test.tsx
git commit -m "feat: add automatic population controls"
```

### Task 6: Add the production UI and live productivity controls

**Files:**
- Create: `src/components/ProductionSection.tsx`
- Create: `src/components/ProductionFaction.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Test production workflows**

Assert the production table renders all nodes with their original images and text, factory requirements are output-only, a productivity edit recalculates the node and descendants, faction-wide ±1% changes the explicit faction node list, recycling changes only intended requirements, and whole-building mode renders integer results.

- [ ] **Step 2: Run and verify failure**

Run: `pnpm vitest run src/App.test.tsx`

Expected: FAIL on the first missing production behavior.

- [ ] **Step 3: Render the three faction columns from production data**

Each row renders the configured original image, text label, formatted requirement, and controlled productivity input. Use `depth` for visual indentation and `alternate` for the original grey alternate-source treatment. Render `—` when the relevant inputs are invalid.

- [ ] **Step 4: Implement explicit bulk productivity updates**

```ts
function adjustFactionProductivity(faction: Faction, delta: number): void {
  setState((current) => updateProductivity(
    current,
    PRODUCTION_NODES.filter((node) => node.faction === faction).map((node) => node.id),
    delta,
  ));
}
```

Do not use prefix matching or `parseInt`; preserve valid decimal percentages.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test`

Expected: PASS.

```bash
git add src/App.tsx src/App.test.tsx src/components/Production*.tsx
git commit -m "feat: add live production calculator"
```

### Task 7: Apply the conservative visual cleanup and original assets

**Files:**
- Create: `src/styles.css`
- Create: `public/assets/` (copied original calculator images only)
- Modify: `src/App.tsx`
- Modify: `src/components/PopulationFaction.tsx`
- Modify: `src/components/ProductionFaction.tsx`

- [ ] **Step 1: Copy only relevant original images into stable asset paths**

Copy the population, house, bonus, calculation, recycling, factory, material, converter, and arrow PNGs from the downloaded companion directory. Do not add emoji, icon libraries, or newly generated artwork. Donation, validator, and license-badge images are not application assets.

- [ ] **Step 2: Style the original information hierarchy**

Use bordered sections for Residences & Inhabitants, Productivity, and Tips; Eco green, Tycoon charcoal, and Tech blue faction headers; compact desktop comparison columns; visible labels; original grey alternate-source rows; and clear focus, selected, invalid, Auto, and Manual states.

- [ ] **Step 3: Add concise guidance, Tips, and attribution**

Explain automatic calculation and overrides in a short collapsible guidance block. Preserve the copper converter tip. Link the archived source and BY-NC-SA 4.0 attribution in the footer. Do not include donation, analytics, validator, download, maintenance, or contact content.

- [ ] **Step 4: Verify responsive behavior manually**

Run: `pnpm dev --host 127.0.0.1`

Check desktop and narrow viewports. Expected: population groups remain understandable, faction production relationships remain visible through section stacking or horizontal overflow, and no input becomes unreachable.

- [ ] **Step 5: Commit**

```bash
git add public/assets src/styles.css src/App.tsx src/components README.md
git commit -m "feat: style calculator with original artwork"
```

### Task 8: Final verification and documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document exact local commands**

Document `pnpm install`, `pnpm dev`, `pnpm test`, and `pnpm build`, plus the location and purpose of the archived reference snapshot.

- [ ] **Step 2: Run the full automated verification**

Run: `pnpm test && pnpm build && pnpm lint`

Expected: every command exits 0.

- [ ] **Step 3: Audit scope and imagery**

Search application source for Calculate buttons, emoji replacements, external analytics/donation URLs, `NaN`, and `Infinity`. Inspect the built page and verify each rendered production/population image resolves to an original downloaded asset.

- [ ] **Step 4: Commit final documentation or fixes**

```bash
git add README.md src public package.json pnpm-lock.yaml
git commit -m "docs: document local calculator workflow"
```

- [ ] **Step 5: Request independent review**

Run fresh-context correctness, test-quality, simplicity, and visual/runtime reviews. Apply only findings that are within the approved design, then rerun the full verification command.
