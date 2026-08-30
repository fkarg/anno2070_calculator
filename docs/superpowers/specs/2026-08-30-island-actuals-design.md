# Per-Island Actuals and Transfer Needs Design

## Goal

Add the actual state of the player's empire — islands, their residences, and their owned production buildings — next to the existing top-down plan, and derive from it per-good balances that reveal where capacity sits and where it is missing. The global plan answers "what do I need"; the new bottom-up actuals answer "what do I have, and where". Both appear side by side in the production view.

This is the prerequisite for the two later layers the roadmap wants: a supported-population/bottleneck view and step-wise ascension planning. Both are functions of actuals and stay out of this phase.

## Scope

This phase will:

- add islands as first-class persistent state: name, settled flag, fertility annotations, per-faction residences, owned production-building counts, and per-building productivity;
- keep the existing global calculator unchanged as the plan, except that each faction's house count gains an Auto mode equal to the summed actual houses of all settled islands;
- derive a canonical goods-and-rates layer from the existing production constants, with load-time consistency validation;
- calculate per-island and empire-wide capacity, demand, and balance per good, plus a transfer-needs view listing surplus and deficit islands per good;
- show owned counts, actual capacity, and balance next to planned requirements in the production table;
- move per-building operating-impact values into an accessible tooltip and use the freed space for actual operating impacts derived from owned buildings;
- harden storage: a structurally versioned v2 payload, a v1 migration, tolerant validation, and preservation of unreadable payloads instead of silently overwriting them; and
- update the README's completed-behavior and roadmap sections.

This phase will not add supported-population or bottleneck calculations, step-wise expansion plans, settle-island proposals, trade routes or any route state, fleet or shipping costs, island-specific ecobalance simulation, or a move to IndexedDB.

## Decision Record

Decisions fixed during design review:

- Islands model actuals only; the plan stays global and top-down. They meet in derived, read-only comparison columns.
- No explicit trade routes. The Anno 1800 calculator ecosystem demonstrated that hand-maintained import/export state goes stale on every demand change; the deliberately coarse per-good balance view is the proven alternative. The cross-island view is named transfer needs (surplus/deficit), not "flows", because without routes it describes pressure, not logistics.
- Island residences use the same total-houses-plus-highest-tier ascension model as the plan, not per-tier house counts. Manual per-tier entry is a data-entry treadmill; per-tier population overrides remain for exceptions, and a per-island highest tier covers early-ascension restrictions.
- Balances aggregate per good, never per building type or production node. Alternative producers (Chip Factory and Electronics Recycler both producing microchips) have different rates, so building counts are not additive; capacity is expressed in a shared per-good unit.
- Storage stays on versioned-JSON localStorage. The state is a single document of a few kilobytes, loaded synchronously; IndexedDB's triggers (size, blocking I/O) do not apply. Dexie is the recorded revisit path once state becomes multi-document (named save slots, stored expansion plans); `storage.ts` remains the single seam so that swap touches one module.

## Plan and Actuals Relationship

The plan's per-faction house count becomes overridable Auto, using the same mechanism as population overrides: in Auto mode the field shows the summed actual houses of all settled islands for that faction; editing it holds a manual value, and a control returns it to Auto. Planning an expansion is therefore the gesture of raising plan houses above actuals; the visible difference between plan and actuals is the build target.

The plan keeps its own highest-tier selection, bonuses, and per-tier overrides. Only the house count flows bottom-up. Existing stored states migrate with their current house count as a manual value, so migration changes no displayed number.

## Island Model

Each island holds:

- a stable generated id and an editable name;
- a settled flag — unsettled islands are placeholders whose fertilities can be recorded for later planning and which contribute nothing to any calculation;
- fertility annotations (see below);
- per faction: total actual houses, highest occupied tier, living-space and senate bonus flags, an education-network (recycling) coverage flag, and per-tier population overrides — the same shape and machinery as the plan's faction state;
- owned building counts per canonical building id (integer, default 0); and
- productivity per canonical building id (percent, default 100).

