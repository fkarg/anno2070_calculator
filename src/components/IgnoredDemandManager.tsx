import { isDemandUnlocked, type IgnoredDemandSource } from '../calculations/demand-policy';
import { GOODS } from '../calculations/goods';
import type { Faction } from '../calculations/population';
import { demandSourceLabel } from './demand-source-label';

type Props = {
  ignored: readonly IgnoredDemandSource[];
  actualPopulations: Record<Faction, readonly number[] | null>;
  onRestore: (source: IgnoredDemandSource) => void;
  onRestoreAll: () => void;
};

export function IgnoredDemandManager({ ignored, actualPopulations, onRestore, onRestoreAll }: Props) {
  if (ignored.length === 0) return null;
  return <details id="ignored-demands" className="ignored-demands" data-testid="ignored-demand-manager">
    <summary aria-label={`Show ${ignored.length} ignored ${ignored.length === 1 ? 'demand' : 'demands'}`}>
      Ignored demands ({ignored.length})
    </summary>
    <ul>
      {ignored.map((source) => {
        const label = demandSourceLabel(source);
        const population = actualPopulations[source.faction];
        const demand = GOODS.get(source.goodId)?.finalDemands
          .find((candidate) => candidate.faction === source.faction);
        const active = population !== null
          && demand !== undefined
          && (population[source.tier] ?? 0) > 0
          && isDemandUnlocked(demand.satisfaction, demand.unlockAt, population);
        return <li key={`${source.faction}-${source.tier}-${source.goodId}`}>
          <span>{label}</span>
          <small>{active ? 'Currently applicable' : 'Not currently applicable'}</small>
          <button type="button" aria-label={`Restore ${label}`} onClick={() => onRestore(source)}>Restore</button>
        </li>;
      })}
    </ul>
    <button type="button" onClick={onRestoreAll}>Restore all</button>
  </details>;
}
