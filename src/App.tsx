import { useEffect, useState } from 'react';

import type { Faction } from './calculations/population';
import { calculateProduction } from './calculations/calculate-production';
import { PRODUCTION_NODES } from './calculations/production-data';
import { PopulationSection } from './components/PopulationSection';
import { ProductionSection } from './components/ProductionSection';
import {
  createInitialState,
  effectivePopulations,
  parsePositiveNumber,
  type EditableNumber,
  type FactionState,
} from './model';
import { loadCalculatorState, saveCalculatorState } from './storage';

export function App() {
  const [state, setState] = useState(loadCalculatorState);
  useEffect(() => saveCalculatorState(state), [state]);
  const population = effectivePopulations(state);
  const productivityEntries = Object.entries(state.productivity);
  const productivityValid = productivityEntries.every(([, entry]) => entry.value !== null);
  const productivity = productivityValid
    ? Object.fromEntries(productivityEntries.map(([id, entry]) => [id, entry.value as number]))
    : null;
  const production = population && productivity
    ? calculateProduction({
      population,
      productivity,
      recycling: state.recycling,
      wholeBuildings: state.wholeBuildings,
    })
    : null;

  const updateFaction = (
    faction: Faction,
    update: (current: FactionState) => FactionState,
  ) => {
    setState((current) => ({
      ...current,
      factions: {
        ...current.factions,
        [faction]: update(current.factions[faction]),
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
        <button type="button" onClick={() => setState(createInitialState())}>Reset all</button>
      </header>

      <PopulationSection state={state} onFactionChange={updateFaction} />
      <ProductionSection
        state={state}
        results={production}
        onProductivityChange={(id: string, value: EditableNumber) => setState((current) => ({
          ...current,
          productivity: {
            ...current.productivity,
            [id]: { raw: value.raw, value: parsePositiveNumber(value.raw) },
          },
        }))}
        onFactionProductivityChange={(faction, delta) => setState((current) => ({
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
        onRecyclingChange={(recycling) => setState((current) => ({ ...current, recycling }))}
        onWholeBuildingsChange={(wholeBuildings) => setState((current) => ({ ...current, wholeBuildings }))}
      />

      <aside className="calculator-section page-notes" aria-label="Calculator guidance">
        <section>
          <h2>How to use it</h2>
          <ul>
            <li>Enter residences and select the highest occupied population tier. Population and production update immediately.</li>
            <li>Edit any population field to hold it as a highlighted manual value; select Auto beside it to resume calculation.</li>
            <li>Set each building's productivity to match your island. Grey rows show alternate production sources, not additional requirements.</li>
          </ul>
        </section>
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
        Rebuilt from the archived Anno 2070 Deep Ocean calculator. Source work licensed under{' '}
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>.
      </footer>
    </main>
  );
}
