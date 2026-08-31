import { BUILDINGS } from '../calculations/building-data';
import type { GrowthMilestone } from '../calculations/planning';
import { FACTION_CONFIGS } from '../model';

function tierLabel(milestone: GrowthMilestone, tier = milestone.tier): string {
  return FACTION_CONFIGS[milestone.faction].tierLabels[tier - 1];
}

function countedTier(value: number, label: string): string {
  if (value !== 1) return `${value} ${label}`;
  if (label === 'Geniuses') return '1 Genius';
  return `1 ${label.endsWith('s') ? label.slice(0, -1) : label}`;
}

export function growthMilestoneTitle(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  if (milestone.gate?.met === false) {
    return `Reach ${milestone.gate.required} ${tierLabel(milestone, milestone.tier - 1)} to unlock ${tierLabel(milestone)}`;
  }
  if (milestone.unlockedGoodIds.length > 0 || milestone.unlocksAscensionTo !== null) {
    const unlocks = [
      ...milestone.unlockedGoodIds.map((goodId) => BUILDINGS[goodId].label),
      ...(milestone.unlocksAscensionTo === null
        ? []
        : [tierLabel(milestone, milestone.unlocksAscensionTo)]),
    ];
    const population = milestone.checkpointPopulation
      ?? milestone.populationAfter[milestone.faction][milestone.tier - 1];
    return `${countedTier(population, tierLabel(milestone))} unlocks ${unlocks.join(' + ')}`;
  }
  return milestone.kind === 'expand'
    ? `Expand ${config.label} at ${tierLabel(milestone)}`
    : `${tierLabel(milestone, milestone.tier - 1)} to ${tierLabel(milestone)}`;
}

export function growthMilestonePopulationSummary(milestone: GrowthMilestone): string {
  if (milestone.gate?.met === false) {
    return `Ascension locked · ${milestone.gate.available} / ${milestone.gate.required} ${tierLabel(milestone, milestone.tier - 1)}`;
  }
  const tier = tierLabel(milestone);
  const delta = milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
  return `${delta >= 0 ? '+' : ''}${delta} ${tier}`;
}
