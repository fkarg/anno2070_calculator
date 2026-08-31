import { useEffect, useState, type KeyboardEvent } from 'react';

import type { Faction } from './calculations/population';
import { resolvePopulationTarget } from './calculations/population-target';
import { calculateAvailableProduction } from './calculations/calculate-production';
import { calculateGrowthPlanning } from './calculations/planning';
import type { BuildingId } from './calculations/building-data';
import { sameDemandSource, type IgnoredDemandSource } from './calculations/demand-policy';
import { aggregateBalances, transferNeeds } from './calculations/island-balance';
import { calculateOperatingImpacts, calculateOwnedImpact } from './calculations/operating-impact';
import { PRODUCTION_NODES } from './calculations/production-data';
import { CoverageSection } from './components/CoverageSection';
import { GrowthSection } from './components/GrowthSection';
import { IslandsSection } from './components/IslandsSection';
import { PopulationSection } from './components/PopulationSection';
import { ProductionSection } from './components/ProductionSection';
import { createInitialAppState, stepOwnedBuilding, sumIslandHouses, sumIslandPopulations, type AppState } from './island';
import {
  parsePositiveNumber,
  type CalculatorState,
  type EditableNumber,
  type PlanFactionState,
} from './model';
import { loadAppState, saveAppState } from './storage';

