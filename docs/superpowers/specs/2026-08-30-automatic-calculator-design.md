# Automatic Anno 2070 Calculator Design

## Goal

Rebuild the downloaded Anno 2070 Deep Ocean supply-and-demand calculator as a local React application. Preserve its complete calculation behavior and useful three-faction comparison layout while improving readability and recalculating immediately after every relevant edit.

This first version covers one combined population model. Multi-island precision is explicitly deferred.

## Source Material

The downloaded HTML, JavaScript, and image directory are the behavioral and visual reference. The rebuild will reuse the original images wherever an appropriate image exists. An original image may be paired with a text label for clarity. It must not be replaced by an unrelated emoji, generic icon, or invented artwork.

Keep concise usage guidance, the Tips section, and source/license attribution. Remove obsolete donation, download, analytics, validator, maintenance, and contact elements.

## Technology

- React and TypeScript for rendering and controlled input state.
- Vite for the local development and static build workflow.
- pnpm for package management and scripts.
- Vitest for tests.
- `fast-check` and its Vitest connector for property-based calculation tests.
- No state library, backend, persistence layer, or generalized multi-island model.

React is restricted to the presentation and interaction layer. Calculation modules must not import React or access the DOM.

## Architecture and Data Flow

The application has a single directional calculation flow:

1. Accept user-owned input state.
2. Derive population tiers from residences and selected bonuses.
3. Overlay any per-tier manual population values.
4. Calculate every production chain from the effective population.
5. Render the resulting factory requirements.

Stored state contains only:

- residence counts;
- highest population tier per faction;
- living-space and Senate bonus choices;
- a nullable manual override for each population tier;
- each building's productivity percentage;
- recycling and whole-building rounding choices.

Derived population values, effective population, and factory counts are recalculated synchronously and are never copied into stored state.

### Calculation modules

- `population.ts` exposes typed, pure residence-to-population calculations.
- `production.ts` contains pure production primitives, rounding behavior, and chain evaluation.
- `production-data.ts` contains the literal faction supply chains, satisfaction coefficients, and parent/child multipliers.

Supply chains remain literal and faction-specific. Similar-looking goods from separate legacy chains remain separate productivity inputs. The rebuild will not normalize them into a speculative universal goods graph.

## Population Interaction

The page keeps the original Eco, Tycoon, and Tech grouping. Each faction always shows:

- residence count;
- original population portraits as an easily selectable highest-tier control;
- the living-space and Senate options with original artwork;
- editable boxes for every population tier.

An untouched population box displays its live calculated value with neutral styling. Editing it creates a manual override for that field only. A manual field is distinctly highlighted, stays fixed while other automatic fields respond to upstream changes, and exposes an `Auto` control. Selecting `Auto` removes only that override and immediately displays the current derived value.

A manual override remains manual even when its number happens to equal the derived number. Production always consumes the effective value after overrides are applied.

Setting a residence count to zero makes all non-overridden population tiers zero. This deliberately fixes the legacy page's stale-value behavior.

## Production Interaction

The production section retains the original side-by-side Eco, Tycoon, and Tech comparison and the visual indentation of dependent supply-chain buildings.

- Every original factory, material, alternate source, converter, and arrow image is reused where applicable, with text labels added for clarity.
- Productivity remains editable per production building and defaults to 100%.
- The original per-faction `-1%` and `+1%` controls remain and target an explicit list of that faction's productivity fields.
- The recycling option affects only Communicators, Service Bots, and 3D Projectors as in the source formulas.
- The confusing legacy exact-calculation label becomes `Round up to whole buildings`; its checked behavior remains the same.
- Factory requirements are output-only and update on every relevant input change.
- Alternate production sources remain visibly distinguished and are not presented as additive requirements.

There are no Calculate buttons.

## Layout and Visual Direction

Use a conservative cleanup between the original page and the cleaned-up mockup:

- preserve the original information density, faction colors, terminology, three-column production comparison, and recognizable fieldset hierarchy;
- improve spacing, alignment, labels, selected states, contrast, and responsiveness;
- use original images plus text rather than substituting unrelated imagery;
- keep automatic and manual states visually obvious without reorganizing the calculator into a dashboard-style application.

Desktop is the primary dense comparison layout. Narrow viewports may scroll or stack at section boundaries, but must retain clear faction and supply-chain relationships.

## Validation and Reset Behavior

- Residence and population inputs accept non-negative integers.
- Productivity inputs accept positive finite numbers.
- The UI permits temporary empty text while editing, marks invalid fields, and displays `—` for dependent results until the input is valid.
- Invalid input never reaches the pure calculation functions and never produces visible `NaN` or `Infinity`.
- `Reset all` restores residence and productivity defaults, bonus and rounding defaults, and clears every manual override.

## Test Strategy and Implementation Order

The calculation behavior is implemented test-first before the React interface.

### Compatibility examples

Fixed examples cover:

- every population faction, maximum-tier branch, living-space option, and Senate option;
- every primary production item and every dependent chain;
- recycling on and off;
- fractional and whole-building modes;
- floor and ceiling boundaries where operation order affects results;
- representative results captured from the downloaded calculator.

### Property-based tests

Generated valid inputs cover these invariants:

- results are finite and non-negative;
- zero effective population produces zero demand;
- tiers above the selected maximum contain zero derived inhabitants;
- living-space and Senate bonuses never reduce total population;
- increasing effective population cannot reduce a directly dependent factory requirement;
- increasing a building's productivity cannot increase its requirement;
- fractional mode preserves the linear production relationships within numerical tolerance;
- whole-building mode produces integer factory counts at every stage and never underproduces relative to fractional mode;
- recycling never increases affected requirements and leaves unrelated chains unchanged;
- Eco and Tycoon population calculations are symmetric for identical inputs;
- applying and removing a manual override changes only the corresponding effective population input.

Counterexamples must retain their generated seed and shrink to a minimal reproducible case.

### UI workflow tests

A small integration-focused UI test set verifies:

- every relevant edit recalculates without a button;
- an edited population field becomes and remains Manual;
- upstream edits do not overwrite manual values;
- `Auto` restores derivation for one field;
- invalid fields suppress dependent results without stale values;
- productivity edits and faction-wide adjustments propagate immediately;
- factory counts are not editable;
- reset restores defaults and automatic mode.

## Completion Criteria

- All legacy population and production formulas are represented in pure TypeScript.
- Compatibility and property-based calculation tests pass.
- The React page uses the downloaded original assets and contains no unrelated replacement imagery.
- All relevant inputs recalculate automatically.
- Per-field population overrides and productivity editing behave as specified.
- The application runs with documented pnpm commands and produces a static build.
- Relevant unit, property, UI, type-check, and build verification pass.