Owned counts and productivity are keyed by canonical building — a Chip Factory on an island is one holding regardless of which chains consume its output. This differs deliberately from the plan, whose productivity is per production node (per chain path).

The living-space and senate bonuses are range-scoped in the game (Information Center coverage); the island flags are labelled as assuming all residences covered. The same applies to the education-network coverage flag, which applies the game's 15% consumption reduction to the island's recyclable final demands. The plan's global recycling toggle keeps applying to plan demand only. Owned Electronics Recyclers only ever add microchip capacity; they are unrelated to the consumption-reduction mechanic.

## Fertility Annotations

Fertilities and resource deposits constrain what an island can produce. Each island annotates every constraint with one of three states: unknown (the default, shown as `?`), present, or absent. The edit control is a compact row of icon buttons — one per fertility/deposit, using the existing good images — cycling through the three states, with present ones subtly highlighted.

Annotations only filter and annotate the owned-building picker: buildings whose requirement is marked absent are hidden (or shown disabled), unknown does not filter. They have no calculation meaning in this phase; settle proposals belong to the later planning layer.

The mapping of canonical building to required fertility or deposit is a small static data table sourced from the Anno 2070 wiki building pages, added to the canonical building catalog. Buildings without an island prerequisite (fisheries, pure factories) carry none.

## Goods and Rates: the Derived Canonical Layer

Balances need physical goods with additive rates, which `PRODUCTION_NODES` does not directly provide — it encodes top-down demand paths, with the same physical building appearing as multiple nodes and alternative producers appearing as separate subtrees. A new pure module derives the canonical layer from the existing constants at load time:

- **Goods.** Each canonical building produces one good. Alternative producers of the same good are identified through the existing alternative groups (Chip Factory / Electronics Recycler → microchips; Gold Refinery / Gold Converter → gold nuggets; Oil Rig / Oil Driller → crude oil; Coal Mine / Rotary Excavator → coal; Iron Ore Mine / Iron Converter → iron ore).
- **Unit.** Each good's unit is one canonical-producer building at 100% productivity. A non-canonical producer's rate is derived from the ratio of chain multipliers (the Electronics Recycler substitutes for the Chip Factory at multiplier 2/3 versus 1, so one recycler counts as 1.5 chip-factory units) — the same constants the plan already uses, so plan and actuals cannot disagree.
- **Final demand.** Primary nodes' satisfaction arrays give population-to-units conversion per faction and tier. Factions with different consumption rates for the same good (fish) each convert at their own rate and the demands add.
- **Intermediate demand.** Material multipliers give input units consumed per consuming building at 100% (one Chip Factory consumes 0.5 copper-mine units and 1/3 sand-extractor units). Demand from an owned building scales with its configured productivity and sits on the island that owns the consumer.
- **Validation.** The derivation throws at load time, in the style of the existing alternative-group validation, if the same physical relationship appears with inconsistent rates in different chains (the recycler ratio, the copper-per-chip multiplier, and every other shared edge must agree wherever they appear).

The plan calculation continues to run on `PRODUCTION_NODES` unchanged; only the actuals side uses the derived layer.

## Balances and Transfer Needs

A new pure module computes, per island and per good, in good units at full precision:

- **capacity** — the sum over owned producers of count × productivity ÷ 100 × producer rate;
- **demand** — final demand from the island's effective population plus intermediate demand from the island's owned consumers at their productivity; and
- **balance** — capacity minus demand.

Empire-wide capacity, demand, and net balance are the sums across settled islands. The plan's whole-building rounding never applies to actuals; values round only for display (two decimals, matching the existing requirement format), and an epsilon around zero suppresses floating-point dust. Invalid inputs propagate as unavailable values through the existing null-propagation pattern, nulling only what derives from them.

