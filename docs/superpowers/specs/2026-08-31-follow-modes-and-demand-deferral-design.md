# Follow Modes, Global Population Bonuses, and Demand Deferral — Design

## Problem

The current `Follow islands` target resolves to the exact summed island population. That is useful when island tier restrictions are intentional, but it also prevents Growth from answering a second common question: what would the same built residences require if every faction could ascend through its full tier ladder? In the permanent residence overview, mirroring actuals also produces a redundant Target column whose values cannot differ from Actual.

The `+12% living space` and `+5% Senate` settings affect each faction globally and are copied onto every island, yet their controls currently live in each Growth target card. Their placement makes a global actual-and-target input look like a target-local option.

Finally, newly unlocked final demand can be intentionally deferred. A player may, for example, accept Genius population while postponing Bionics. The calculator currently continues to report that source throughout current coverage, island balances, Production, and Growth, with no way to state that deliberate policy.

## Decisions

- Follow behavior remains a per-faction plan choice based on the sums of all settled islands. It does not become an island-specific setting.
- Follow has two selectable modes: **Mirror actual tiers** and **Unrestricted ascension**.
- Mirror mode is derived continuously from actual island populations and stores no copied population target.
- Unrestricted mode keeps the summed island residence count and projects it through the faction's full tier ladder.
- A mirrored faction omits its redundant Target column in the permanent overview. Other factions may still show Target independently.
- Living-space and Senate controls move to the permanent per-faction overview cards and disappear from Growth target cards.
- Deferred demand is keyed globally by exact `(faction, tier, good)` source. It changes calculations, rather than merely hiding warnings.
- Deferral applies only to residence final demand. Owned-building inputs and power-plant fuel demand remain active.
- Deferrals are reversible, persisted, and have no automatic expiry.

## Follow target state

The follow intent gains a derived-mode discriminator:

```ts
type FollowTierMode = 'mirror' | 'unrestricted';

type TargetIntent =
  | Readonly<{ kind: 'follow'; tierMode: FollowTierMode }>
  | Readonly<{ kind: 'residences'; houses: EditableNumber; maxTier: number }>
  | Readonly<{ kind: 'population'; tier: number; count: EditableNumber }>;
```

Existing stored follow intents without `tierMode` migrate to `mirror`. Newly created state also defaults to `mirror`. Switching between the two follow modes changes only `tierMode`; explicit residence and population intents remain unchanged.

### Mirror actual tiers

Mirror resolution remains the current behavior:

- houses are the summed residence counts of settled islands;
- effective tier populations are the summed effective island populations;
- island tier limits and island population overrides remain visible in the result;
- plan-level population overrides do not participate;
- changes to island state are reflected immediately, with no target values copied into storage.

The permanent faction card says **Following actual tiers** and uses an Actual + Headroom layout. Houses and tier populations render once. The missing Target column is intentional and local to that faction card; factions using unrestricted or explicit targets retain their Target column.

### Unrestricted ascension

Unrestricted resolution uses:

- the same summed settled-island house count as Mirror;
- the faction's highest modeled tier as `maxTier`;
- the existing `calculatePopulation` distribution and rounding rules;
- the faction-global living-space and Senate settings;
- no plan population overrides.

The existing population algorithm allocates every house to exactly one tier before multiplying by tier capacity. Reusing it gives deterministic nested-floor rounding and conserves the summed residence count without a new projection algorithm.

The permanent faction card says **Following houses · unrestricted ascension** and shows its projected Target column. Growth compares this derived projection with actual populations and emits only the required same-faction expansion or ascension milestones. Unlike Mirror, the `follow` kind itself no longer suppresses milestone creation; only `follow + mirror` does.

The Follow islands portion of each Growth target card exposes a compact two-option selector:

- **Mirror actual tiers**
- **Unrestricted ascension**

Changing to an explicit target initializes its normal inputs from the current resolved follow result as today. Returning to Follow derives from current islands rather than reviving hidden follow values.

## Global population bonuses

Each permanent faction overview card owns a compact **Global bonuses** control group containing its living-space and Senate checkboxes. The existing state remains in `plan.factions[faction]`, and the existing update operation continues mirroring a changed value onto every island faction exactly once.

Growth target cards no longer render editable or disabled copies of these controls. Their resolved population summary remains sufficient to show the resulting target. Moving the controls must preserve stored values and must not introduce a second source of truth.

## Demand-deferral identity and persistence

A deferred source is structural state, not a captured quantity:

```ts
type IgnoredDemandSource = Readonly<{
  faction: Faction;
  tier: number;
  goodId: GoodId;
}>;

type CalculatorState = {
  // existing fields
  ignoredDemands: readonly IgnoredDemandSource[];
};
```

`tier` is the zero-based internal tier index already used by satisfaction arrays. Equality compares the three typed fields rather than concatenated display strings. Adding an existing source is idempotent; restoring it removes that exact source.

The key is deliberately empire-wide. Ignoring `Tech / Geniuses / Bionics` suppresses that final-demand source for every settled island and every current or projected Tech Genius population. The UI labels the scope explicitly with wording such as **Ignore Tech · Geniuses · Bionics everywhere**.

Stored entries contain no amount. Population, recycling, and bonus changes while a source is ignored therefore take effect naturally if it is later restored. Entries remain visible even when their current contribution is zero, labelled as not currently applicable; they are not silently discarded and cannot reactivate invisibly after later population growth.

Storage advances to version 4. Version 3 state gains an empty `ignoredDemands` list and follow intents gain `tierMode: 'mirror'` without treating either additive default as user-data loss. Version 4 sanitization retains only known faction, tier, and final-demand good combinations and removes duplicates.

## Shared calculation policy

