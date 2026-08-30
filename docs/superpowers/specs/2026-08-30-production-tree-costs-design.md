# Production Trees and Operating Impacts Design

## Goal

Make the faction production overview easier to read and useful for comparing complete supply-chain alternatives. The page will show a real connector tree, keep every alternative visible at its full requirement, and add maintenance-credit, power, and ecobalance impacts without introducing source-selection state.

This is the next self-contained phase. A Statistics Center-style global view of owned buildings is deliberately deferred until the detailed production view and its cost model are trustworthy.

## Scope

This phase will:

- remove the current restrictive 1440 px ceiling and permit the dense desktop calculator to grow to approximately 2200 px when its content benefits, while retaining the existing narrow-screen overflow behavior;
- replace depth-only production indentation with a connector tree that distinguishes continuation, branch, and last-child positions;
- show every alternate source as a complete, independent way to satisfy the same demand rather than treating alternatives as a selected split;
- attach canonical per-building maintenance-credit, power, and ecobalance values to production buildings;
- show per-building values, the impact of each displayed required building count, and a complete-chain total for every alternative combination;
- use the original Anno credit, energy, and ecobalance symbols rather than letter abbreviations; and
- update the README so completed behavior and remaining ideas are clearly separated.

This phase will not add owned-building inputs, persistent route selections, ratios between alternate sources, islands, fleet costs, construction costs, or economic optimization.

## Production Tree Model

The existing production formulas and their calculation order remain authoritative. Each production node belongs to one primary product tree, and the formula parent is also the current display parent. Sibling order is stable and follows the established source data. Rendering derives the connector prefix from the node's ancestors and whether each ancestor has a later sibling:

```text
Electronics factory
├──── Chip factory
│    ├──── Copper mine
│    └──── Sand extractor
└──── Electronics recycler
```

The connector and the building image participate in the indentation. A fixed-width prefix column that leaves every image at the same horizontal position is specifically avoided.

There is no duplicate structural-parent graph. Explicit alternative groups provide the only additional tree semantics. A separate presentation parent should be added only if a real chain cannot follow its formula graph.

## Alternatives Are Comparisons, Not Splits

All source alternatives remain visible and are calculated at 100% of the primary product's demand. There is no radio selection, ratio, or saved choice in the detailed faction view.

An alternative group identifies mutually exclusive source subtrees for the purpose of a complete-chain total. Mandatory subtrees are included in every variant. Multiple independent groups produce the Cartesian set of complete variants. For example:

- Communicators compare the Chip Factory subtree with the Electronics Recycler.
- Service Bots compare those same chip sources while including the mandatory Biopolymer subtree in both totals.
- Tycoon Jewelry combines one gold-source option with one coal-source option, producing four complete variants.
- Laboratory Instruments likewise combine one iron-source option with one coal-source option, producing four complete variants.

The UI labels these totals as alternatives for comparison. It never adds mutually exclusive variants into one faction total.

This deliberately postpones real-world mixing. The later global view will accept integer owned-building counts, which naturally represents any mixture without maintaining ratios that quickly become stale as discrete buildings change.

## Canonical Building and Impact Data

A canonical building catalog will hold each unique building's label, existing local building image, source page, and signed operating impact:

```ts
interface OperatingImpact {
  maintenance: number;
  power: number;
  ecoBalance: number;
}
```

Production nodes reference a canonical building ID. Shared buildings such as the Chip Factory and resource converters therefore have one operating-impact definition even when they appear in several chains.

Only ongoing operating values are in scope:

- `maintenance` is the recurring credit balance per minute;
- `power` is the building's energy balance; and
- `ecoBalance` is the building's environmental balance.

Values are stored with the game's sign convention, so consumers generally have negative impacts. Construction credits and materials are excluded. A blank ecobalance value in the source data is represented as zero.

The direct building pages in the [Anno 2070 Wiki](https://anno2070.fandom.com/wiki/Production_buildings) are the data source. Totals are derived locally from the canonical per-building data instead of copying the wiki's chain summaries, because several published chain summaries disagree with the sum of their component buildings. The three symbols come from the wiki's [Icons index](https://anno2070.fandom.com/wiki/Icons) and are stored locally with the other interface assets.

## Calculations

Operating-impact calculation remains pure TypeScript and independent of React.

For a valid required building count, direct impact is component-wise multiplication:

```text
direct impact = required building count × per-building impact
```

Direct row impacts follow the displayed requirement and therefore follow the existing `Round up to whole buildings` setting. Complete-chain totals always round every included stage up separately, because those totals estimate the operating impact of buildings that can actually be constructed.

A complete variant total sums every mandatory node and exactly one option from each alternative group, including all descendants of the chosen option. Invalid requirements propagate as unavailable totals rather than producing `NaN`, `Infinity`, or a misleading partial sum.

No cache or memoization layer is introduced. The calculator has fewer than one hundred production nodes and performs only scalar arithmetic. Requirements are calculated once per input change and reused for one linear direct-impact pass plus a small variant aggregation pass. A cache would add invalidation state and duplicate representations without a meaningful runtime benefit.

## Presentation

Each production row shows:

- connector prefix and original building image;
- building name;
- required production count;
- productivity input where applicable;
- direct operating impact for that displayed requirement; and
- smaller per-building operating values for reference.

Complete-chain totals appear at the end of each primary product tree, one row per complete alternative. The credit, energy, and ecobalance icons carry accessible text labels and are not the sole way screen-reader users identify a value.

The connector tree is semantic rather than decorative indentation alone. Alternative roots remain visually distinguished, but there is no selected state because all alternatives are simultaneously useful comparisons.

## Verification

Implementation starts with calculation and data tests before UI changes.

The smallest meaningful automated coverage includes:

- every production node resolves to exactly one canonical building;
- canonical IDs are unique and every building has finite signed impact values and a source;
- calculation parents exist, remain within their product/faction tree, and cannot form cycles;
- alternative groups contain valid options and generate the expected number of variants;
- direct impact scales exactly with fractional and rounded requirements;
- zero requirements produce zero impact and invalid requirements remain unavailable;
- complete variants include mandatory nodes once and exactly one subtree from every alternative group;
- representative simple, one-choice, mandatory-plus-choice, and two-choice trees have pinned totals;
- property tests cover finite results, linear fractional scaling, and variant membership invariants;
- UI tests verify actual icon assets, full simultaneous alternatives, connector placement, per-building/direct values, and complete-chain totals; and
- the existing calculation, persistence, lint, and production-build checks remain green.

Desktop rendering will also be inspected at the user's wide viewport to confirm that the available width is useful and that image indentation follows the connector tree. The 2200 px ceiling is permission to use space, not a target: column and content needs determine the rendered width, and sparse content is not stretched merely to fill the monitor.

On wide screens, the calculator uses a small responsive left gutter and leaves surplus space on the right instead of centering itself. This slightly left-aligned layout suits the primary 2560 px workspace while avoiding edge contact at smaller desktop widths.

## Deferred Global View

The following phase will add a non-island Statistics Center-style global inventory. It will keep `required` capacity separate from integer `owned` building counts, aggregate duplicate canonical buildings, and derive global maintenance, power, and ecobalance from owned counts. Power and ecobalance will later become island-scoped; credit maintenance can remain globally aggregated. Fleet and shipping inputs belong with or after that island-aware model.
