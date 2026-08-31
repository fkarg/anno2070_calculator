import type { Faction } from '../calculations/population';
import type { ResolvedPopulationTarget } from '../calculations/population-target';
import { FACTIONS, type CalculatorState, type PlanFactionState } from '../model';
import { GrowthTargetFaction } from './GrowthTargetFaction';
import { GrowthMilestones } from './GrowthMilestones';
import type { GrowthPlanningResult } from '../calculations/planning';
import type { BuildingId } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import type { IslandState } from '../island';
import { IgnoredDemandManager } from './IgnoredDemandManager';

type Props = {
  state: CalculatorState;
  targets: Record<Faction, ResolvedPopulationTarget | null>;
  planning: GrowthPlanningResult | null;
  islands: readonly IslandState[];
  onFactionChange: (faction: Faction, state: PlanFactionState) => void;
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
  actualPopulations: Record<Faction, readonly number[] | null>;
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
  onRestoreDemand: (source: IgnoredDemandSource) => void;
  onRestoreAllDemands: () => void;
};

export function GrowthSection({ state, targets, planning, islands, actualPopulations, onFactionChange, onApplyBuilding, onIgnoreDemand, onRestoreDemand, onRestoreAllDemands }: Props) {
  return <section className="calculator-section growth-section"><div className="calculator-section__heading"><h2>Growth</h2><p>Set population targets; full-supply milestones follow below</p></div><div className="growth-targets">{FACTIONS.map((faction) => <GrowthTargetFaction key={faction} faction={faction} state={state.factions[faction]} resolved={targets[faction]} onChange={(next) => onFactionChange(faction, next)} />)}</div><IgnoredDemandManager ignored={state.ignoredDemands} actualPopulations={actualPopulations} onRestore={onRestoreDemand} onRestoreAll={onRestoreAllDemands} /><GrowthMilestones planning={planning} islands={islands} onApplyBuilding={onApplyBuilding} onIgnoreDemand={onIgnoreDemand} /></section>;
}
