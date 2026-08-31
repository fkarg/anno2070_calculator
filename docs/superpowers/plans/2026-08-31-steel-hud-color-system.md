# Steel HUD Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Steel HUD palette to the existing application without changing layout, markup, behavior, or responsive geometry.

**Architecture:** Keep color ownership in `src/styles.css`: global semantic custom properties define surfaces, structure, state, values, and factions; existing selectors consume those properties. Implement this in two reviewable passes—first a visually neutral tokenization, then the approved palette values and semantic reassignment of overloaded orange uses.

**Tech Stack:** CSS custom properties, Vitest style-contract tests, React/Vite visual verification

---

### Task 1: Tokenize the current palette without changing its appearance

**Files:**
- Modify: `src/styles.test.ts`
- Modify: `src/styles.css:1-1377`

- [ ] **Step 1: Write a failing semantic-token contract test**

Add this test to `src/styles.test.ts`:

```ts
test('defines and consumes semantic color tokens', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  for (const token of [
    '--surface-page', '--surface-panel', '--surface-raised', '--surface-section-heading',
    '--surface-card', '--surface-control',
    '--surface-selected', '--line-strong', '--line-soft', '--text-primary',
    '--text-muted', '--select', '--info', '--success', '--deficit', '--focus',
    '--manual', '--manual-ink', '--manual-wash', '--invalid', '--value-gold',
    '--value-gold-bright', '--eco', '--tycoon', '--tech',
  ]) {
    expect(css).toContain(`${token}:`);
  }

  expect(css).toMatch(/button:focus-visible, input:focus-visible \{[^}]*var\(--focus\)/);
  expect(css).toMatch(/\.workspace-tabs button\[aria-selected="true"\] \{[^}]*var\(--select\)/);
  expect(css).toMatch(/\.population-value--manual \{[^}]*var\(--manual\)/);
  expect(css).toMatch(/\.balance--shortfall \{[^}]*var\(--deficit\)/);
  expect(css).toMatch(/\.balance--surplus \{[^}]*var\(--success\)/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected: FAIL because `--surface-page` and the other semantic properties do not exist yet.

- [ ] **Step 3: Define current-value semantic tokens**

Replace the current `:root` color declarations with semantic names while retaining the current rendered values:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--text-primary);
  background: var(--surface-page);
  font-synthesis: none;
  --surface-page: #11171b;
  --surface-panel: #1b2429;
  --surface-raised: #232e34;
  --surface-section-heading: #263139;
  --surface-card: #202a2f;
  --surface-control: #303c42;
  --surface-control-hover: #3c4a51;
  --surface-input: #11181c;
  --surface-selected: #35434a;
  --surface-subtle: #192126;
  --line-strong: #435159;
  --line-soft: #344148;
  --line-control: #66747b;
  --text-primary: #e9edf1;
  --text-strong: #f5f7f8;
  --text-muted: #aab4ba;
  --select: #f4a75e;
  --info: #8fb6ca;
  --success: #9fd9a6;
  --deficit: #ff9d7a;
  --focus: #f4a75e;
  --manual: #e48a3a;
  --manual-ink: #ffb66f;
  --manual-wash: rgb(180 90 26 / 18%);
  --invalid: #ef665f;
  --presence: #ed8d33;
  --presence-wash: rgb(237 141 51 / 14%);
  --value-gold: #f0d38d;
  --value-gold-bright: #fff2bb;
  --eco: #2c8d43;
  --tycoon: #62676b;
  --tech: #2076b9;
}
```

Remove `--panel`, `--panel-raised`, `--line`, `--muted`, and `--accent` after their consumers have been renamed.

- [ ] **Step 4: Replace current literals with the semantic tokens**

Perform only color-value substitutions in `src/styles.css`. Do not alter complete declarations containing geometry. The required mappings are:

