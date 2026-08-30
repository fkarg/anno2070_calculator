import { useState } from 'react';

import type { Faction } from './calculations/population';
import { PopulationSection } from './components/PopulationSection';
import { createInitialState, type FactionState } from './model';

export function App() {
  const [state, setState] = useState(createInitialState);

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
    </main>
  );
}
