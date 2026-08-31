import { BUILDINGS } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import { FACTION_CONFIGS } from '../model';

export function demandSourceLabel(source: IgnoredDemandSource): string {
  const faction = FACTION_CONFIGS[source.faction];
  return `${faction.label} · ${faction.tierLabels[source.tier]} · ${BUILDINGS[source.goodId].label}`;
}