The transfer-needs view lists, for every good whose per-island balances are not all one-signed, the surplus islands and deficit islands with their amounts. Goods with a negative empire-wide net are flagged more strongly than mere distribution imbalances. This is a pure presentation of balances; it stores nothing.

## Presentation

**Islands section.** One card per island with add, rename, and remove controls. Each card contains the faction residence inputs (same controls as the plan's population section), the fertility annotation row, the owned-buildings list with count and productivity inputs, and the island's own balance table. The owned-building picker sorts buildings by the gap between plan requirement and empire-wide owned capacity, so recording what the plan still lacks is the shortest path, and respects fertility annotations.

**Production section.** Rows keep their plan values unchanged. Canonical rows additionally show the empire-wide owned count, actual capacity in display units, and balance against the plan requirement, with both shortfall and surplus visibly highlighted. Alternative rows for the same good do not repeat owned counts — a shared owned count shown beside several plan paths would imply an allocation that does not exist; owned data renders once per good.

**Operating impacts.** Per-building maintenance, power, and ecobalance values move from their inline row into a tooltip behind an info affordance that works for keyboard and touch, not hover alone. The freed space shows actual operating impacts — owned count × per-building impact, flat, computed once per canonical building and unaffected by productivity or plan rounding — next to the planned impacts.

**Transfer needs.** A subsection near the production totals renders the per-good surplus/deficit listing described above.

## Storage

The stored payload becomes structurally versioned:

```ts
{ version: 2, plan: CalculatorState, islands: IslandState[] }
```

- **Migration.** A valid v1 payload migrates to v2 with its state as the plan (house counts becoming manual values) and an empty island list.
- **Preservation.** A payload that fails parsing, validation, or migration is left untouched in localStorage: the app starts from defaults but suppresses autosave until the user changes something or explicitly resets, so a bug or a newer schema no longer destroys data on first render. A payload with an unknown future version is treated the same way.
- **Tolerant validation.** Building and node ids missing from a stored map default to their initial values; unknown ids are dropped. Neither invalidates the whole document. This replaces the current exact-key-count check, which turns any catalog change into total state loss.
- **Stable identity.** Islands are identified by generated ids, buildings by canonical ids, factions and tiers by their existing names and positions — never by labels or array order.

Cross-tab behavior remains last-writer-wins, as today.

## Verification

Implementation starts with the derived data layer and calculation tests before UI changes.

The smallest meaningful automated coverage includes:

- the derived goods layer: every canonical building maps to exactly one good, producer rates agree across every chain occurrence (the load-time validation has test-pinned failure cases), and derived rates reproduce the plan's numbers for known chains;
- balance calculations: capacity is monotone in owned counts and linear in productivity; an island mirroring the plan's population with exactly the plan's required buildings at matching productivity balances to zero for every good; intermediate demand lands on the consumer's island; unavailable inputs null only their dependents;
- transfer needs: per good, listed surpluses and deficits are consistent with island balances, and goods with all-one-signed balances do not appear;
- the plan-houses Auto mode: sums island actuals, overrides hold, migration preserves existing values as manual;
- storage: v1 payloads migrate losslessly, corrupted and future-version payloads survive a full app mount unmodified, missing and unknown building ids behave tolerantly, and a save after a real user change resumes normally;
- fertility annotations: tri-state cycling, picker filtering on absent, no calculation effect; and
- UI integration: island add/rename/remove, owned-count entry updating production-table columns, the operating-impact tooltip's keyboard accessibility, and existing plan behavior unchanged throughout.

Existing calculation, persistence, lint, and production-build checks remain green.

## Deferred

The supported-population/bottleneck view and step-wise ascension planning build directly on this phase's balances and are next. Settle proposals build on fertility annotations of unsettled islands. Named save slots or stored plans are the trigger for revisiting Dexie/IndexedDB. Route-level annotations on top of transfer needs remain possible but unplanned.
