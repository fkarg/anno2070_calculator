import { useEffect, useState } from 'react';

import type { Faction } from './calculations/population';
import { calculateAvailableProduction } from './calculations/calculate-production';
import { aggregateBalances, transferNeeds } from './calculations/island-balance';
import { calculateOperatingImpacts, calculateOwnedImpact } from './calculations/operating-impact';
import { PRODUCTION_NODES } from './calculations/production-data';
import { CoverageSection } from './components/CoverageSection';
import { IslandsSection } from './components/IslandsSection';
import { PopulationSection } from './components/PopulationSection';
import { ProductionSection } from './components/ProductionSection';
import { createInitialAppState, sumIslandHouses, sumIslandPopulations, type AppState } from './island';
import {
  effectivePopulation,
  parsePositiveNumber,
  type CalculatorState,
  type EditableNumber,
  type FactionState,
} from './model';
import { loadAppState, saveAppState } from './storage';

export function App() {
  const [initial] = useState(loadAppState);
  const [state, setState] = useState(initial.state);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    // A payload that failed to load stays untouched until a real user change.
    if (initial.storable || dirty) saveAppState(state);
  }, [state, initial.storable, dirty]);

  const update = (updater: (current: AppState) => AppState) => {
    setDirty(true);
    setState(updater);
  };
  const updatePlan = (updater: (current: CalculatorState) => CalculatorState) =>
    update((current) => ({ ...current, plan: updater(current.plan) }));

  const islandHouses = sumIslandHouses(state.islands);
  const islandPopulations = sumIslandPopulations(state.islands);
  const population = {
    eco: effectivePopulation('eco', state.plan.factions.eco, islandHouses.eco, islandPopulations.eco),
    tycoon: effectivePopulation('tycoon', state.plan.factions.tycoon, islandHouses.tycoon, islandPopulations.tycoon),
    tech: effectivePopulation('tech', state.plan.factions.tech, islandHouses.tech, islandPopulations.tech),
  };
  const productivity = Object.fromEntries(
    Object.entries(state.plan.productivity).map(([id, entry]) => [id, entry.value]),
  );
  const production = calculateAvailableProduction({
    population,
    productivity,
    recycling: state.plan.recycling,
    wholeBuildings: state.plan.wholeBuildings,
  });
  const operatingImpacts = calculateOperatingImpacts(production);
  const empireBalances = aggregateBalances(state.islands);
  const needs = transferNeeds(state.islands);
  const ownedImpact = calculateOwnedImpact(state.islands);

  const updateFaction = (
    faction: Faction,
    updateFactionState: (current: FactionState) => FactionState,
  ) => {
    updatePlan((current) => ({
      ...current,
      factions: {
        ...current.factions,
        [faction]: updateFactionState(current.factions[faction]),
      },
    }));
  };

  return (
    <main>
      <header>
        <div>
          <h1>Anno 2070 Deep Ocean</h1>
          <p>Supply &amp; demand calculator</p>
        </div>
        <button type="button" onClick={() => update(createInitialAppState)}>Reset all</button>
      </header>

      <PopulationSection
        state={state.plan}
        islandHouses={islandHouses}
        islandPopulations={islandPopulations}
        onFactionChange={updateFaction}
        onBonusChange={(faction, bonus, checked) => update((current) => ({
          ...current,
          // Bonuses are global per faction: mirror onto plan and every island
          // so the per-island population math stays correct without new params.
          plan: {
            ...current.plan,
            factions: {
              ...current.plan.factions,
              [faction]: { ...current.plan.factions[faction], [bonus]: checked },
            },
          },
          islands: current.islands.map((island) => ({
            ...island,
            factions: {
              ...island.factions,
              [faction]: { ...island.factions[faction], [bonus]: checked },
            },
          })),
        }))}
      />
      <IslandsSection
        islands={state.islands}
        planRequirements={production}
        onIslandsChange={(updater) => update((current) => ({
          ...current,
          // New or edited islands inherit the global per-faction bonuses.
          islands: updater(current.islands).map((island) => ({
            ...island,
            factions: {
              eco: { ...island.factions.eco, livingSpace: current.plan.factions.eco.livingSpace, senate: current.plan.factions.eco.senate },
              tycoon: { ...island.factions.tycoon, livingSpace: current.plan.factions.tycoon.livingSpace, senate: current.plan.factions.tycoon.senate },
              tech: { ...island.factions.tech, livingSpace: current.plan.factions.tech.livingSpace, senate: current.plan.factions.tech.senate },
            },
          })),
        }))}
      />
      <CoverageSection
        islands={state.islands}
        planRequirements={production}
        planIsManual={(['eco', 'tycoon', 'tech'] as const).some((faction) =>
          state.plan.factions[faction].houses !== null
          || state.plan.factions[faction].overrides.some((override) => override !== null))}
      />
      <ProductionSection
        state={state.plan}
        results={production}
        operatingImpacts={operatingImpacts}
        islands={state.islands}
        empireBalances={empireBalances}
        needs={needs}
        ownedImpact={ownedImpact}
        onProductivityChange={(id: string, value: EditableNumber) => updatePlan((current) => ({
          ...current,
          productivity: {
            ...current.productivity,
            [id]: { raw: value.raw, value: parsePositiveNumber(value.raw) },
          },
        }))}
        onFactionProductivityChange={(faction, delta) => updatePlan((current) => ({
          ...current,
          productivity: Object.fromEntries(Object.entries(current.productivity).map(([id, entry]) => {
            const node = PRODUCTION_NODES.find((candidate) => candidate.id === id)!;
            if (node.faction !== faction || entry.value === null || entry.value + delta <= 0) {
              return [id, entry];
            }
            const value = entry.value + delta;
            return [id, { raw: String(value), value }];
          })),
        }))}
        onRecyclingChange={(recycling) => updatePlan((current) => ({ ...current, recycling }))}
        onWholeBuildingsChange={(wholeBuildings) => updatePlan((current) => ({ ...current, wholeBuildings }))}
      />

      <aside className="calculator-section page-notes" aria-label="Calculator guidance">
        <details open>
          <summary>How to use it</summary>
          <ul>
            <li>Enter residences and select the highest occupied population tier. Population and production update immediately.</li>
            <li>Edit any population field to hold it as a highlighted manual value; select Auto beside it to resume calculation.</li>
            <li>Set each building's productivity to match your island. Grey rows show alternate production sources, not additional requirements.</li>
          </ul>
        </details>
        <section>
          <h2>Copper tip</h2>
          <div className="copper-tip">
            <figure><img src="/assets/Copper_Qoor.png" alt="" /><figcaption>1 Copper mine</figcaption></figure>
            <strong>=</strong>
            <figure><img src="/assets/copper_converter_Qoor.png" alt="" /><figcaption>1 Copper converter</figcaption></figure>
          </div>
        </section>
      </aside>

      <footer>
        Rebuilt from the{' '}
        <a href="http://anno2070.atspace.eu/">archived Anno 2070 Deep Ocean calculator</a>. Source work licensed under{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>.
      </footer>
    </main>
  );
}
