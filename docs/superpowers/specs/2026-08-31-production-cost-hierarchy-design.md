# Production Cost Hierarchy

## Goal

Make each production row prioritize the cost of the rounded buildings the displayed supply chain actually requires, while retaining the fractional demand cost as quieter reference information. Make each footer explain the complete rounded cost and building count for that root chain only.

## Row hierarchy

Each canonical and dependency row shows two operating-impact lines in this order:

1. The node's requirement rounded up to whole buildings, colored yellow.
2. The node's fractional requirement, colored muted grey.

These are planning requirements for the displayed supply chain, not owned-building actuals. Owned counts, capacity, and build/overage information remain in the existing right-hand summary.

## Footer hierarchy

Every production-tree footer remains visible, including trees without alternative producers. Each footer variant shows:

- the variant or full-chain name;
- every included building in that root chain with its rounded count;
- the summed operating impact of those rounded counts, kept orange.

Counts and costs are calculated only from the variant's existing root-scoped node IDs. A shared building type that appears in another root chain is not included unless that chain-specific node belongs to the current root. For example, a Communicators footer uses only its Communicators chip-factory node and never adds the Cybernetics chip-factory node.

Zero-count nodes are omitted from the displayed building list and contribute zero cost. Invalid requirements keep the affected variant unavailable without affecting unrelated roots or unaffected alternatives.

## Data shape

The operating-impact calculation exposes both fractional and rounded direct impact per production node. Each root variant additionally exposes its included rounded building counts alongside its already-calculated total impact. The component renders these values and does not recompute chain membership.

## Verification

- Calculation tests pin fractional versus rounded direct impacts.
- Variant tests pin root-scoped counts and prove shared building types from another root are not double-counted.
- Component tests pin the row order and footer names/counts.
- Browser inspection checks yellow rounded rows, grey fractional rows, orange footer totals, and compact alignment.

No changes are made to demand calculation, productivity, owned-building actuals, alternative-chain selection, or island calculations.
