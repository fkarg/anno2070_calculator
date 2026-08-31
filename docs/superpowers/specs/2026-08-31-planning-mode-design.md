# Planning Mode & Step-Wise Actualization — Design

The roadmap's planning layer: speculatively raise the population target, see the supply-chain gaps and their severity, and resolve them step by step until the population can actually grow. Decisions settled with the user (2026-08-31): target = the existing manual plan (with quick steppers), steps = ascension milestones, island detail = empire counts + per-island hints with apply buttons.

## Core idea: no new state

The manual plan already *is* the target: per-faction houses, max tier, and overrides feed the plan requirements. Actuals already are the progress. A "step" is therefore pure derivation — plan-vs-actuals gaps grouped by ascension milestone — and completing a step means updating actuals (via apply buttons or by hand), after which everything recomputes. Nothing to persist beyond what storage v2 already holds; no checkbox state that can drift out of sync with reality.

## Target input

- "Plan manually" (existing) stays the entry point; entering it initializes houses from current island totals (already the case via Auto → snapshot).
- Faction panels gain quick steppers (+10 / −10 houses) next to the houses field in manual mode, so "what if +50 houses" is three clicks. No relative overlay, no separate target model.

## Milestone derivation (`src/calculations/planning.ts`)

For each faction, walk tiers from the current top occupied tier to the plan's top target tier. Milestone (faction, tier k) = "everything needed for the plan's houses to stand at tiers ≤ k":

1. **Truncated target state**: the plan's population model evaluated with maxTier = k (existing `calculatePopulation` + overrides). This includes lower-tier populations per the ascension ratios, so milestone 1 covers "build the new houses at all" implicitly.
2. **Requirements**: `calculateAvailableProduction` over the truncated populations (respecting plan recycling/bonuses) → per-good plan requirement.
3. **Gaps**: requirement − current empire effective capacity (chain-throttled, actuals), per canonical good, `ceil`ed to whole buildings; only positive gaps listed. Ordered inputs-first by chain depth (topological depth over CONSUMPTION), so a step never tells you to build a consumer before its inputs.
4. **Unlocks line**: population delta versus the previous milestone ("ascend ≈N houses → +M Employees"), from the truncated-state populations.
5. **Cost line**: summed operating impact (maintenance/power/eco) of the step's new buildings — the price tag of saying yes.

Milestones across factions interleave into one list ordered by tier then faction (eco → tycoon → tech). A milestone with no remaining gaps is **complete** (actuals caught up); the first incomplete milestone is *current*, later ones stay visible but muted. If the plan sits at or below the current population, the list is empty with a note.

Severity per good = the gap size (buildings to construct); the current milestone's biggest gap is the headline bottleneck — consistent with the existing plan-frame cards, which this view replaces.

## Step-wise actualization

Each building row in a milestone shows:
- `+N <building>` (empire count), with the good's icon;
- island hint chips: settled islands where `canBuildOn` passes (fertility/deposit-gated), each an **apply button** that increments that island's owned count by one (the exact `step(buildingId, +1)` the ledger already uses);
- progress: `built X of N` as actuals catch up (gap shrinks live).

No planner-side allocation: the user decides placement; the hints only rule out impossible islands. Transfer needs (existing section) covers the cross-island consequences.

## UI

- `CoverageSection`'s "Toward plan" frame is replaced by the milestone list (`PlanStepsSection` content, same section shell). The "Toward demand" frame (acute cards + headroom + unbuilt) stays unchanged.
- Milestone card: title "1. Eco Workers → Employees · ascend ≈40 houses (+320 Employees)", building rows as above, footer "Δ upkeep −120 · Δ power −14 · Δ eco −8".
- Complete milestones collapse to a single ✓ line. The current milestone is visually emphasized.

## Testing

- `planning.test.ts`: fixture island + manual plan → milestone tiers, inputs-first ordering, gap counts pinned; adding owned buildings empties a milestone (complete) and advances the current one; plan ≤ actuals → empty list; invalid inputs → unavailable (null), never NaN.
- App test: enter manual plan houses, assert first milestone's building rows; click an apply chip → owned count increments and the row's remaining count drops.

## Later (explicitly out of scope here)

Taxation income per milestone (joins after assets.xml extraction), full island assignment/optimization, partial-satisfaction modeling, "set plan from supported ascensions" shortcuts.
