import type { IgnoredDemandSource } from '../calculations/demand-policy';
import { demandSourceLabel } from './demand-source-label';

type Props = {
  sources: readonly IgnoredDemandSource[];
  onIgnore: (source: IgnoredDemandSource) => void;
};

export function DemandSourceActions({ sources, onIgnore }: Props) {
  if (sources.length === 0) return null;
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
