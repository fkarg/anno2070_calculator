# Needs, demand, and ascension terminology

Research for the Growth planner vocabulary and scope boundary. The key finding is that Anno 2070 does not assign a simple essential/optional flag to each good. Goods contribute percentages to satisfaction categories, and the required category percentage changes with population size and purpose.

## Verified model

- The [official manual](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/48240/manuals/Manual.pdf?t=1692033142) distinguishes requirements for long-term settlement from requirements for advancement. Ascension additionally requires maximum satisfaction, sufficiently low taxes, public-building coverage, materials, and ascension rights.
- The primary-derived [extracted `properties.xml`](https://github.com/odegroot/Anno-2070-data-extraction/blob/master/src/rda/patch5/data/config/game/properties.xml) models this through category-level `LevelMaintaining` and `UpgradeRelevant` quotes, population-size interpolation points, and each good's percentage contribution (`DemandEfficiency`) to Food, Drink, or Lifestyle.
- The [Population reference](https://anno2070.fandom.com/wiki/Population) summarizes the player-facing distinction: unmet genuine Needs can cause residents to leave; Desires may be disabled at a tax cost; both Needs and Desires must be satisfied for ascension.

Functional Food demonstrates why a per-good boolean is incorrect. With Deep Ocean, Lab Assistant Food is split 50% Fish and 50% Functional Food. Fish alone can cover the maintenance minimum, but a large Lab Assistant population needs part of the Functional Food contribution to reach the ascension quote. Researcher Food shifts to 25% Fish and 75% Functional Food; its maintenance quote is high enough that Functional Food becomes partly retention-critical. The [Goods reference](https://anno2070.fandom.com/wiki/Goods) and [Fishery reference](https://anno2070.fandom.com/wiki/Fishery) provide the corresponding player-facing chain descriptions.

Goods also unlock at population thresholds. Examples include Functional Food at 50 Lab Assistants and Health Food / Convenience Food at 360 tier-two residents. The current calculator stores per-tier full-consumption rates but not unlock thresholds, category contributions, satisfaction quotes, enabled desires, or island-local satisfaction state.

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

The Growth implementation remains a full-supply goods planner. It does not calculate minimum retention supply, minimum ascension supply, taxation, public-building coverage, desire toggles, or satisfaction percentages.

Island `Build next` suggestions must depend only on current actual full-demand deficits. Future target gaps belong to Growth and should not appear as generic `plan +N` island suggestions.

An exact later layer should derive category weights, unlock thresholds, population-interpolated maintenance/upgrade quotes, and partial satisfaction from the extracted game data before using `necessary`, `essential`, or exact ascension-readiness claims.