The application already has two legitimate demand paths:

1. production-node calculations derive required producer counts and upstream chains;
2. the goods graph derives island capacity, intermediate demand, final demand, balances, and coverage.

Replacing those paths with a new unified demand engine would be disproportionate. Instead, one shared demand-policy module owns source identity and satisfaction masking. Given a good, faction, satisfaction array, and ignored-source list, it returns the same array with ignored tiers set to zero. No view subtracts quantities independently.

The shared policy is applied at each existing final-demand boundary:

- primary nodes in `calculateProduction` and `calculateAvailableProduction`, so current required buildings and every upstream material node fall away naturally;
- residence final-demand accumulation in `islandGoodLoads`, which flows into island/empire balances, transfer inference, effective capacity, and supported-population calculations;
- marginal per-inhabitant demand in coverage and ascension headroom;
- current and projected snapshots in Growth requirements and milestone planning.

Intermediate demand from owned producer buildings is calculated exactly as before, even if the same good also has an ignored residence source. Coal-power and nuclear fuel consumption likewise remain based on owned plants. Construction stockpile materials remain outside recurring final-demand inference.

All affected calculations receive the same ignored-source collection from `CalculatorState`. The result must be internally consistent: ignoring one source reduces every derived view by that source's current contribution and removes its upstream target chain, while other faction, tier, and good sources remain unchanged.

## Source provenance and actions

An aggregated good can serve several faction-tier sources, so a generic **Ignore Fish** action is ambiguous. Calculation presentation derives explicit source contributions from the good's final-demand definitions and the relevant current or checkpoint population.

Coverage bottleneck cards and not-yet-built current-demand entries expose their active sources as compact rows or chips. Each source names faction, tier, and good and offers its own Ignore action.

Growth gap provenance becomes tier-aware for primary final-demand contributions. Its `Why required?` disclosure can therefore expose Ignore beside the exact source contributing to a baseline or projected gap. Several sources may remain under the same canonical good and chain; ignoring one does not suppress the others.

After an action, calculations recompute immediately. An ignored source need not remain duplicated as a full muted row in every active list.

## Visibility and restoration

Because deferral changes authoritative-looking totals, it cannot become invisible state. The always-visible **Residences & inhabitants** heading shows a quiet text control such as **2 demands ignored** whenever the list is non-empty. It is not a warning banner and does not use shortage styling. Activating it switches to Growth and focuses the ignored-demand manager.

Growth contains one collapsed **Ignored demands (N)** section. Each entry shows faction, tier, and good, whether it currently contributes demand, and a Restore action. A small Restore all action belongs only in this manager.

Affected empty states remain truthful. For example, Coverage may say **No active bottlenecks · 2 demands ignored** rather than claiming without qualification that the current population is fully supplied. This is status context, not an attention-grabbing alert.

## Tests

Pure target tests cover:

- Mirror follows changed island tier populations without storing a copied target;
- Unrestricted retains summed houses, uses the full faction ladder, and matches the existing deterministic distribution for every faction;
- living-space and Senate settings affect unrestricted projection;
- switching follow modes does not alter houses or explicit target state;
- Growth emits unrestricted follow milestones but no Mirror target delta;
- mixed per-faction follow modes resolve independently.

Pure demand-policy and calculation tests cover:

- ignoring one `(faction, tier, good)` source changes the corresponding final-demand amount in island and empire loads;
- the same source is suppressed across two islands, proving empire-wide scope;
- another faction or tier demanding the same good continues to contribute;
- owned-building intermediate demand for the same good remains active;
- power-plant fuel demand remains active;
- Production removes the ignored primary contribution and its upstream chain;
- current coverage, headroom, Growth baseline, and future milestones use the same filtered demand;
- restore recomputes from current population and bonuses rather than a stored quantity;
- duplicate ignores are idempotent;
- inactive future sources remain persisted and become effective when their matching population appears.

Storage tests cover version 3 migration defaults, version 4 round-tripping, validation of faction/tier/good tuples, and duplicate removal.

App tests exercise positive behavior rather than absence-only assertions:

- each faction's global controls update Actual and unrestricted Target values from the permanent overview;
- Mirror presents the compact Actual + Headroom layout and identifies itself as Following actual tiers;
- Unrestricted presents its projection and Growth milestones;
- a source-specific Ignore action updates displayed requirements and the persistent ignored count;
- the Growth manager identifies and restores the source, returning current recalculated requirements;
- an all-ignored bottleneck state reports the ignored count in its empty-state copy.

## Alternatives considered

### Hide warnings but retain demand

Operational products commonly continue evaluating state while silencing notifications, as documented for [Grafana silences](https://grafana.com/docs/grafana-cloud/alerting/silences/) and [Datadog downtimes](https://docs.datadoghq.com/monitors/downtimes/). That model is rejected here because the requested behavior is specifically to omit a deliberate demand source from bottleneck and current-population supply calculations, not merely reduce notification noise.

### Filter separately in each view

Subtracting demand in Coverage, Growth, Production, and island UI components would initially touch fewer calculation signatures, but the totals would inevitably drift and intermediate demand could be removed accidentally. It is rejected in favor of one shared source mask at existing final-demand boundaries.

### Store unrestricted follow as an explicit residence target

Snapshotting current houses into `kind: 'residences'` would reuse existing planning behavior but would stop following later island changes. It is rejected because both follow modes must remain derived from live island state.

## Scope boundary

This change does not add island-specific demand exclusions, scheduled expiry, exclusion reasons, named scenarios, partial satisfaction, or a general desires system. It does not change construction-material export inference, power-plant fuel ratios, production-cost hierarchy, island compact editing, or unrelated Growth mathematics.
