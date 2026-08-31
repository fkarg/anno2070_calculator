# Growth Planning & Step-Wise Actualization — Design

The roadmap's planning layer answers two concrete questions: “I built 120 Tycoon residences; what completes their supply chains?” and “I need at least 2,500 Geniuses; how many residences and production buildings does that imply?” The calculator keeps the empire overview visible, gives Growth its own workspace, derives cumulative milestones from a population target, and lets the user apply concrete producer buildings to eligible islands.

Decisions settled with the user on 2026-08-31:

- the permanent residences view stays an overview, not the primary editor;
- Islands, Production, and Growth become top-level workspaces below it;
- Growth owns all population-target controls;
- targets may be residence-driven or population-driven;
- milestone gaps are canonical-good capacity, while apply actions name concrete producers;
- milestone progress stays derived from actual state, with no completion checkboxes or historical snapshots.

## Application shell

`PopulationSection` remains above the workspace tabs and is read-only. Each faction shows separate Actual and Target values plus a Headroom / limit column. A positive value states additional supported population; an exhausted row names the limiting good. Target equals Actual for factions that follow island state. The overview uses separate columns rather than arrow notation.

Below it, an accessible tab list switches local UI state between:

1. **Islands** — existing island configuration, residences, owned buildings, productivity, local balances, and build-next suggestions.
2. **Production** — current-demand bottlenecks and headroom, transfer needs, operating totals, and production-chain detail. The old Coverage “Toward plan” frame disappears; plan work belongs in Growth.
3. **Growth** — population-target editing followed by cumulative milestones and apply actions.

Tabs do not change calculation or storage semantics and need not be persisted. Islands is the initial tab. A plan remains usable with no settled islands: Growth shows the required capacity but has no island apply actions.

## Target intents and storage

Plan factions and island factions no longer pretend to have the same input semantics. Each plan faction has exactly one authoritative target intent:

```ts
type TargetIntent =
  | Readonly<{ kind: 'follow' }>
  | Readonly<{ kind: 'residences'; houses: EditableNumber; maxTier: number }>
  | Readonly<{ kind: 'population'; tier: number; count: EditableNumber }>;
```

- **Follow islands** resolves to summed settled-island houses and effective per-tier populations.
- **By residences** takes total houses and highest intended tier, then uses the existing forward population calculation.
- **By population** takes one tier and a requested minimum population. The selected tier is also the maximum tier. It resolves the smallest non-negative house count whose normal population at that tier meets or exceeds the request.

The Growth target editor presents one collapsible faction card per faction. Its collapsed summary states the active intent and resolved target. Opening a card exposes the three modes, the relevant inputs, bonuses, and read-only derived houses and tier populations. Manual residence targets retain ±10 quick buttons. The mockups establish information hierarchy, not pixel-perfect layout.

Population-driven intent preserves the request as the authority. Changing living-space or Senate bonuses recomputes the required houses rather than silently changing the goal. Because populations arrive in whole-house jumps, Growth shows requested and achieved population separately when they differ.

Advanced per-tier overrides remain available in a collapsed subsection. They apply after the normal target resolves and therefore take precedence for production calculations. When an override makes the effective selected-tier population fall below a population-driven request, the UI says so instead of claiming the request is still met.

This is a storage v3 change. Migration maps v2 `houses: null` to `follow` and a v2 manual house value to `residences`, preserving its `maxTier`, bonuses, and overrides. Population intent adds only the requested tier and count; resolved houses and populations are derived and never stored.

## Inverse population calculation

`resolvePopulationTarget` reuses `calculatePopulation`; it does not algebraically reverse ascension percentages. Nested floors, tier capacities, living-space, and Senate bonuses make a closed-form inverse error-prone.

For a population intent:

1. validate the requested count and tier;
2. return zero houses for a zero request;
3. find an upper bound by doubling house counts until the selected-tier population meets the request;
4. lower-bound binary-search the existing forward calculation;
5. verify the result meets the request and the preceding house count does not;
6. return unavailable if no safely representable input and output can satisfy it.

The resolved target contains the intent, derived houses, normal populations, effective populations after overrides, achieved selected-tier count, and overshoot. Downstream production and milestone code consumes this resolved shape, never the raw intent fields independently.

## Cumulative milestones (`src/calculations/planning.ts`)

Milestones are ordered globally by tier and then faction (`eco`, `tycoon`, `tech`). They are cumulative checkpoints, not independent faction cards: a checkpoint includes every earlier checkpoint's target population, the active faction's target truncated to this checkpoint, and actual populations for factions not encountered yet. This prevents shared capacity such as fish from satisfying multiple faction milestones independently.

