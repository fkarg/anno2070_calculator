# Growth Gap Provenance and Independent Milestones — Design

## Problem

Growth milestones currently form one globally ordered cumulative stream. A milestone titled “Expand Eco at Engineers” can therefore contain both unresolved current-actual demand and target demand introduced by an earlier Tech or Tycoon milestone. Rendering every one of those gaps as “Target full demand” makes valid Tycoon and Tech requirements look like Eco supply-chain demand.

The calculation does not mix faction population formulas, but it does incorrectly make target plans depend on other factions through a shared mutable population state. It also silently seeds the first target checkpoint with every current-actual shortage. Shared goods such as Fish, Algae, and Microchips should still combine demand from several faction chains within one scenario; the defect is scenario construction and presentation, not shared capacity.

For example, with current Tech Researchers and Tycoon Engineers:

- Aquafarm can be required by current Tech Functional Food;
- Cybernetic Factory can be required by current Tech Researchers;
- Gourmet Factory and Champagne Cellar can be required by current Tycoon Engineers;
- none of those requirements is caused by a new Eco Engineer target.

## Planning topology

The plan has one shared baseline and three parallel faction branches:

```text
Current population supply
├─ Eco:    first growth step → later Eco tiers
├─ Tycoon: first growth step → later Tycoon tiers
└─ Tech:   first growth step → later Tech tiers
```

The baseline uses the full current population of all settled islands. Each faction branch starts from that same immutable population and changes only its own faction. Later tiers in one branch depend on earlier tiers in that branch. A faction branch never includes another faction's target population.

In the reported state, Tech Researchers, Eco Engineers, and Tycoon Engineers are parallel first steps. Tech Geniuses depend only on the Tech Researchers step; Eco and Tycoon Executives each depend only on their own Engineer step. More generally, every later tier depends on the preceding generated step within its own faction.

All scenarios compare against the same current empire-wide effective capacity. Goods and their producers remain shared where the game allows it.

## Vocabulary

- **Current actual demand**: full-supply demand for the populations presently recorded on settled islands.
- **Checkpoint demand**: full-supply demand for one branch's complete population scenario at a milestone.
- **Previous scenario**: current actuals for a branch's first milestone, or the preceding milestone in that same faction branch.
- **Changed here**: the active milestone requires more of this good than its previous scenario.
- **Carried**: the active milestone still has a capacity gap for a good whose requirement did not increase from its previous scenario.
- **Demand chain**: a faction and final-demand root followed through material dependencies to the canonical good, such as `Tech · Functional food → Algae`.

“Inherited” is not a third calculation source. In the old UI, the first milestone inherited current-actual shortages, while later milestones could also inherit other factions' earlier target changes. The corrected UI calls the former **current population supply** and removes the latter entirely.

## Calculation model

`canonicalRequirements` becomes a scenario snapshot calculation rather than a totals-only map:

```ts
type GrowthDemandChain = Readonly<{
  faction: Faction;
  rootNodeId: string;
  pathNodeIds: readonly string[];
  required: number;
}>;

type GrowthRequirementSnapshot = Readonly<{
  required: number;
  chains: readonly GrowthDemandChain[];
}>;
```

Each canonical production-node occurrence contributes one demand chain. Its root is found by following `parentId` to the primary node; its path is stored from primary root through the canonical occurrence. Occurrences for the same canonical good are aggregated only after their chain attribution is recorded. Alternative producers remain supply choices and do not create duplicate demand causes.

Each gap exposes its exact scenario and comparison values:

```ts
type GrowthGap = Readonly<{
  goodId: GoodId;
  required: number;
  capacity: number;
  remaining: number;
  baselineRequired: number;
  previousRequired: number;
  checkpointRequired: number;
  addedHere: number;
  chains: readonly GrowthDemandChain[];
}>;
```

The result shape exposes the planning topology instead of flattening it:

```ts
type GrowthPlanningResult = Readonly<{
  baseline: GrowthBaseline;
  sequences: Readonly<Record<Faction, readonly GrowthMilestone[]>>;
}>;
```

For the baseline:

```text
required = current actual full demand
remaining = max(0, required - actual effective capacity)
```

