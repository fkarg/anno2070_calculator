# Needs, demand, and ascension terminology

Research for the Growth planner vocabulary and scope boundary. The key finding is that Anno 2070 does not assign a simple essential/optional flag to each good. Goods contribute percentages to satisfaction categories, and the required category percentage changes with population size and purpose.

## Verified model

- The [official manual](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/48240/manuals/Manual.pdf?t=1692033142) distinguishes requirements for long-term settlement from requirements for advancement. Ascension additionally requires maximum satisfaction, sufficiently low taxes, public-building coverage, materials, and ascension rights.
- The primary-derived [extracted `properties.xml`](https://github.com/odegroot/Anno-2070-data-extraction/blob/master/src/rda/patch5/data/config/game/properties.xml) models this through category-level `LevelMaintaining` and `UpgradeRelevant` quotes, population-size interpolation points, and each good's percentage contribution (`DemandEfficiency`) to Food, Drink, or Lifestyle.
- The [Population reference](https://anno2070.fandom.com/wiki/Population) summarizes the player-facing distinction: unmet genuine Needs can cause residents to leave; Desires may be disabled at a tax cost; both Needs and Desires must be satisfied for ascension.

Functional Food demonstrates why a per-good boolean is incorrect. With Deep Ocean, Lab Assistant Food is split 50% Fish and 50% Functional Food. Fish alone can cover the maintenance minimum, but a large Lab Assistant population needs part of the Functional Food contribution to reach the ascension quote. Researcher Food shifts to 25% Fish and 75% Functional Food; its maintenance quote is high enough that Functional Food becomes partly retention-critical. The [Goods reference](https://anno2070.fandom.com/wiki/Goods) and [Fishery reference](https://anno2070.fandom.com/wiki/Fishery) provide the corresponding player-facing chain descriptions.

Goods also unlock at population thresholds. The calculator now models recurring-goods availability at the following introducing-tier populations:

| Faction | Tier | Recurring demand unlocks |
| --- | --- | --- |
| Eco | Workers | Fish 1; Tea 60 |
| Eco | Employees | Health Food 360; Communicators 600 |
| Eco | Engineers | Pasta Dishes 250; Bio Drinks 950 |
| Eco | Executives | 3D Projectors 1; Service Bots 1,200 |
| Tycoon | Workers | Fish 1; Liquor 60 |
| Tycoon | Employees | Convenience Food 360; Plastics 600 |
| Tycoon | Engineers | Luxury Meals 250; Champagne 950 |
| Tycoon | Executives | Jewelry 1; Pharmaceuticals 1,200 |
| Tech | Lab Assistants | Fish 1; Functional Food 50; Functional Drinks 100 |
| Tech | Researchers | Immunity Drugs 1; Neuroimplants 600 |
| Tech | Geniuses | Laboratory Instruments 1; Bionic Suits 600 |

Current availability is derived from actual empire population, while Growth evaluates each planned checkpoint. A higher occupied tier proves earlier-tier unlocks. Because game unlocks persist, a snapshot whose final-tier population later fell below a previously reached threshold cannot prove that historical unlock; the calculator conservatively uses the population visible now.

Ascension population gates are also modeled as planning feasibility constraints: Eco and Tycoon require 144 Workers, 750 Employees, and 1,200 Engineers for the next tier; Tech requires 150 Lab Assistants and 1,200 Researchers. These counts do not claim complete ascension readiness: category satisfaction, taxes, public buildings, materials, and ascension rights remain outside the current model.

## Vocabulary for the current implementation

- **Actual**: recorded island residences, population, buildings, and productivity.
- **Current full demand**: the goods required to fully satisfy the modeled actual population under the calculator's existing full-consumption assumptions. It is not the minimum required to retain residents.
- **Target**: the population state selected in Growth.
- **Target full demand**: the goods required to fully satisfy that target population.
- **Headroom / limit**: additional population supported against full demand, or the good that exhausts first.
- **Ascension-relevant**: a good contributes to satisfaction needed for a selected ascension. This does not claim that the displayed full-demand quantity is the minimum ascension quantity.
- **Plan**: the ordered Growth milestones and user-selected route toward a target. It is not a synonym for any production gap.
- **Need / necessary**: reserve these words for genuine retention requirements once exact partial-satisfaction modeling exists.

## Current scope decision

The Growth implementation remains a full-supply goods planner. It gates recurring demands and population progression at verified thresholds, but it does not calculate minimum retention supply, minimum ascension supply, taxation, public-building coverage, desire toggles, or satisfaction percentages.

Island `Build next` suggestions must depend only on current actual full-demand deficits. Future target gaps belong to Growth and should not appear as generic `plan +N` island suggestions.

An exact later layer should derive category weights, population-interpolated maintenance/upgrade quotes, and partial satisfaction from the extracted game data before using `necessary`, `essential`, or exact ascension-readiness claims.