Two checkpoint kinds exist:

- **Expand** covers same-tier growth, including building additional residences before further ascension. A zero-population faction begins with a tier-one expansion.
- **Ascend** advances a faction from its preceding tier to the next target tier.

Only checkpoints whose target population differs from the preceding cumulative state are emitted. Truncation masks overrides above the checkpoint tier; otherwise a high-tier override would leak into an earlier milestone. Each checkpoint records its population delta for labels such as “Expand Tech to 279 residences” or “Employees to Engineers · +575 Engineers.”

For each cumulative population state:

1. calculate fractional production requirements with the plan's recycling choice, all production productivity normalized to 100%, and whole-building rounding disabled;
2. normalize occurrence-level production-node results into a typed canonical-good requirement map, aggregating before rounding and propagating any null as unavailable;
3. compare required canonical-good units with current empire `effectiveCapacities`, where a missing capacity means zero and null makes planning unavailable;
4. retain only positive remaining capacity and order it inputs-first by canonical production-chain depth, with catalog order as the stable tie-breaker.

Canonical units deliberately describe required output, not a count of a particular producer. Actual island productivity and alternative producer rates already contribute to `effectiveCapacities`, so applying a building recomputes the remaining capacity honestly.

A milestone with no remaining capacity gaps is complete. The first incomplete milestone is current and later milestones remain visible but muted. Complete milestones collapse to a single summary line. If every resolved target is already covered, Growth shows that no build steps remain. Invalid target or actual inputs make planning unavailable; it never displays a partial result or `NaN`.

## Producer-specific apply actions

Each remaining-good row shows the good icon, canonical capacity still required, and buttons for concrete buildable producers:

- consider every producer in `GOODS.get(goodId).producers`;
- offer it on each settled island where `canBuildOn(island, producer.buildingId)` passes;
- label the action `+1 <producer> on <island>` and expose its canonical capacity contribution at that island's productivity;
- show that producer's per-building operating impact beside the action;
- increment the island's owned count through one shared `stepOwnedBuilding` model helper, also used by the island ledger.

This supports routes such as an underwater recycler without pretending it is a canonical chip factory. The user chooses placement and route; the planner does not allocate buildings automatically. Consequently there is no misleading milestone-wide building count or total operating cost. Existing transfer needs explain the cross-island consequences in Production.

There is also no “built X of N” history. Applying a producer mutates actuals, effective capacity recomputes, and the remaining canonical gap shrinks or disappears. This preserves the no-snapshot invariant and cannot drift from reality.

## Testing

- `population-target.test.ts`: residence and follow resolution; exact and overshooting population targets; zero; minimum-house boundary (`result` succeeds and `result - 1` fails); every faction/tier and bonus combination; plateaus caused by nested floors; invalid and safe-range failures; override precedence and unmet-goal reporting.
- `planning.test.ts`: explicit expansion and ascension checkpoints; two factions sharing a good prove cumulative ordering; overrides above a checkpoint are masked; canonical aggregation happens before gap rounding; alternative capacity and productivity reduce gaps in canonical units; inputs-first ordering is stable; adding owned production completes a milestone and advances current; covered targets yield no remaining steps; invalid inputs yield unavailable.
- `island.test.ts`: the extracted owned-building step helper preserves sparse counts, increments existing values, clamps decrements at zero, and retains the ledger's behavior for invalid entries.
- App population overview test: Actual, Target, and Headroom / limit columns reflect island actuals, a Growth target, and current capacity without exposing target controls in the overview.
- App Growth test: set 120 Tycoon residences and assert the derived milestone; switch Tech to a 2,500-Geniuses population target and assert 279 derived residences without bonuses; click a producer-specific island action and assert the exact owned count increments and the canonical remaining gap decreases.
- App navigation test: Islands, Production, and Growth expose their respective content with an accessible tab list; the residence overview remains visible across all three.

No storage-specific behavior is left implicit: storage tests cover v2 migration into each legacy-equivalent intent and v3 round-trips for population-driven intent.

## Explicitly out of scope

- taxation income per milestone;
- automatic producer or island allocation;
- historical planning sessions, completion state, or undo stacks;
- partial satisfaction and freshly ascended demand simulation;
- exact pixel fidelity to the brainstorming mockups;
- “set plan from supported ascensions” shortcuts;
- named save slots or multiple stored plans.
