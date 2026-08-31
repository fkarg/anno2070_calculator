# Ascension and Demand-Unlock Gating Implementation Plan

**Goal:** Make current demand and Production availability follow actual population unlocks, and make Growth distinguish ascension gates, newly established tiers, and later within-tier demand unlocks.

**Architecture:** Store recurring-demand unlock metadata on each primary demand root and ascension thresholds in one faction table. A shared demand policy masks locked sources; current calculations supply actual empire population while Growth supplies each scenario population. Growth remains a population-checkpoint planner: it annotates blocked ascensions and inserts ordinary checkpoints only when population genuinely crosses a demand threshold. No exact satisfaction-percentage or ascension-readiness claim is added.

**Scope boundary:** Demand-root availability is implemented everywhere. Concrete building availability is not inferred from a demand root because shared upstream buildings have several faction-specific unlock paths. Existing manual building entry remains available, and future Growth requirements can be forecast before ordinary Production considers them currently demanded.

---

## Stage 1: Shared actual-demand availability

- [x] Add verified Deep Ocean recurring-demand thresholds for every Eco, Tycoon, and Tech primary root.
- [x] Add a pure unlock predicate using the introducing-tier threshold; a higher occupied tier proves the earlier unlock was reached.
- [x] Compose unlock masking with source-level demand deferral in `demand-policy.ts`.
- [x] Apply the shared mask to current Production, island/empire balances, transfers, Coverage/headroom, active-source actions, and Growth requirements.
- [x] Keep island consumption local while evaluating unlocks from actual empire population.
- [x] Add boundary tests below/at thresholds, higher-tier proof, ignored-demand composition, and split-island empire unlocks.

## Stage 2: Ascension gates and population target feasibility

- [x] Add generic ascension gates: Eco/Tycoon 144/750/1,200 and Tech 150/1,200.
- [x] Make population-driven higher-tier targets derive enough residences to satisfy preceding ascension gates as well as the requested target count.
- [x] Annotate every ascension milestone with its required preceding-tier population and whether the checkpoint reaches it.
- [x] Stop an infeasible ascension branch before introducing next-tier demand; show the concrete shortfall instead.
- [x] Test residence targets that are infeasible, population targets whose minimum house count is raised by a gate, and Deep Ocean's 1,200-Researcher Genius gate.

## Stage 3: Threshold checkpoints and current-tier presentation

- [x] Split same-tier Growth expansion at crossed recurring-demand thresholds, merging unlocks that share a population count.
- [x] Give checkpoint ids a threshold/population discriminator so multiple checkpoints in one tier remain stable.
- [x] Label checkpoints factually, for example `600 Researchers unlocks Neuroimplant factory`.
- [x] Present current baseline gaps in faction-focused groups such as `Complete current Tech Researchers`, while retaining the global capacity/provenance calculation for shared goods.
- [x] Ensure a Growth forecast may show a future unlock, but current Production dimming and current Needs remain based on actual populations only.
- [x] Add application tests for the staged current-tier and future-tier behavior, plus calculation boundary tests for Bionics and Neuroimplants.

## Stage 4: Documentation and verification

- [x] Update the research note and README scope with the threshold catalog and remaining historical-unlock limitation.
- [x] Run focused tests after each stage, then the full test suite, lint, production build, and `git diff --check`.
- [x] Run an independent diff review focused on demand consistency, impossible target handling, and shared-good/faction behavior.
- [x] Commit the completed rollout on `main`.

## Explicit limitations

- Unlocks persist in the game, but an imported current snapshot cannot prove a previously reached final-tier threshold after population later falls. Current population, higher-tier presence, and existing state provide safe evidence; the UI must not claim certainty beyond that evidence.
- Exact ascension readiness still excludes category satisfaction percentages, taxes, public-building coverage, materials, and ascension rights.
- Concrete building availability needs a separate OR-of-unlock-paths catalog. It is not derived from whichever final demand happens to expose the building in one production tree.
