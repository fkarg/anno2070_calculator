# Production Coverage Growth Contexts — Design

## Goal

Turn **Coverage & bottlenecks** into the operational planning surface inside Production. It keeps the existing current-population diagnosis, adds one context for each faction's active Growth milestone, and lets the user add whole producer buildings directly from the highest-priority bottleneck cards.

Growth remains the target editor and full milestone roadmap. Production answers the narrower question: “Given Current or this selected milestone scenario, what should I build next, why, and on which island?”

The Production chain table below the panel does not change in this work.

## Selected presentation

The approved layout is the neutral **A1 enriched four-card strip**:

1. Existing Coverage heading.
2. Context tabs: **Current**, then one tab per faction that has an incomplete active milestone, for example **Eco · Engineers**, **Tycoon · Engineers**, and **Tech · Geniuses**.
3. A single compact context summary row.
4. Up to four input-first bottleneck cards in one row on wide screens, wrapping responsively as the current panel does.
5. A compact list of later gaps below the cards.

Cards retain the current panel's scan density. Each card adds only:

- one concise requirement/capacity line;
- one visible supply-chain breadcrumb;
- one sentence explaining what resolving the card unlocks;
- compact whole-building actions;
- a collapsed **Why required?** disclosure.

The panel moves away from the existing orange/alarm treatment. Routine surfaces and gaps use slate and steel-blue. Blue identifies demand paths, and muted green identifies the supply progress unlocked by resolving a gap. Faction color is confined to the selected context tab. Amber is reserved for a genuine warning or invalid state, not ordinary missing capacity.

## Context behavior

`CoverageSection` accepts the existing islands plus `GrowthPlanningResult` and the existing building mutation callback from `App`.

The selected context is stored as `current | Faction`, not as a milestone id. For a faction context, the panel derives the first incomplete milestone in that faction's independent Growth sequence. Consequently:

- resolving a milestone advances the already-selected faction tab to its next incomplete milestone automatically;
- completing the faction branch removes its tab and falls back to **Current** if it was selected;
- changing Growth targets updates the tab label and scenario immediately;
- an unavailable Growth plan exposes only **Current**;
- no active milestone means no tab for that faction.

The context selection affects only the Coverage panel. It does not retarget or filter the Production chain table.

### Current

Current preserves the existing calculation and information hierarchy:

- the three-faction headroom strip;
- up to four acute, already-built-chain bottlenecks;
- the compact **Chains not built yet** list.

The headroom strip is labelled as **built-chain supply room**. This makes its existing semantics explicit: unbuilt consumer goods do not participate in `tierHeadroom`, so the value is not a claim of complete ascension readiness.

Existing bottleneck ranking remains based on current full demand and chain-throttled effective capacity. A starved producer still redirects its recommended action to the deepest known input shortage. A card's breadcrumb uses the matching current-population demand provenance when available and ends in **current population**. Its outcome describes supply-side room, not guaranteed happiness, taxation, or ascension.

### Faction milestone

A faction tab is a target scenario, not a claim that it is globally next. The summary names the same-faction step and says, for example:

```text
Researchers → Geniuses
Full-demand supply toward +1,050 planned Geniuses · 24 gaps
```

Cards use that milestone's exact `GrowthGap` values and existing input-first order. The first four gaps are cards; remaining gaps become compact **Later gaps** chips. As actual buildings change, effective capacity is recalculated, covered gaps disappear, and later gaps move into the card strip.

Milestone language stays supply-qualified. It may say that a chain “contributes toward full-demand supply” or “unlocks the next route step.” It must not claim that a click enables an exact number of ascensions, houses, or satisfied inhabitants because the calculator does not model every game condition needed for that promise.

## Card model and component boundaries

Current bottlenecks and Growth gaps remain separate calculations. A small presentation adapter converts either result into one UI contract; it does not merge their domain semantics:

```ts
type CoverageCardModel = Readonly<{
  id: string;
  goodId: GoodId;
  actionGoodId: GoodId;
  title: string;
  requirement: string;
  breadcrumb: readonly string[];
  outcome: string;
  why: readonly CoverageReason[];
}>;
```

`goodId` is the bottleneck being explained. `actionGoodId` is normally the same good, but a chain-throttled Current card points to its deepest starved input. Keeping that distinction explicit prevents a card from showing the downstream building while mutating an unrelated upstream count.

The UI is split into three focused pieces:

- `CoverageSection`: context selection, summary/headroom, first-four/later partitioning, and empty states.
- `CoverageBottleneckCard`: shared neutral card rendering for Current and milestone models.
- `ProducerActions`: renders eligible whole-building actions for one `actionGoodId` and applies the selected building to an island. Growth's existing gap cards reuse this action component instead of retaining a second implementation.

The adapters and route formatting remain pure functions so ranking, breadcrumb choice, and wording can be tested without rendering React.

## Provenance and breadcrumbs

Every milestone card shows a compact, upstream-to-outcome breadcrumb such as:

```text
Copper mine → Chip factory → Cybernetic factory → Tech: +1,050 planned Geniuses
```