```text
#11171b                         -> var(--surface-page)
#1b2429 / rgb(27 36 41 / 95%) -> var(--surface-panel) / rgb(27 36 41 / 95%)
#232e34                         -> var(--surface-raised)
#263139                         -> var(--surface-section-heading)
#202a2f                         -> var(--surface-card)
#303c42                         -> var(--surface-control)
#3c4a51                         -> var(--surface-control-hover)
#11181c                         -> var(--surface-input)
#35434a                         -> var(--surface-selected)
#192126                         -> var(--surface-subtle)
#435159                         -> var(--line-strong)
#344148                         -> var(--line-soft)
#66747b                         -> var(--line-control)
#e9edf1                         -> var(--text-primary)
#f5f7f8                         -> var(--text-strong)
#aab4ba                         -> var(--text-muted)
#f4a75e / #f3a05a selection    -> var(--select)
#f4a75e focus                   -> var(--focus)
#8fb6ca information paths      -> var(--info)
#9fd9a6 positive states        -> var(--success)
#ff9d7a                         -> var(--deficit)
#e48a3a                         -> var(--manual)
#ffb66f                         -> var(--manual-ink)
rgb(180 90 26 / 18%)           -> var(--manual-wash)
#ef665f                         -> var(--invalid)
#ed8d33 fertility presence      -> var(--presence)
rgb(237 141 51 / 14%) presence -> var(--presence-wash)
#f0d38d                         -> var(--value-gold)
#fff2bb                         -> var(--value-gold-bright)
```

Keep shadow alpha values, white translucent separators, and genuinely distinct island-plaque gradients literal in this pass. Map the Coverage-local variables to global roles without changing their values:

```css
.coverage-section {
  --coverage-surface: #202b31;
  --coverage-surface-raised: #25333b;
  --coverage-line: #41545f;
  --coverage-path: var(--info);
  --coverage-outcome: #9fc4aa;
}
```

- [ ] **Step 5: Run the style test and full verification**

Run:

```bash
npm test -- src/styles.test.ts
npm run lint
npm run build
git diff --check
```

Expected: all commands pass. Inspect `git diff -- src/styles.css` and confirm every changed declaration is color-only: no grid, flex, size, spacing, typography, border-width/radius, breakpoint, display, visibility, overflow, or positioning declaration changes.

- [ ] **Step 6: Commit the neutral tokenization**

```bash
git add src/styles.css src/styles.test.ts
git commit -m "refactor: tokenize application colors"
```

### Task 2: Apply the Steel HUD palette and semantic state colors

**Files:**
- Modify: `src/styles.test.ts`
- Modify: `src/styles.css:1-1377`

- [ ] **Step 1: Write a failing Steel HUD palette test**

Add this test to `src/styles.test.ts`:

```ts
test('uses the approved Steel HUD palette and semantic selection colors', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toContain('--surface-page: #111820;');
  expect(css).toContain('--surface-panel: #1a2530;');
  expect(css).toContain('--surface-raised: #223140;');
  expect(css).toContain('--select: #5c9dc1;');
  expect(css).toContain('--value-gold: #f0d38d;');
  expect(css).toContain('--eco: #4c6329;');
  expect(css).toContain('--tycoon: #4a413b;');
  expect(css).toContain('--tech: #35566a;');

  expect(css).toMatch(/\.tier-selector__option\[aria-pressed="true"\] \{[^}]*var\(--select\)/);
  expect(css).toMatch(/\.growth-target__modes button\[aria-pressed="true"\] \{[^}]*var\(--select\)/);
  expect(css).toMatch(/\.growth-milestone--current \{[^}]*var\(--select\)/);
  expect(css).toMatch(/\.coverage-context-tab--active \{[^}]*var\(--select\)/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/styles.test.ts
```

Expected: FAIL because the semantic tokens still carry the original palette values.

- [ ] **Step 3: Apply the approved base and faction values**

Set the core token values in `:root`:

```css
--surface-page: #111820;
--surface-panel: #1a2530;
--surface-raised: #223140;
--surface-section-heading: #263846;
--surface-card: #202d38;
--surface-control: #202d38;
--surface-control-hover: #2b3b47;
--surface-input: #101a21;
--surface-selected: #294252;
--surface-subtle: #17232d;
--line-strong: #42596a;
--line-soft: #304554;
--line-control: #597080;
--text-primary: #e9edf1;
--text-strong: #f5f7f8;
--text-muted: #a8b6bf;
--select: #5c9dc1;
--info: #8fb6ca;
--success: #9fc4aa;
--deficit: #ff9d7a;
--focus: #f4a75e;
--manual: #d8873d;
--manual-ink: #f1b574;
--manual-wash: rgb(177 93 31 / 18%);
--invalid: #ef665f;
--presence: #9fc4aa;
--presence-wash: rgb(159 196 170 / 14%);
--value-gold: #f0d38d;
--value-gold-bright: #fff2bb;
--eco: #4c6329;
--tycoon: #4a413b;
--tech: #35566a;
```

