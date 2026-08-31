# Steel HUD Color System — Design

## Goal

Adopt a more recognizable Anno 2070 color language throughout the existing calculator without changing its layout, component structure, density, or behavior.

The selected direction is **Steel HUD**: cooler blue-steel surfaces, darker faction colors sampled from the shipped game assets, steel blue for selection and informational paths, muted green for resolved or unlocked outcomes, and parchment gold for calculated values. Amber remains semantic rather than acting as the application's general accent.

## Non-negotiable layout boundary

This is a color-only change.

Implementation must not change:

- grid or flex definitions;
- widths, heights, gaps, padding, or margins;
- typography sizes, weights, or line heights;
- borders' widths or radii;
- responsive breakpoints;
- component markup or ordering;
- visibility, wrapping, truncation, or overflow behavior;
- interaction behavior or accessible semantics.

The color-direction companion was disposable comparison scaffolding. Its layout is not a design reference and must not be copied into the application.

## Token model

First replace scattered color literals with semantic custom properties at their current values. This first pass must produce no intentional visual change. The subsequent palette pass changes token values and retargets color-only declarations.

The global token groups are:

```css
/* Surfaces */
--surface-page: #111820;
--surface-panel: #1a2530;
--surface-raised: #223140;
--surface-control: #202d38;
--surface-selected: #294252;

/* Structure and text */
--line-strong: #42596a;
--line-soft: #304554;
--text-primary: #e9edf1;
--text-muted: #a8b6bf;

/* State and meaning */
--select: #5c9dc1;
--info: #8fb6ca;
--success: #9fc4aa;
--deficit: #ff9d7a;
--focus: #f4a75e;
--manual: #d8873d;
--manual-ink: #f1b574;
--manual-wash: rgb(177 93 31 / 18%);
--invalid: #ef665f;

/* Calculated values */
--value-gold: #f0d38d;
--value-gold-bright: #fff2bb;

/* Factions */
--eco: #4c6329;
--tycoon: #4a413b;
--tech: #35566a;
```

Exact values may receive small contrast-driven adjustments during implementation, but their roles must not be recombined. In particular, `--select`, `--focus`, `--manual`, and `--deficit` are intentionally separate.

## Semantic use

### Surfaces and structure

The page, panels, raised headings, controls, and selected controls move slightly toward dark blue. The hierarchy remains as it is today: raised headings are lighter than panels, and controls remain distinct without becoming visually louder than their content.

Borders use steel-blue gray. Strong borders delimit panels and controls; soft borders separate rows. No shadows, gradients, or decorative effects are added as part of this work.

### Selection and focus

Steel blue replaces orange for persistent selection:

- active workspace tabs;
- active population-tier controls;
- active Growth target modes;
- selected milestones and Coverage contexts;
- presence/selected states that currently reuse the general orange accent.

Keyboard focus remains amber because it has stronger contrast against the dark surfaces and is transient. Selection must remain distinguishable through an existing non-color cue such as border, inset line, or pressed state; implementation does not add or resize those cues.

### Warnings, manual values, and invalid input

Amber is limited to states that need attention:

- keyboard focus;
- manual population overrides;
- unsettled or pending state where amber already communicates incompleteness;
- genuine warnings.

Deficits retain salmon-red, and invalid input retains red. Routine missing Growth capacity and Coverage bottlenecks remain neutral steel/info colors rather than warnings.

Fertility presence and other ordinary positive availability must move away from amber. They use neutral information blue or muted success green according to their existing meaning.

### Information, progress, and values

Blue identifies informational relationships and demand paths. Muted green identifies coverage, positive balance, successful outcomes, or capacity unlocked. Gold remains the voice for calculated targets, capacities, headroom, and other important derived values.

The four existing parchment-gold literals collapse into `--value-gold` and `--value-gold-bright`; no additional gold hierarchy is introduced.

### Faction identity

Faction headers use the darker asset-derived fills:

- Eco: olive `#4c6329` rather than bright emerald;
- Tycoon: dark umber `#4a413b` rather than neutral gray;
- Tech: desaturated steel blue `#35566a` rather than saturated blue.

These colors remain confined to faction identity and faction-specific context indicators. Tycoon rust is not used as a large fill or a global accent because it would collide with manual and warning amber.

## Coverage sub-tabs

The future Coverage views are named:

- **Built-chain bottlenecks**
- **Full current coverage**

Their eventual control is a visually subordinate segmented control. It uses `--select` for the active state but does not duplicate the existing full-width Coverage context-tab underline treatment. This design records only their color hierarchy; adding the sub-tabs is separate functional work.

## Implementation sequence

1. Introduce semantic tokens and replace hard-coded color literals without changing rendered colors.
2. Verify a visually neutral tokenization pass.
3. Apply the Steel HUD token values and retarget overloaded orange states.
4. Compare representative existing views at desktop and narrow widths: population overview, an island in edit and collapsed states, Production Coverage, production tables, Growth targets, milestones, invalid inputs, and focus-visible controls.
5. Adjust only color values if contrast or faction balance is poor. Any geometric problem observed during review is out of scope and remains unchanged.

Keeping tokenization and palette application separate makes accidental layout changes easy to detect and keeps each change mechanically reviewable.

## Accessibility and verification

White text on the selected faction fills has stronger calculated contrast than on the current fills. Implementation still verifies the actual composed UI rather than relying only on token-pair calculations.

Verification includes:

- automated tests, lint, and production build;
- a diff audit confirming no geometry-affecting CSS properties changed;
- keyboard focus inspection on tabs, buttons, inputs, and disclosures;
- visual inspection at the current desktop and responsive breakpoints;
- checks that selected, focused, manual, deficit, invalid, positive, and muted states remain distinguishable without relying on hue alone.

Existing style tests must continue to pass. New tests should pin token presence and semantic mapping where useful, but should not snapshot every hex value or make harmless contrast tuning expensive.

## Scope boundary

This work does not:

- redesign or rearrange any view;
- implement the Coverage sub-tabs;
- introduce themes or a theme switcher;
- add textures, glass effects, decorative plaques, typography changes, or new imagery;
- alter calculations, storage, interaction, or accessibility semantics;
- fix existing layout defects noticed in the companion or application.

The result is the current application, with the current layout, expressed through a coherent Steel HUD palette.
