# Production-Tier Dimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strongly dim and make non-interactive each production tree that first becomes necessary above its faction's selected highest population tier.

**Architecture:** Keep calculations and stored productivity unchanged. `ProductionSection` will derive availability from each tree root's existing satisfaction array and the faction's `maxTier`, then apply an inactive modifier class and disable the tree's productivity inputs. CSS owns the visual treatment; an App-level integration test pins the user-visible state transition.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Cover inactive production trees

**Files:**
- Modify: `src/App.production-structure.test.tsx`
- Modify: `src/components/ProductionSection.tsx`
- Modify: `src/components/NumericInput.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing integration test**

Add a test that renders the app at the default tier-one population, checks that Eco's `ecoHealthFood` tree has the inactive class and a disabled productivity input, then clicks the Employees highest-tier portrait and checks that the class and disabled state are removed.

```tsx
const healthFoodTree = productionRow('ecoHealthFood').closest('.production-tree')!;
expect(healthFoodTree).toHaveClass('production-tree--inactive');
expect(input('ecoHealthFood-productivity')).toBeDisabled();

fireEvent.click(buttonWithLabel('Eco Employees'));

expect(healthFoodTree).not.toHaveClass('production-tree--inactive');
expect(input('ecoHealthFood-productivity')).not.toBeDisabled();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm test src/App.production-structure.test.tsx`

Expected: FAIL because inactive production trees are not represented in the rendered DOM.

- [ ] **Step 3: Implement the smallest availability derivation**

In `ProductionFaction`, obtain the root node for each built production tree. Mark the tree inactive when every satisfaction entry at or below `state.factions[faction].maxTier` is zero. Apply `production-tree--inactive` to its section and pass `disabled={inactive}` to each tree productivity input. Add a visually-hidden description that makes the inactive state available to assistive technology. Add an optional `disabled` prop to `NumericInput` and pass it through to its native input.

```tsx
const rootNode = nodeById.get(tree.rootId)!;
const inactive = rootNode.calculation.kind === 'primary'
  && rootNode.calculation.satisfaction
    .slice(0, state.factions[faction].maxTier)
    .every((satisfaction) => satisfaction === 0);
```

- [ ] **Step 4: Add the inactive visual treatment**

Add a focused CSS modifier that uses low opacity and reduced saturation for `.production-tree--inactive`, while preserving the existing layout. Disabled inputs receive the browser's non-interactive behavior.

```css
.production-tree--inactive {
  opacity: .28;
  filter: grayscale(1);
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `pnpm test src/App.production-structure.test.tsx`

Expected: PASS with all production-structure tests green.

- [ ] **Step 6: Run complete verification and commit**

Run:

```bash
pnpm test
pnpm lint
pnpm build
git add src/App.production-structure.test.tsx src/components/ProductionSection.tsx src/styles.css docs/superpowers/plans/2026-08-30-production-tier-dimming.md
git commit -m "feat: dim unavailable production chains"
```

Expected: test suite, lint, and production build all exit successfully; the commit includes only this feature's files.
