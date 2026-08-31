import { BUILDINGS } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import { FACTION_CONFIGS } from '../model';

type Props = {
  sources: readonly IgnoredDemandSource[];
  onIgnore: (source: IgnoredDemandSource) => void;
};

export function demandSourceLabel(source: IgnoredDemandSource): string {
  const faction = FACTION_CONFIGS[source.faction];
  return `${faction.label} · ${faction.tierLabels[source.tier]} · ${BUILDINGS[source.goodId].label}`;
}

export function DemandSourceActions({ sources, onIgnore }: Props) {
  return <ul className="demand-source-actions">
    {sources.map((source) => {
      const label = demandSourceLabel(source);
      return <li key={`${source.faction}-${source.tier}-${source.goodId}`}>
        <span>{label}</span>
        <button type="button" aria-label={`Ignore ${label} everywhere`} onClick={() => onIgnore(source)}>Ignore</button>
      </li>;
    })}
  </ul>;
}
