# Anno 2070 Deep Ocean Calculator

A local rebuild of the Anno 2070 Deep Ocean supply-and-demand calculator, based on the archived page at [anno2070.atspace.eu](http://anno2070.atspace.eu/).

The goal is to preserve the original population and production formulas while providing automatic recalculation, clearer controls, and thoroughly tested calculation modules.

User-entered residences, manual population overrides, productivity percentages, and calculation options are saved in the browser automatically and restored on reload.

## Current functionality

- Automatic Eco, Tycoon, and Tech population calculations from residences, highest tiers, and population bonuses.
- Individually editable population values that remain fixed until returned to `Auto` mode.
- Automatic requirements for the complete Deep Ocean production data set.
- Per-building productivity controls, faction-wide productivity adjustments, recycling, and optional whole-building rounding.
- Connector-tree production chains with every source alternative shown at full demand.
- Per-building and directly required operating impacts, plus buildable complete-chain totals that round every production stage up to a whole building.
- Per-island actuals: residences, owned production buildings with per-island productivity, tri-state fertility/deposit annotations, and settled/unsettled placeholders.
- Plan house counts that follow the settled-island totals automatically until manually overridden.
- Derived per-good island balances (capacity, demand, balance) and a transfer-needs view that reveals cross-island imbalances even when the empire-wide net is fine.
- Owned, actual-capacity, and balance columns beside every canonical plan requirement, actual operating impacts from owned buildings, and per-building impact values behind an accessible info toggle.
- Versioned local browser storage for user-owned inputs and a complete reset control. Unreadable or future-version payloads are preserved untouched instead of overwritten, and catalog changes no longer invalidate saved state.
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

### Next: supported population and bottlenecks

- Show the population supported by the current actual capacity, the limiting production chain, and the population threshold at which the next building is needed.

### Later simulation layers

- Step-wise ascension and expansion plans: the ordered build list from current actuals to a target population, including settle proposals from fertility annotations of unsettled islands.
- Include taxation levels for fully satisfied populations.
- Model freshly ascended populations and partially or unfulfilled demands.
- Deepen island constraints: power, ecobalance, and surface/underwater simulation per island.
- Add fleet information and trade or shipping costs when the ownership model can support them.
- Revisit storage (Dexie/IndexedDB) once state becomes multi-document — named save slots or stored expansion plans.
- Model available power-generation options and mixes under faction, scenario, or game-progress restrictions.
- Add market-sale income, power/ecobalance-to-credit comparison ratios, and full production-chain gain/loss simulation.
- Simulate stepwise progression toward population, balance, monument, or other scenario targets.
- Investigate support for other Anno games after the Anno 2070 model is complete.

## Necessary incompleteness

- City-layout coverage such as hospitals, fire stations, and police stations is outside a supply-and-demand model.
