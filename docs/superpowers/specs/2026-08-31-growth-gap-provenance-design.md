# Growth Gap Provenance — Design

## Problem

Growth milestones are cumulative empire checkpoints. A milestone titled “Expand Eco at Engineers” currently renders every unresolved capacity gap retained by that checkpoint as “Target full demand.” That makes valid Tycoon and Tech requirements look like Eco supply-chain demand.

The calculation does not mix faction population formulas. It starts with the full demand of all current island actuals, applies Growth checkpoints in global tier/faction order, and retains the highest requirement reached for each canonical good. Shared goods such as Fish, Algae, and Microchips intentionally combine demand from several faction chains. The missing information is which state established each retained requirement and which chains contributed to it.

For example, with current Tech Researchers and Tycoon Engineers:

- Aquafarm can be required by Tech Functional Food;
- Cybernetic Factory is required by Tech Researchers;
- Gourmet Factory and Champagne Cellar are required by Tycoon Engineers;
- none of those are caused by Eco Engineers.

## Vocabulary

- **Current actual demand**: full-supply demand for the populations presently recorded on settled islands.
- **Raw checkpoint demand**: full-supply demand for the cumulative population state at one Growth milestone.
- **Required peak**: the nondecreasing per-good maximum of current actual demand and every checkpoint through the active milestone.
- **Binding origin**: the earliest state that established the current required peak for a good—either current actuals or a named milestone. Equal requirements retain the earlier origin.
- **Changed here**: the active milestone raises the required peak for this good.
- **Carried**: the active milestone does not raise the required peak; the obligation comes from current actuals or an earlier milestone.
- **Demand chain**: a faction and final-demand root followed through material dependencies to the canonical good, such as `Tech · Functional food → Algae`.

“Inherited” is not a third calculation source. It is UI shorthand for a carried requirement whose binding origin precedes the active milestone.

## Calculation model

`canonicalRequirements` becomes a snapshot calculation rather than a totals-only map:

```ts
type GrowthDemandChain = Readonly<{
  faction: Faction;
  rootNodeId: string;
  pathNodeIds: readonly string[];
  required: number;
}>;

type GrowthRequirementSnapshot = Readonly<{
  required: number;
  origin: Readonly<{ kind: 'actual' }> |
    Readonly<{ kind: 'milestone'; milestoneId: string }>;
  chains: readonly GrowthDemandChain[];
}>;
```

Each canonical production-node occurrence contributes one demand chain. Its root is found by following `parentId` to the primary node; its path is stored from primary root through the canonical occurrence. Occurrences for the same canonical good are aggregated only after their chain attribution is recorded. Alternative producers remain supply choices and do not create duplicate demand causes.

For every milestone and good, Growth records:

```ts
type GrowthGap = Readonly<{
  goodId: GoodId;
  required: number;
  capacity: number;
  remaining: number;
  baselineRequired: number;
  inheritedRequired: number;
  checkpointRequired: number;
  addedHere: number;
  origin: GrowthRequirementSnapshot['origin'];
  chains: readonly GrowthDemandChain[];
}>;
```

The state transition is:

```text
baseline peak = current actual full demand
inherited peak = peak after every earlier milestone
raw checkpoint = demand of this milestone's cumulative population
required peak = max(inherited peak, raw checkpoint)
added here = required peak - inherited peak
remaining = max(0, required peak - actual effective capacity)
```

When raw checkpoint demand strictly exceeds the inherited peak, its origin and complete contribution snapshot replace the binding snapshot. Within numerical epsilon, the earlier snapshot remains authoritative so provenance does not jump between equal checkpoints.

The existing inputs-first ordering, canonical capacity comparison, completion semantics, and producer actions remain unchanged.

## Milestone presentation

The milestone summary reports both kinds of remaining gaps:

```text
Expand Eco at Engineers
+450 Engineers · 33 gaps · 7 changed here · 26 carried
```

Opened milestones show two groups:

1. **Changed in this step** — gaps where `addedHere > epsilon`, sorted using the existing inputs-first order.
2. **Carried gaps** — remaining gaps not raised by this milestone, collapsed behind a native `<details>` disclosure by default.

A changed row says `This step adds +N required capacity`. A carried row says either `Required for current actuals` or `Carried from <milestone title>`.

Every row has a compact `Why required?` disclosure. It lists the binding snapshot’s nonzero chain contributions, for example:

```text
Tech · Functional food → Algae       6.34
Tycoon · Pharmaceuticals → Algae     6.49
```

This is a demand explanation, not a recommended production route. Chip Factory and Electronics Recycler therefore remain producer-action alternatives below the same Microchips requirement.

The capacity label becomes **Actual effective capacity** because chain starvation can make it lower than nominal owned output. Existing action buttons continue to state their nominal output.

## Empty and complete states

- If an active milestone has only carried gaps, it still remains incomplete: Growth cannot claim the cumulative checkpoint is fully supplied while current or earlier obligations remain short.
- If every gap is covered, the milestone remains collapsed and marked complete as today.
- A plan with no settled islands still shows changed gaps and chain explanations, but no island action buttons.
- Invalid target or actual inputs still make the entire Growth plan unavailable.

## Tests

Pure planning tests pin:

- pure Eco-through-Engineers population produces no Aquafarm, Cybernetic Factory, Gourmet Factory, or Champagne Cellar requirement;
- current Tech population plus an Eco Engineer target gives Aquafarm a current-actual origin and zero `addedHere` at the Eco milestone;
- Tycoon Engineer demand is carried into later Tech milestones with the correct milestone origin;
- shared Fish and Aquafarm requirements expose faction/root contributions whose sum equals the binding requirement;
- a later lower raw requirement preserves the earlier peak and origin;
- equal peaks retain their earliest origin;
- alternative producers never duplicate demand contributions.

App tests pin:

- an Eco milestone groups unrelated Aquafarm demand under Carried gaps and explains its Tech root;
- its summary separates changed and carried counts;
- pure Eco inputs do not render the unrelated Tycoon/Tech goods;
- the UI says Actual effective capacity and continues to apply producer-specific island actions.

## Scope boundary

This change explains the existing cumulative full-supply model. It does not alter target ordering, satisfaction/ascension minimums, taxation, placement allocation, or the global-versus-per-island recycling model. The latter is a separate semantic decision because current Production and island coverage presently use different recycling controls.