For each faction branch, start from the immutable full actual population. At each ascending milestone, replace only that faction with the milestone population, then calculate the complete scenario directly:

```text
previous required = actual demand or preceding same-faction checkpoint demand
checkpoint required = this checkpoint's exact scenario demand
added here = max(0, checkpoint required - previous required)
remaining = max(0, checkpoint required - actual effective capacity)
```

Requirements are not held at a historical maximum. Ascension changes the population mix, so a later exact scenario may legitimately require less of a good than an earlier one. The previous scenario is used only to explain the delta.

Completion remains intrinsic to each scenario's requirements and the shared actual capacity. The baseline is current while it has gaps. Independently, each faction branch marks its first incomplete milestone current; an incomplete baseline does not block the three branches. This permits several current highlights without introducing a cross-faction dependency.

The existing inputs-first gap ordering, canonical capacity comparison, and producer actions remain unchanged.

## Presentation

The UI renders the baseline first as **Supply current population**, followed by stable Eco, Tycoon, and Tech groups. Milestones ascend by tier within each group.

Each milestone summary reports both kinds of remaining gaps:

```text
Expand Eco at Engineers
+450 Engineers · 33 gaps · 7 changed here · 26 carried
```

Opened milestones show two groups:

1. **Changed in this step** — gaps where `addedHere > epsilon`, sorted using the existing inputs-first order.
2. **Carried gaps** — remaining gaps not raised by this milestone, collapsed behind a native `<details>` disclosure by default.

A changed row says `This step adds +N required capacity`. A carried row says either `Already required by current population` or `Still required from the previous <Faction> step`. Baseline shortages remain in the collapsed carried group where they affect a faction scenario, but the separate baseline makes their source explicit rather than presenting them as target growth.

Every row has a compact `Why required?` disclosure. It lists the current scenario's nonzero chain contributions, for example:

```text
Tech · Functional food → Algae       6.34
Tycoon · Pharmaceuticals → Algae     6.49
```

This is a demand explanation, not a recommended production route. Chip Factory and Electronics Recycler therefore remain producer-action alternatives below the same Microchips requirement.

The capacity label becomes **Actual effective capacity** because chain starvation can make it lower than nominal owned output. Existing action buttons continue to state their nominal output.

## Empty and complete states

- If a milestone has only carried gaps, it remains incomplete because its exact scenario is not fully supplied.
- If every gap is covered, the milestone remains collapsed and marked complete as today.
- If current actuals have gaps, the baseline is visible even when every faction follows islands and no growth milestone exists.
- A covered baseline remains as a compact status row when growth milestones exist. When it is covered and there are no growth milestones, Growth shows the existing no-steps empty state.
- A plan with no settled islands still shows changed gaps and chain explanations, but no island action buttons.
- Invalid target or actual inputs still make the entire Growth plan unavailable.

## Tests

Pure planning tests pin:

- pure Eco-through-Engineers population produces no Aquafarm, Cybernetic Factory, Gourmet Factory, or Champagne Cellar requirement;
- an undersupplied actual empire with all factions following islands exposes a separate baseline shortage;
- current Tech population plus an Eco Engineer target gives Aquafarm a baseline requirement and zero `addedHere` at the Eco milestone;
- Tech target growth never changes an Eco or Tycoon checkpoint population or requirement;
- each faction independently marks its first incomplete milestone current;
- shared Fish and Aquafarm requirements expose faction/root contributions whose sum equals the scenario requirement;
- a later lower same-faction requirement is reported exactly rather than preserving an earlier peak;
- alternative producers never duplicate demand contributions.

App tests pin:

- current shortages appear in Supply current population before the faction groups;
- Eco, Tycoon, and Tech render as parallel groups with independent current steps;
- an Eco milestone groups unrelated Aquafarm demand under Carried gaps and explains its Tech root;
- its summary separates changed and carried counts;
- pure Eco inputs do not render unrelated Tycoon or Tech goods;
- the UI says Actual effective capacity and continues to apply producer-specific island actions.

## Scope boundary

This change corrects faction independence and explains each full-supply scenario. It does not alter target resolution, satisfaction/ascension minimums, taxation, placement allocation, or the global-versus-per-island recycling model. The latter is a separate semantic decision because current Production and island coverage presently use different recycling controls.
