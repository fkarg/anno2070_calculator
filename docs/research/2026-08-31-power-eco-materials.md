# Power, Ecobalance, and Construction-Material Buildings — Research Notes

Wiki-verified (2026-08-31, via anno2070.fandom.com/api.php; raw wikitext cached during research). Feeds the per-island power/eco balance feature and the construction-material chains. Sign convention: per-minute island-balance deltas.

## Power plants

| Building | Faction/unlock | Maint | Energy | Eco | Placement | Fuel |
|---|---|---|---|---|---|---|
| Wind Park | Eco, 1 Worker | -25 | +15 | 0 | land | — |
| Thermal Power Station | Eco, 750 Employees | -65 | +70 max | 0 | land | scales with inhabitants in range (100% @650) |
| Offshore Wind Park | Eco, 950 Engineers | -50 | +30 | 0 | harbour | — |
| Solar Tower Generator | Eco, 600 Executives | -120 | +120 | 0 | land + mirror fields | — |
| Coal Power Station | Tycoon, 1 Worker | -10 | +60 | -15 | land | coal: 1 rotary excavator or ½ coal mine |
| Nuclear Power Plant | Tycoon, 250 Engineers | -100 | +500 | -10 | land | fuel rods: 1 uranium mine + 1 fuel element factory |
| Marine Current Power Plant | Tech | -40 | +25 | n/a | underwater | — |
| Hydroelectric Power Plant | Tech blueprint | -140 | +500 | -10 | dam slot | — |
| Geothermic Power Plant | Tech DO, 1200 Researchers | -200 | +750 | n/a | underwater vent site | — |
| Energy Transmitter | Tech DO, 1 Genius | -175 | 0 (transfer) | -30 | land/underwater | max 4 send targets, no chaining |

No ecobalance exists underwater (wiki-explicit). Wind parks lose output on influence overlap (floor 35%).

## Ecobalance buildings

Tycoon eco buildings cannot raise island eco above 0; Eco/Guardian/Keeper can. No channel toggles — scaling is population-based (Waste Compactor) or overlap-penalized.

| Building | Faction/unlock | Maint | Energy | Eco out | Placement |
|---|---|---|---|---|---|
| Weather Control Station | Eco, 360 Employees | -20 | -2 | +15 | land |
| Monitoring Station | Eco, 1200 Engineers | -40 | -25 | +40 | mine site |
| Ozone Maker Station | Eco, 1 Executive | -120 | -60 | +100 | land |
| River Sewage Treatment Plant | Eco, 1400 Executives | -200 | -250 | +300 | river slot |
| Guardian 1.0 / Keeper 1.0 | event/DLC | -500 | -250 | +500 | land |
| Waste Compactor | Tycoon, 750 Employees | -40 | -5 | +50 max (scales) | land |
| Deacidification Station | Tycoon, 1 Engineer | -80 | -60 | +90 | land |
| CO2 Reservoir | Tycoon, 600 Executives | -160 | -110 | +200 | mine site |

## Construction materials

Materials: Building Modules + Tools (universal), Wood + Glass (Eco), Concrete + Steel (Tycoon), Carbon (Tech). Corrected tier ladder: basalt/smelter T1, tools T2, wood+concrete T2, glass+steel T3, carbon at Tech unlock.

| Building | Faction | Maint | Energy | Eco | Placement | Chain |
|---|---|---|---|---|---|---|
| Basalt Extraction | Eco | -5 | -1 | 0 | basalt deposit | → granules |
| Basalt Crusher | Tycoon | -5 | -2 | -4 | basalt deposit | → granules |
| Smelter | shared | -5 | -1 | 0 | land | granules → building modules (pair = 1.5 t/min) |
| Underwater Recycling Station | Tech, 750 Researchers | -60 | -4 | n/a | rubble heap (infinite) | → modules (= 2 smelters) |
| Tools Workshop | Eco+Tycoon | -10 | -3 | -4 | land | iron → tools (1 iron smelter : 2 workshops) |
| Tree Nursery | Eco | -10 | -2 | 0 | land | → trees (feeds 4 sawmills) |
| Sawmill | Eco | -5 | -2 | -3 | land | trees → wood |
| Limestone Quarry | Eco+Tycoon | -20 | -2 | -2 | limestone deposit | → limestone |
| Glassworks | Eco | -60 | -3 | -6 | land | sand + limestone → glass (1 sand : 3 quarries : 3 works) |
| Concrete Factory | Tycoon | -10 | -4 | -4 | land | sand + limestone → concrete (1:3:3) |
| Steelworks | Tycoon | -20 | -6 | -6 | land | iron → steel (2 iron smelters : 1) |
| Carbon Factory | Tech | -40 | -6 | -6 | land | coal + oil → carbon |
| Uranium Mine | Tycoon, 250 Engineers | -50 | -4 | -6 | uranium deposit | → uranium |
| Fuel Element Factory | Tycoon, 250 Engineers | -60 | -4 | -6 | land | uranium → fuel rods |
| Metal Converter (modes) | Tech, 750 Researchers | -80…-200 by mode | -25/-30 | n/a | black smoker | iron ore 3 / copper 4 / gold nuggets 1.33 / uranium 1 / platinum 0.667 t/min |

(Existing catalog already covers iron ore mine, coal mine, rotary excavator, iron smelter, sand extractor.)

## Flags

- Absolute t/min rates mostly undocumented; wiki works in building ratios (explicit: modules 1.5 t/min per pair, converter modes, coal mine = 2 excavators).
- Hydroelectric eco −10 despite "green" prose — infobox authoritative.
- Wiki icons: most material buildings reuse goods icons; dedicated icons exist for power/eco buildings (URLs in research transcript). Icons must be fetched — not in the local asset dump.
- Chain-aggregate values on the wiki's Production Chains page are unreliable (sign errors); use per-building infoboxes.