The existing `GrowthDemandChain` records only the selected scenario contribution. That is insufficient to distinguish demand introduced by the active milestone from demand carried from current population or the previous same-faction step. Gap construction therefore decorates each chain with its comparison values:

```ts
type GrowthGapChain = GrowthDemandChain & Readonly<{
  previousRequired: number;
  addedHere: number;
}>;
```

Chains are matched between requirement snapshots by faction, root node, and path node ids. `addedHere` is `max(0, required - previousRequired)`.

For a changed milestone gap, the visible breadcrumb uses the chain with the largest positive `addedHere`, with stable production-catalog order as the tie-breaker. For a purely carried gap, it uses the largest current contribution and ends in **current population** or **previous <Faction> step**, as appropriate. **Why required?** lists all nonzero contributing chains with their scenario amounts and marks each as changed or carried.

Current cards use baseline chains when a matching baseline gap exists. If provenance is unavailable because planning inputs are invalid, the card retains its current factual capacity/starvation explanation without inventing a population path.

Alternative producers remain actions for the same canonical good. For example, a Microchips card may offer both Chip Factory and Electronics Recycler where they are buildable. The panel does not allocate percentages between routes, persist a route choice, or propose fractional buildings. Each click changes one actual building count; recalculation determines whether that canonical-good card remains.

The breadcrumb explains the demand chain represented by the scenario snapshot, not a promise that every offered producer uses that exact upstream route. Alternative producer actions identify the concrete building, island, and nominal output so their differing contribution is visible.

## Quick-build actions

Each action adds exactly one owned building to the chosen settled island through the existing `applyBuilding` mutation. Actions are generated from `GOODS[actionGoodId].producers` and filtered through `canBuildOn` and valid island productivity.

The compact button identifies:

- `+1 <building>`;
- island name;
- nominal canonical-good contribution when it differs from one unit or when several alternative producers have different rates.

The card-level outcome explains the consequence of covering the bottleneck. A button does not claim that one click closes the whole gap. Producer operating impacts remain available through the existing shared presentation where space permits; no new cost model is introduced.

If no settled island can build a producer, the explanation and breadcrumb remain visible but no action is rendered. There is no disabled placeholder action.

## Empty and invalid states

- No settled islands and no active milestone contexts: the panel remains hidden as today.
- No settled islands but an active manually targeted milestone: the panel renders the milestone tabs and cards without build actions.
- Current has no constraints: show **Nothing is limiting the current population's built supply chains right now.**
- A milestone has no gaps after a recalculation: it completes and the selected faction advances or falls back according to the context rules.
- Invalid population or productivity inputs: retain any Current facts the existing calculators can produce, hide unavailable milestone tabs, and use the existing invalid-state language rather than guessing values.

## Styling and accessibility

Context controls use the existing tab semantics: `role="tablist"`, `role="tab"`, `aria-selected`, and keyboard-focusable native buttons. The active context has a visible steel-blue underline in addition to color.

Cards keep semantic ordered-list structure because their order is the suggested input-first work order. **Why required?** uses native `<details>`/`<summary>`. Build actions remain native buttons with an accessible label naming the building and island.

At the current wide desktop layout, four cards fit in one row. Existing responsive breakpoints reduce this to two and then one column without hiding provenance or actions.

The neutral palette uses existing CSS variables where possible. New panel-local variables/classes may be added for slate surface, steel-blue path, and muted-green outcome colors. Routine gaps must not use the warning color.

## Tests

Pure calculation/presentation tests pin:

- milestone chain comparison records correct `previousRequired` and `addedHere` values;
- chain amounts still sum to the gap's checkpoint requirement;
- the visible breadcrumb selects the largest changed chain, then uses stable order for ties;
- carried gaps produce a carried/current-population ending rather than attributing their demand to the active target;
- Current starved cards keep separate `goodId` and upstream `actionGoodId`;
- multiple alternative producers produce actions for the same canonical good without multiplying its demand;
- first-four and later-gap partitioning preserves input-first order.

Component/integration tests pin:

- Current remains the default and retains headroom, acute cards, and unbuilt-chain content;
- only factions with an active incomplete milestone receive tabs;
- selecting a faction renders its milestone summary, cards, breadcrumb, explanation, and later gaps;
- completing the selected milestone advances to the next same-faction milestone, then falls back to Current when the branch completes;
- clicking a quick action increments the correct concrete building on the correct island and recalculates the cards;
- an alternative-producer action displays its own nominal contribution;
- a milestone still renders without settled islands but has no actions;
- invalid planning removes milestone contexts without breaking Current;
- context tabs and disclosures have the required accessible state and labels.

Existing Coverage and Growth tests remain the regression surface for current ranking, faction-independent milestone construction, and Growth's own building actions.

## Scope boundary

This change does not:

- change Growth targets, milestone topology, or the Growth roadmap;
- allocate supply routes, fractions, transfers, or island-specific demand shares;
- build fractional buildings;
- claim exact satisfaction, taxation, or ascension readiness;
- retarget, annotate, or otherwise change the Production chain table;
- add persistent Coverage-context state to storage.

It is a reactive planning aid over existing targets and actual island inventories. Actual building changes remain the sole source of truth for whether a bottleneck has been resolved.
