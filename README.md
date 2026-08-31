# Anno 2070 Deep Ocean Calculator

A local rebuild of the Anno 2070 Deep Ocean supply-and-demand calculator, based on the archived page at [anno2070.atspace.eu](http://anno2070.atspace.eu/).

The goal is to preserve the original population and production formulas while providing automatic recalculation, clearer controls, and thoroughly tested calculation modules.

Island actuals, Growth targets, manual population overrides, productivity percentages, and calculation options are saved in the browser automatically and restored on reload.

## Current functionality

- Automatic Eco, Tycoon, and Tech population calculations from residences, highest tiers, and population bonuses.
- Individually editable population values that remain fixed until returned to `Auto` mode.
- Automatic requirements for the complete Deep Ocean production data set.
- Per-building productivity controls, faction-wide productivity adjustments, recycling, and optional whole-building rounding.
- Connector-tree production chains with every source alternative shown at full demand.
- Per-building and directly required operating impacts, plus buildable complete-chain totals that round every production stage up to a whole building.
- Per-island actuals: residences, owned production buildings with per-island productivity, present-fertility and open-slot annotations, land/underwater island types with placement-filtered buildings, and settled/unsettled placeholders.
- Game-style island cards: a name-and-fertilities plaque, inline house counts with live populations, a gap-sorted building ledger with count steppers and build-next suggestion shortcuts, per-island operating load, and a local balance table. Rarely-changed configuration (name, flags, fertilities, population distribution) sits behind a Configure toggle.
- A permanent residences overview compares Actual and Growth Target values per faction and shows current full-demand headroom or its limiting good.
- Islands, Production, and Growth workspaces separate actual-state editing, current full-demand analysis, and future target planning. Island cards remain two-up on desktop.
- Growth accepts Follow islands, residence-driven, or minimum-population targets, including bonuses and advanced population overrides. Population targets derive the minimum whole residence count and report any overshoot.
- Cumulative tier-and-faction milestones turn Growth targets into ordered full-supply capacity gaps. Producer-specific `+1 BUILDING on ISLAND` actions update actual owned counts and immediately advance the live plan.
- Derived per-good island balances (capacity, demand, balance) and a transfer-needs view that reveals cross-island imbalances even when the empire-wide net is fine.
- Labeled demand/actual lines on every canonical production row: current full-demand operating costs, actual costs, owned counts, and capacity; per-building impact values sit behind an accessible info toggle.
- Versioned local browser storage with v1/v2 migration to the v3 target-intent model and a complete reset control. Unreadable or future-version payloads are preserved untouched instead of overwritten, and catalog changes no longer invalidate saved state.
- Pure calculation modules covered by example-based and property-based tests, including a derived goods-and-rates layer with load-time cross-chain consistency validation.

## Reference snapshot

The downloaded original page and its companion asset directory are kept in the repository as the behavioral and visual reference. Original game images will be reused in the rebuilt interface where they exist.

## Development

The application uses pnpm, React, TypeScript, and Vite.

```bash
pnpm install
pnpm dev
```

By default Vite prints the local URL when it starts. To expose a specific port on the local network, use for example:

```bash
pnpm dev --host 0.0.0.0 --port 63096
```

Run the automated verification with:

```bash
pnpm test
pnpm build
pnpm lint
```

## Roadmap and further ideas

### Later simulation layers

- Add settle proposals from fertility annotations of unsettled islands.
- Include taxation levels for fully satisfied populations.
- Model need unlock thresholds, exact retention/ascension minimums, and partially fulfilled satisfaction categories.
- Deepen island constraints: power, ecobalance, and surface/underwater simulation per island.
- Add fleet information and trade or shipping costs when the ownership model can support them.
- Revisit storage (Dexie/IndexedDB) once state becomes multi-document — named save slots or stored expansion plans.
- Model available power-generation options and mixes under faction, scenario, or game-progress restrictions.
- Add market-sale income, power/ecobalance-to-credit comparison ratios, and full production-chain gain/loss simulation.
- Extend milestones beyond population targets to balance, monuments, or other scenario goals.
- Investigate support for other Anno games after the Anno 2070 model is complete.

## Necessary incompleteness

- City-layout coverage such as hospitals, fire stations, and police stations is outside a supply-and-demand model.
