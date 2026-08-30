# Taxation and Partially-Satisfied Needs — Research Notes

Wiki-verified findings (2026-08-30) for the upcoming planning-mode features. Primary source: anno2070.fandom.com (fetched via the MediaWiki API; page URLs 402 but `api.php` via curl works).

## What a calculator can model deterministically

- **Tax levels**: five slider positions per island per tier — Euphoric / Happy / Calm / Irritated / Enraged. Raw income rises monotonically left→right, but Calm is the highest *sustainable* setting (no move-out). Only Euphoric (plus full occupancy and all needs incl. desires) allows ascension. ([Taxation](https://anno2070.fandom.com/wiki/Taxation), [de: Steuereinnahmen](https://anno2070.fandom.com/de/wiki/Steuereinnahmen))
- **Needs vs desires**: a good introduced at a tier is a *desire* there and a *genuine need* one tier up. Unmet genuine need → forced red mood → emigration; unmet/disabled desire → tax loss + ascension block only. Ascension needs ALL needs and desires satisfied. ([Population](https://anno2070.fandom.com/wiki/Population))
- **Partial supply does NOT proportionally shrink house population** in 2070 (that model belongs to Anno 1800). House capacity is a fixed per-tier constant; partial supply acts through the mood/tax bar, and population change is a rate process (growth at green, static at Calm, decay at orange/red). Honest deterministic model: all genuine needs met → full capacity; a genuine need unmet → decays toward empty (rate is simulation-dependent); desires unmet → full capacity, reduced tax.
- **Consumption reduction**: Eco "Out of the old comes the new" = −15% on exactly Communicators, Service Bots, 3D Projectors (our three `recyclable` nodes — model verified). No Tycoon/Tech equivalent exists. In-game it is Education-Network-radius-limited; we idealize island-wide, worth a UI note. ([Education Network](https://anno2070.fandom.com/wiki/Education_Network))
- **Tax bonus channels**: +5% tax income per faction info building (radius-limited); +12% living space channels raise house capacity (Employees 15→16, Engineers 25→28, Executives 40→44, Researchers 30→33, Geniuses 50→56) *and the population's needs with it*. The Financial Center is the Tycoon Participation building, NOT a tax bonus.
- **Ecobalance satisfaction table**: +30/+25/+20% (Eco/Tech/Tycoon) at +995 down to −60/−30/−20% at −999; neutral in the 0…−24 band. ([Ecobalance](https://anno2070.fandom.com/wiki/Ecobalance))
- **Need unlock thresholds** per residence/population count and per-tier ascension ratios (Eco/Tycoon 100/80/60/40%, Tech 100/60/30%) are fully tabulated on the Population page.

## What is NOT documented (hard limit for a taxation feature)

**No official credits-per-resident table exists anywhere** — not on the wikis, not in the odegroot data extraction. Only scattered community measurements:

- Tycoon Workers ≈ 0.99 c/worker (food 100%, Calm; ≈0.6 food-only); Drink worth ≈ 0.3.
- Tycoon Employees ≈ 0.54/0.66/0.79 c at Euphoric/Happy/Calm (before a needs breakpoint near ~1,825 employees where per-capita income *drops*).
- Executives ≈ 2.65 c flat while Lifestyle ≤35%, then +0.0146 c per Lifestyle-% (single-source Steam measurement); ≈3.53 c at all-needs-100%.
- Relative ordering: Eco > Tycoon > Tech per-capita.

The satisfaction→tax curve appears piecewise linear per need (floor to 35%, linear above) but is measured once, for one tier. Needs breakpoints vs tier population are the wiki's own original research with no formula.

**Route to exact values**: extract `assets.xml` from the game's RDA archives (the user owns the game). Anything else stays estimate-grade and must be labeled as such in the UI.

## Sources

Taxation, Population, Education Network, Ministry of Truth, Information Center, Financial Center, Ecobalance, Residence Ruins pages on anno2070.fandom.com; Steam "Tax Calculation Data" thread; AnnoZone "Luxusgüter rechnen sich nicht?"; anno2070rechner.de; github.com/odegroot/Anno-2070-data-extraction.
