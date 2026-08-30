# Anno 2070 Deep Ocean Calculator

A local rebuild of the Anno 2070 Deep Ocean supply-and-demand calculator, based on the archived page at [anno2070.atspace.eu](http://anno2070.atspace.eu/).

The goal is to preserve the original population and production formulas while providing automatic recalculation, clearer controls, and thoroughly tested calculation modules.

User-entered residences, manual population overrides, productivity percentages, and calculation options are saved in the browser automatically and restored on reload.

## Current functionality

- Automatic Eco, Tycoon, and Tech population calculations from residences, highest tiers, and population bonuses.
- Individually editable population values that remain fixed until returned to `Auto` mode.
- Automatic requirements for the complete Deep Ocean production data set.
- Per-building productivity controls, faction-wide productivity adjustments, recycling, and optional whole-building rounding.
- Versioned local browser storage for user-owned inputs and a complete reset control.
- Pure calculation modules covered by example-based and property-based tests.

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

### Next: production-chain clarity and operating impacts

- Render dependent supply chains as connector trees with clearly indented building images.
- Show every source alternative at its full requirement rather than treating alternatives as selected ratios.
- Add per-building, direct-required, and complete-variant maintenance-credit, power, and ecobalance totals.

### Then: owned production and global statistics

- Add integer inputs for actually owned production, power, and ecobalance buildings, kept separate from calculated requirements.
- Aggregate shared building counts and operating impacts in a Statistics Center-style global view.
- Add fleet information and trade or shipping costs when the ownership model can support them.

### Later simulation layers

- Include taxation levels for fully satisfied populations.
- Model freshly ascended populations and partially or unfulfilled demands.
- Add island-dependent population, power, ecobalance, fertility, and surface/underwater constraints.
- Model available power-generation options and mixes under faction, scenario, or game-progress restrictions.
- Add market-sale income, power/ecobalance-to-credit comparison ratios, and full production-chain gain/loss simulation.
- Simulate stepwise progression toward population, balance, monument, or other scenario targets.
- Investigate support for other Anno games after the Anno 2070 model is complete.

## Necessary incompleteness

- City-layout coverage such as hospitals, fire stations, and police stations is outside a supply-and-demand model.