export function App() {
  const [initial] = useState(loadAppState);
  const [state, setState] = useState(initial.state);
  const [dirty, setDirty] = useState(false);
  const [workspace, setWorkspace] = useState<'islands' | 'production' | 'growth'>('islands');
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
  const targets = {
    eco: resolvePopulationTarget('eco', state.plan.factions.eco, islandHouses.eco, islandPopulations.eco),
    tycoon: resolvePopulationTarget('tycoon', state.plan.factions.tycoon, islandHouses.tycoon, islandPopulations.tycoon),
    tech: resolvePopulationTarget('tech', state.plan.factions.tech, islandHouses.tech, islandPopulations.tech),
  };
  const planning = calculateGrowthPlanning(state.plan, state.islands);
  const productivity = Object.fromEntries(
    Object.entries(state.plan.productivity).map(([id, entry]) => [id, entry.value]),
  );
  const production = calculateAvailableProduction({
    population: islandPopulations,
    productivity,
    recycling: state.plan.recycling,
    wholeBuildings: state.plan.wholeBuildings,
    ignoredDemands: state.plan.ignoredDemands,
  });
  const targetProduction = calculateAvailableProduction({
    population: {
      eco: targets.eco?.effectivePopulations ?? null,
      tycoon: targets.tycoon?.effectivePopulations ?? null,
      tech: targets.tech?.effectivePopulations ?? null,
    },
    productivity,
    recycling: state.plan.recycling,
    wholeBuildings: state.plan.wholeBuildings,
    ignoredDemands: state.plan.ignoredDemands,
  });
  const fractionalProduction = calculateAvailableProduction({
    population: islandPopulations,
    productivity,
    recycling: state.plan.recycling,
    wholeBuildings: false,
    ignoredDemands: state.plan.ignoredDemands,
  });
  const operatingImpacts = calculateOperatingImpacts(fractionalProduction);
  const empireBalances = aggregateBalances(state.islands, state.plan.ignoredDemands);
  const needs = transferNeeds(state.islands, state.plan.ignoredDemands);
  const ownedImpact = calculateOwnedImpact(state.islands);

  const updateFaction = (faction: Faction, next: PlanFactionState) => {
    updatePlan((current) => ({
      ...current,
      factions: {
        ...current.factions,
        [faction]: next,
      },
    }));
  };
  const updateBonus = (faction: Faction, bonus: 'livingSpace' | 'senate', checked: boolean) => update((current) => ({
    ...current,
    plan: { ...current.plan, factions: { ...current.plan.factions, [faction]: { ...current.plan.factions[faction], [bonus]: checked } } },
    islands: current.islands.map((island) => ({ ...island, factions: { ...island.factions, [faction]: { ...island.factions[faction], [bonus]: checked } } })),
  }));
  const applyBuilding = (islandId: string, buildingId: BuildingId) => update((current) => ({
    ...current,
    islands: current.islands.map((island) => island.id === islandId
      ? stepOwnedBuilding(island, buildingId, 1)
      : island),
  }));
  const ignoreDemand = (source: IgnoredDemandSource) => updatePlan((current) => (
    current.ignoredDemands.some((entry) => sameDemandSource(entry, source))
      ? current
      : { ...current, ignoredDemands: [...current.ignoredDemands, source] }
  ));
  const restoreDemand = (source: IgnoredDemandSource) => updatePlan((current) => ({
    ...current,
    ignoredDemands: current.ignoredDemands.filter((entry) => !sameDemandSource(entry, source)),
  }));
  const restoreAllDemands = () => updatePlan((current) => ({ ...current, ignoredDemands: [] }));
  const manageIgnoredDemands = () => {
    setWorkspace('growth');
    window.setTimeout(() => document.querySelector<HTMLElement>('#ignored-demands > summary')?.focus(), 0);
  };

  const workspaces = ['islands', 'production', 'growth'] as const;
  const onWorkspaceKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: typeof workspaces[number],
  ) => {
    const index = workspaces.indexOf(current);
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? workspaces.length - 1
        : event.key === 'ArrowRight' ? (index + 1) % workspaces.length
          : event.key === 'ArrowLeft' ? (index - 1 + workspaces.length) % workspaces.length
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = workspaces[nextIndex];
    setWorkspace(next);
    document.getElementById(`tab-${next}`)?.focus();
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
        actualHouses={islandHouses}
        actualPopulations={islandPopulations}
        targets={targets}
        factionStates={state.plan.factions}
        ignoredDemands={state.plan.ignoredDemands}
        islands={state.islands}
        onBonusChange={updateBonus}
        onManageIgnoredDemands={manageIgnoredDemands}
      />
      <nav className="workspace-tabs" role="tablist" aria-label="Calculator workspace">
        {workspaces.map((item) => (
          <button
            key={item}
            id={`tab-${item}`}
            type="button"
            role="tab"
            aria-selected={workspace === item}
            aria-controls={`workspace-${item}`}
            tabIndex={workspace === item ? 0 : -1}
            onClick={() => setWorkspace(item)}
            onKeyDown={(event) => onWorkspaceKeyDown(event, item)}
          >{item[0].toUpperCase() + item.slice(1)}</button>
        ))}
      </nav>

      <div id="workspace-islands" className="workspace-panel" role="tabpanel" aria-labelledby="tab-islands" hidden={workspace !== 'islands'}>
        <IslandsSection
            islands={state.islands}
            ignoredDemands={state.plan.ignoredDemands}
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
      </div>
      <div id="workspace-production" className="workspace-panel" role="tabpanel" aria-labelledby="tab-production" hidden={workspace !== 'production'}>
        <CoverageSection
          islands={state.islands}
          planning={planning}
          ignoredDemands={state.plan.ignoredDemands}
          onIgnoreDemand={ignoreDemand}
          onApplyBuilding={applyBuilding}
        />
        <ProductionSection
              state={state.plan}
              results={production}
              targetResults={targetProduction}
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
                  if (node.faction !== faction || entry.value === null || entry.value + delta <= 0) return [id, entry];
                  const value = entry.value + delta;
                  return [id, { raw: String(value), value }];
                })),
              }))}
              onRecyclingChange={(recycling) => updatePlan((current) => ({ ...current, recycling }))}
              onWholeBuildingsChange={(wholeBuildings) => updatePlan((current) => ({ ...current, wholeBuildings }))}
        />
      </div>
      <div id="workspace-growth" className="workspace-panel" role="tabpanel" aria-labelledby="tab-growth" hidden={workspace !== 'growth'}>
        <GrowthSection state={state.plan} targets={targets} planning={planning} islands={state.islands} actualPopulations={islandPopulations} onFactionChange={updateFaction} onApplyBuilding={applyBuilding} onIgnoreDemand={ignoreDemand} onRestoreDemand={restoreDemand} onRestoreAllDemands={restoreAllDemands} />
      </div>

      <aside className="calculator-section page-notes" aria-label="Calculator guidance">
        <details open>
          <summary>How to use it</summary>
          <ul>
            <li>Record residences and owned buildings on Islands; the overview and current full demand update immediately.</li>
            <li>Use Production to inspect current supply chains, productivity, actual capacity, bottlenecks, and transfers.</li>
            <li>Use Growth to set residence or population targets, then apply its cumulative full-supply building steps to eligible islands.</li>
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
