# Coverage Model and Panel Redesign

## Goal

Rebuild the three main surfaces around the settled information model — Plan (target), Demand (current inhabitants' consumption), Actuals (owned buildings × productivity), Coverage (how far actuals support a population) — with the user's chosen designs, and add the calculations they need: per-good coverage ratios, per-tier headroom and ascension support, and narrative bottleneck cards.

## Decision record (user-reviewed design rounds one and two)

- **Inhabitants panel: variant A2's visual style with reveal-edit.** Tier values render as plain numbers; hovering/focusing a row reveals the edit field; a manually overridden value *stays* rendered as an amber edit field until reset. A houses row joins the tier rows in the same style: auto-calculated (sum over settled islands), reveal-editable, manual state persists. The Manual / Following-islands mode banding stays.
- **Global bonuses move to the inhabitants panel**: +12% living space and Senate bonus become global per-faction toggles (the user treats broadcasts as globally set). Island faction configs lose their per-island livingSpace/senate toggles; island population math reads the global flags. Recycling coverage stays per island (it maps to island Education-Network presence).
- **The same component is the island's fully-expanded inhabitants panel** (minus the global bonus toggles): identical tier table, reveal-edit, houses row.
- **Island cards: none of round two's variants accepted as-is.** Two explicit modes: a **setup/base-edit mode** for the rarely-changed attributes (name, settled/underwater, fertilities) and the **normal mode**, which is simultaneously the scanning view and the quick-edit surface for population distribution (reveal-edit, same speed as the inhabitants panel) and production counts. The normal mode's body is rebuilt around two questions: (a) *current state* — which demands exist and how well actuals cover them (coverage ratios, not just signed balances); (b) *next step* — what additional demands population growth or ascension would create. This surface gets a dedicated design round (Codex round three) before implementation.
- **Production chains: C2 as the base** (connector tree, 40px icons, per-building costs under the name, headers on top, paired columns) with one change: the cost cell shows **actual costs plus a color-coded plan delta** (Δ = plan − actual per metric) instead of two full triples. Gap columns get explicit labels and split into gap-to-plan and gap-to-demand where they differ.
- **Bottlenecks: keep the coverage panel, make it narrative cards.** Top ~4 constraints as cards: "X is the bottleneck because ⟨available vs needed⟩; solving it supports ⟨outcome⟩; the next bottleneck is Y." Variants: bottleneck toward plan, toward current/new demand, and (later, estimate-grade per the taxation research) toward fastest balance/tax increase. Per-faction and per-tier resolution, not only the global scale.

## New calculations (pure modules, all deterministic)

All build on `aggregateGoodLoads` (capacity / intermediateDemand / finalDemand per good) and `effectiveCapacities` (chain-throttled).

1. **Coverage ratios.** Per good: `coverage = available / finalDemand` capped at 1, where `available = max(0, effectiveCapacity − intermediateDemand)`; per faction+tier: the list of goods that tier consumes with each good's coverage (satisfaction profile). Uncapped ratio retained for surplus display. This is the calculator-honest partial-satisfaction model: the game mediates shortage through mood, not proportional population loss, so we show coverage and gate ascension on it rather than shrinking populations.
2. **Per-tier headroom.** For faction f, tier t: `headroom(f,t) = min over goods g with satisfaction_g[t] > 0 of (available_g × satisfaction_g[t])` — how many additional inhabitants of that tier the current actuals could feed, with the limiting good. (Marginal analysis: other tiers held fixed; shared goods give conservative answers.)
3. **Ascension support.** Ascending one house from tier t to t+1 changes demand by `Δ_g = capacity_{t+1}/satisfaction_g[t+1] − capacity_t/satisfaction_g[t]` per good (0 where a tier doesn't consume g). `supportedAscensions(f,t) = min over goods with Δ_g > 0 of available_g / Δ_g`, floored; limiting good reported. Powers the "currently supporting X ascensions — set as plan?" action, which raises the plan's tier distribution accordingly.
4. **Delta demands (next-step preview).** Given a hypothetical change (+N houses of faction f, or M ascensions t→t+1), the per-good demand delta and which goods flip from covered to uncovered. This is the island card's question (b) and the future planning mode's primitive.
5. **Bottleneck narratives.** Order the existing constraint list; for each of the top ~4: limiting good, why (available vs needed), what solving it yields (new scale or headroom), and the successor bottleneck (recompute with that constraint relaxed). Computed in two framings: against plan requirements and against current-demand headroom. The tax-optimizing framing is deferred until tax data exists (estimate-grade only; see docs/research/2026-08-30-taxation-needs.md).

## Model changes

- `FactionState` global bonuses: livingSpace/senate move from per-island faction state to a global per-faction record in the plan (`bonuses: Record<Faction, {livingSpace, senate}>` or equivalent). Island population math takes the global flags; storage sanitizes old per-island flags away (tolerant, no loss flag needed — they migrate into the global default false unless the plan had them set).
- Plan vs actual population becomes explicit: the plan's per-tier populations (Manual mode or overrides) are the *plan*; island sums are the *actual*; derived per-good plan demand vs actual demand yields labeled deltas in the production view.

## Surface implementation order

1. Calculation layer (items 1–5) — TDD, no UI dependency.
2. Inhabitants panel (A2 + reveal-edit + houses row + global toggles) shared with island expanded view.
3. Production chains C2′ (delta cost cell, labeled gaps) + bottleneck cards strip.
4. Island card redesign — after Codex round three resolves the layout around questions (a)/(b).

## Verification

Property tests: coverage of a plan-mirroring island is exactly 1 for every consumed good; headroom and supportedAscensions are 0 exactly when the tier's limiting good has zero availability; ascension support × ascension demand delta never exceeds availability; relaxing the reported bottleneck strictly increases the reported outcome. Component/integration tests per surface as each lands, including reveal-edit keyboard accessibility (focus reveals the field; Escape/blur restores display mode) and manual-value persistence.
