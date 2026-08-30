# Per-Island Power, Ecobalance, and Construction Materials — Design Addendum

Extends 2026-08-30-island-actuals-design.md. Data source: docs/research/2026-08-31-power-eco-materials.md (wiki-verified per-building infoboxes). No changes to the plan/production sections; this is a catalog + island-view feature.

## Core structural call

`GoodId = BuildingId` and the goods graph derives entirely from `PRODUCTION_NODES`. A building without a production node is invisible to the goods graph (`producedGood()` → null) but fully counted by the owned-impact sums. New power/eco/material buildings therefore enter as **impact-only catalog entries**: addable to islands, counted in operating load and the island power/eco balance, absent from local-balance goods rows, coverage, and the production chain view.

Consequence: construction-material *goods* (tools, wood, concrete, …) are NOT modeled as goods in v1. The wiki documents chain ratios but almost no absolute t/min rates, and the goods graph's unit system needs rates. What the user actually needs day-to-day is (a) the buildings' maintenance/energy/eco joining island totals and (b) deposit/placement gating in the add list — both covered. Chain ratios appear as static hint text.

## Catalog changes (`building-data.ts`)

`BuildingDefinition` gains `category: 'production' | 'power' | 'eco' | 'material'` (existing entries: `production`). New entries, values from the research doc:

- **Power (10):** windPark, thermalPowerStation, offshoreWindPark, solarTowerGenerator, coalPowerStation, nuclearPowerPlant, marineCurrentPowerPlant, hydroelectricPowerPlant, geothermicPowerPlant, energyTransmitter. Positive `power` values.
- **Eco (8):** weatherControlStation, monitoringStation, ozoneMakerStation, riverSewageTreatmentPlant, guardian, wasteCompactor, deacidificationStation, co2Reservoir. Positive `ecoBalance` output, negative `power`.
- **Material (14):** basaltExtraction, basaltCrusher, smelter, underwaterRecyclingStation, toolsWorkshop, treeNursery, sawmill, limestoneQuarry, glassworks, concreteFactory, steelworks, carbonFactory, uraniumMine, fuelElementFactory.

Simplifications (each a deliberate call):
- **Thermal Power Station** = flat +70, **Waste Compactor** = flat +50. In-game both scale with inhabitants in range; radius mechanics are unmodelable here. UI note on the catalog entry (`title` attr), not a per-building effectiveness input.
- **Energy Transmitter** = power 0 (it moves energy, it doesn't make it). Its −175 maintenance / −30 eco still count. Cross-island energy routing is out of scope; the transfer view for energy stays "per-island balance only".
- **Underwater-placed entries** (marine current, geothermic, underwater recycling, metal-converter-adjacent) get `ecoBalance: 0` — no ecobalance exists underwater.
- **Metal converter modes** beyond the three already catalogued (gold/platinum/iron): not added. Same for mirror fields, dam-building sub-parts.

## Island power & eco balance

New `islandEnergyEco(island)` in `operating-impact.ts` (or sibling), from owned entries:

- **Power:** plain sum of `power` across owned buildings. Displayed in the existing per-island operating-load line, colored by sign (deficit = warning). Empire summary (`calculateOwnedImpact`) unchanged — it already sums.
- **Eco, Tycoon cap:** Tycoon eco buildings (wasteCompactor, deacidificationStation, co2Reservoir) cannot raise island eco above 0. With `E0` = eco sum excluding them and `T` = their summed output: `eco = E0 + min(T, max(0, −E0))`.
- **Underwater islands:** no ecobalance. The eco metric renders as "—" on underwater islands' operating load; power/maintenance unaffected.

## Fuel

- **Coal Power Station** consumes coal, which is already a good. New tiny map `FUEL_CONSUMPTION: Partial<Record<BuildingId, readonly InputRate[]>>` consulted in `islandGoodLoads` next to `CONSUMPTION`: each station adds intermediate demand of 1 rotary-excavator-equivalent (= ½ coal mine) in the coal good's canonical units, at 100% (plants have no productivity slider). Coal shortage then shows up naturally in local balance / transfer needs.
- **Nuclear Power Plant** fuel (uranium mine + fuel element factory, 1:1:1 per plant) stays OUT of the goods graph — uranium/fuel rods aren't goods and standalone goods would need a goods.ts refactor for two entries. Both buildings exist as impact-only entries; the nuclear plant's ledger row hint text states "fuel: 1 uranium mine + 1 fuel element factory per plant". Upgrade path exists if this ever matters.

## Placement & requirements

New `ISLAND_REQUIREMENTS` deposits: basaltDeposit, limestoneDeposit, uraniumDeposit, rubbleHeap (underwater), damSlot, geothermalVent (underwater), riverSlot. `BUILDING_REQUIREMENTS` additions: basaltExtraction/basaltCrusher → basaltDeposit, limestoneQuarry → limestoneDeposit, uraniumMine → uraniumDeposit, underwaterRecyclingStation → rubbleHeap, hydroelectricPowerPlant → damSlot, geothermicPowerPlant → geothermalVent, riverSewageTreatmentPlant → riverSlot. Mine-site attachments (monitoringStation, co2Reservoir) stay ungated — gating on "has any mine" isn't worth the modeling. `BUILDING_PLACEMENTS` per the research table (offshoreWindPark = coastal).

## UI

- **Add dropdown** grows to ~90 entries → `<optgroup>` per category (Production / Power / Eco / Materials), production first.
- **Ledger sort:** production buildings keep the chain/tier sort; other categories follow after, grouped by category, alphabetical within.
- **Operating load line** gains sign coloring for power and eco (positive fine, negative highlighted), eco "—" underwater.
- **No new sections.** Power/eco live entirely in the island cards + empire owned-impact summary.

## Icons

None of the ~32 new buildings have icons in the local asset dump. One-time fetch from the wiki (`api.php` image queries) into `public/assets/`, same `*_Qoor.png`-style naming where the wiki reuses goods icons — with unique filenames per building, since `buildingIdForImage` requires image uniqueness. Fetched during implementation, committed like the existing assets.

## Tests

- Catalog invariants: every entry has a category; power entries have `power > 0`; eco entries `ecoBalance > 0`; underwater placements have `ecoBalance ≥ 0` → extend existing data tests.
- `islandEnergyEco`: Tycoon cap formula (T fills only up to 0; Eco buildings can exceed 0), underwater — case.
- Fuel: island with coal power station shows coal intermediate demand in local balance; transfer needs pick it up cross-island.
- Integration: add a wind park via the ledger → operating load power goes positive; add-list gating for a deposit building (uranium mine).

## Out of scope

Energy transfer routing between islands, radius/influence mechanics, wind-park overlap penalties, construction-material goods flows and storage, taxation.