Apply these remaining surface mappings without changing any other part of their declarations:

```text
#263139 -> var(--surface-section-heading)
#202a2f -> var(--surface-card)
#243038 / #243139 -> #23333f
#182024 / #182227 -> #16242d
#11191d -> var(--surface-input)
#202b31 -> var(--surface-card)
#25333b -> var(--surface-section-heading)
#2d3d46 -> var(--surface-selected)
#233038 -> #22323e
#26343b -> #263946
#30404a -> #2b414f
#394d58 -> #345163
```

- [ ] **Step 4: Separate persistent selection from amber attention states**

Retarget only color declarations in these selectors:

```css
.workspace-tabs button[aria-selected="true"],
.tier-selector__option[aria-pressed="true"],
.growth-target__modes button[aria-pressed="true"],
.growth-target__follow-modes button[aria-pressed="true"],
.tier-cap__option[aria-pressed="true"],
.growth-milestone--current,
.coverage-context-tab--active {
  /* existing individual border/background/box-shadow declarations use
     var(--select) and var(--surface-selected); geometry remains untouched */
}
```

Keep `button:focus-visible` and `input:focus-visible` on `var(--focus)`; manual rows and tier-mini manual markers on `var(--manual)`, `var(--manual-ink)`, and `var(--manual-wash)`; unsettled badges on `var(--manual-ink)`; deficits on `var(--deficit)`; and invalid inputs on `var(--invalid)`. Change `.fertility-picker__option--present` to `var(--presence)` and `var(--presence-wash)`. Change `.island-card__chip--slot` and `.fertility-picker__option--slot` to `var(--value-gold)`. No `--accent` property or consumer remains afterward.

Coverage remains neutral. Promote its path and outcome roles to `var(--info)` and `var(--success)`; do not color routine gap-card borders amber.

- [ ] **Step 5: Consolidate derived-value golds and faction accents**

Use `var(--value-gold)` for normal calculated requirements, operating totals, rounded values, and headroom. Use `var(--value-gold-bright)` only for the strongest computed summary already using the brightest current gold.

Use `var(--eco)`, `var(--tycoon)`, and `var(--tech)` for faction header fills and faction-specific context indicators. Do not introduce Tycoon rust as a global accent or large secondary fill.

- [ ] **Step 6: Run focused and full automated verification**

Run:

```bash
npm test -- src/styles.test.ts
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests and checks pass.

- [ ] **Step 7: Audit the diff for the layout boundary**

Run:

```bash
git diff HEAD^ -- src/styles.css src/styles.test.ts
git diff HEAD^ --word-diff=porcelain -- src/styles.css | rg '^[-+](?![-+])' -P
```

Expected: changes are limited to custom-property definitions and color/background/border-color/box-shadow/text-shadow/filter color values. Reject any change to geometry, typography, markup, or responsive rules.

- [ ] **Step 8: Commit the Steel HUD palette**

```bash
git add src/styles.css src/styles.test.ts
git commit -m "style: apply Steel HUD color system"
```

### Task 3: Verify representative application states visually

**Files:**
- No product files expected

- [ ] **Step 1: Open the existing application without changing persisted data**

Use the existing Vite host at `http://localhost:62579/`. Inspect these existing surfaces:

```text
Permanent population overview: all three faction headers, headroom, and targets
Islands: collapsed and Configure states, fertility availability, manual values, surplus/shortfall
Production: workspace selection, Coverage contexts/cards, production rows, impacts, transfer states
Growth: target-mode selection, manual overrides, current/future/complete milestones, gap cards
Input states: keyboard focus-visible and invalid values
```

- [ ] **Step 2: Inspect desktop and narrow layouts without fixing geometry**

Check the current wide desktop viewport and widths immediately above and below the existing `1050px` breakpoint. Confirm that the palette does not hide borders, flatten the surface hierarchy, or make state colors ambiguous.

If an existing layout defect appears, record it but do not change it. Only color values may be adjusted in this task.

- [ ] **Step 3: Run final verification after any color-only tuning**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short
```

Expected: 304 or more tests pass; lint, build, and diff checks pass; the worktree contains only intentional color-system changes if visual tuning was required.

- [ ] **Step 4: Commit color-only visual tuning when the visual diff is non-empty**

If visual inspection required token-value adjustments:

```bash
git add src/styles.css src/styles.test.ts
git commit -m "style: tune Steel HUD contrast"
```

If no adjustment was needed, do not create an empty commit.
