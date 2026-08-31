# Production-chain Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production target values chain-relative while keeping actual shared-capacity coverage explicitly empire-wide and compacting mixed-producer ownership.

**Architecture:** `ProductionFaction` already receives current node results and global capacity. Pass target node results through the same boundary, derive each target delta from matching node IDs, and retain the good-level demand aggregation only for empire coverage. Render mixed ownership as structured compact lines so CSS can constrain it to the existing extras column.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library

---

### Task 1: Pin the production-row semantics

**Files:**
- Modify: `src/App.actuals.test.tsx`

- [x] **Step 1: Write failing UI assertions**

Update the Growth-target tests to require `target +N`/`target −N` from the visible node's current and target requirements, require `empire build/over` for shared actual capacity, and require mixed ownership to contain separate compact ownership and capacity elements.

```tsx
expect(extras.querySelector('.production-node__mini--target'))
  .toHaveTextContent('target +3.77');
expect(extras.querySelector('.production-node__mini--actual'))
  .toHaveTextContent('empire over 0.59');
expect(extras.querySelector('.production-node__owned-producers'))
  .toHaveTextContent('own 2 chips + 1 recycler');
expect(extras.querySelector('.production-node__owned-capacity'))
  .toHaveTextContent('capacity 3.5');
```

- [x] **Step 2: Verify the tests fail for the intended wording and structure**

Run: `npm test -- --run src/App.actuals.test.tsx`

Expected: failures showing the existing global `target build/over`, `actual build/over`, and one-line producer summary.

### Task 2: Render chain target deltas and constrained ownership

**Files:**
- Modify: `src/components/ProductionSection.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Pass target results into each faction**

Add `targetResults` to `ProductionFaction`'s selected props and remove `targetDemandByGood`; retain `demandByGood` for empire actual coverage.

```tsx
type ProductionFactionInputs = Pick<
  ProductionSectionProps,
  'results' | 'targetResults' | 'empireBalances'
> & { demandByGood: Map<GoodId, number | null> };
```

- [x] **Step 2: Derive the target delta per node**

For every canonical or alternative-route row, compare `targetResults[node.id]` directly with `results[node.id]`. Render `target +N`, `target −N`, or `target —`; omit differences within `BALANCE_EPSILON`.

```tsx
const targetResult = targetResults[node.id];
const targetDelta = result === null || targetResult === null
  ? null
  : targetResult - result;
```

- [x] **Step 3: Separate alternative ownership from capacity**

Render compact producer-role counts in a dedicated wrapping element and capacity in its own element. Keep full building names in the title and accessibility text.

```tsx
<span className="production-node__owned-producers">{alternativeOwnership.summary}</span>
<span className="production-node__mini production-node__owned-capacity">
  {alternativeOwnership.capacity}
</span>
```

- [x] **Step 4: Constrain the extras column**

Give the ownership line a bounded width, normal wrapping, and right alignment. Keep status values non-wrapping.

```css
.production-node__impact {
  grid-template-columns: minmax(0, 1fr) minmax(5.4rem, 10rem);
}
.production-node__owned-producers {
  max-width: 100%;
  text-align: right;
  white-space: normal;
}
```

- [x] **Step 5: Verify the focused behavior**

Run: `npm test -- --run src/App.actuals.test.tsx`

Expected: all tests pass.

### Task 3: Verify and commit

**Files:**
- Modify: `docs/superpowers/specs/2026-09-01-production-chain-targets-design.md`
- Modify: `docs/superpowers/plans/2026-09-01-production-chain-targets.md`

- [x] **Step 1: Run repository verification**

Run: `npm test -- --run && npm run lint && npm run build && git diff --check`

Expected: all commands pass.

- [x] **Step 2: Commit the complete change**

Run: `git add docs/superpowers/specs/2026-09-01-production-chain-targets-design.md docs/superpowers/plans/2026-09-01-production-chain-targets.md src/App.actuals.test.tsx src/components/ProductionSection.tsx src/styles.css && git commit -m "fix: clarify production chain targets"`

Expected: one commit containing the documented behavior, tests, implementation, and styles.
