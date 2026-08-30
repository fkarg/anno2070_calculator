# Anno 2070 Deep Ocean Calculator

A local rebuild of the Anno 2070 Deep Ocean supply-and-demand calculator, based on the archived page at [anno2070.atspace.eu](http://anno2070.atspace.eu/).

The goal is to preserve the original population and production formulas while providing automatic recalculation, clearer controls, and thoroughly tested calculation modules.

## Reference snapshot

The downloaded original page and its companion asset directory are kept in the repository as the behavioral and visual reference. Original game images will be reused in the rebuilt interface where they exist.

## Development

The application uses pnpm, React, TypeScript, and Vite.

```bash
pnpm install
pnpm dev
```

Run the automated verification with:

```bash
pnpm test
pnpm build
pnpm lint
```
