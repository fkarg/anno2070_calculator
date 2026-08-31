# Production-chain target deltas

## Problem

Production rows currently place a chain-local requirement beside empire-wide ownership and repeat an empire-wide Growth capacity result for every occurrence of a shared good. For shared inputs such as microchips, that makes `target build/over` look like it belongs to the visible chain even though it includes demand from every faction and chain. The expanded mixed-producer ownership explanation also cannot fit on one line at the narrower two-column island layout width.

## Design

- Keep the main `req` output as the current requirement for that exact production-tree node.
- Replace the repeated empire-wide Growth capacity result with the signed change for that exact node, including alternative-route nodes: `target +N` or `target −N`, calculated as `targetResults[node.id] - results[node.id]`. Do not show a target line when the delta is effectively zero.
- Keep actual capacity coverage empire-wide because producer capacity is shared. Relabel it from `actual build/over` to `empire build/over` so its scope is explicit.
- For alternative producers, render ownership on one compact line (`own 2 chip + 1 recycler`) and canonical capacity on a separate line (`capacity 3.5`). The ownership line may wrap inside the extras column but must not widen it or overlap requirement/productivity cells. Full producer names remain available in the tooltip and accessible label.
- Preserve the existing colors: positive target growth and empire deficits use the deficit color; negative target growth and empire surplus use the surplus color.

## Verification

UI tests cover a shared microchip chain, mixed chip-factory/recycler ownership, positive and negative per-chain target deltas, and empire-scoped coverage wording. The full test suite, lint, build, and `git diff --check` must pass.
