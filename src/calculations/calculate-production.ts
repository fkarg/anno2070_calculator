import type { Faction } from './population';
import { maskSatisfaction, type IgnoredDemandSource } from './demand-policy';
import { producedGood } from './goods';
import { calculateMaterial, calculatePrimary } from './production';
import { PRODUCTION_NODES } from './production-data';

export type ProductionInput = {
  population: Record<Faction, readonly number[]>;
  productivity: Record<string, number>;
  recycling: boolean;
  wholeBuildings: boolean;
  ignoredDemands: readonly IgnoredDemandSource[];
};

export type AvailableProductionInput = {
  population: Record<Faction, readonly number[] | null>;
  productivity: Record<string, number | null>;
  recycling: boolean;
  wholeBuildings: boolean;
  ignoredDemands: readonly IgnoredDemandSource[];
};

export function createDefaultProductivity(): Record<string, number> {
  return Object.fromEntries(PRODUCTION_NODES.map((node) => [node.id, 100]));
}

export function calculateProduction(input: ProductionInput): Record<string, number> {
  const result: Record<string, number> = {};

  for (const node of PRODUCTION_NODES) {
    const productivity = input.productivity[node.id];
    if (node.calculation.kind === 'primary') {
      const satisfaction = maskSatisfaction({
        goodId: producedGood(node.buildingId)!,
        faction: node.faction,
        satisfaction: node.calculation.satisfaction,
        unlockAt: node.unlockAt!,
        population: input.population[node.faction],
        ignored: input.ignoredDemands,
      });
      result[node.id] = calculatePrimary(
        satisfaction,
        input.population[node.faction],
        productivity,
        Boolean(node.calculation.recyclable && input.recycling),
        input.wholeBuildings,
      );
    } else {
      result[node.id] = calculateMaterial(
        result[node.calculation.parentId],
        node.calculation.multiplier,
        productivity,
        input.wholeBuildings,
      );
    }
  }

  return result;
}

export function calculateAvailableProduction(
  input: AvailableProductionInput,
): Record<string, number | null> {
  const result: Record<string, number | null> = {};

  for (const node of PRODUCTION_NODES) {
    const productivity = input.productivity[node.id];
    if (productivity === null) {
      result[node.id] = null;
    } else if (node.calculation.kind === 'primary') {
      const population = input.population[node.faction];
      if (population === null) {
        result[node.id] = null;
        continue;
      }
      const satisfaction = maskSatisfaction({
        goodId: producedGood(node.buildingId)!,
        faction: node.faction,
        satisfaction: node.calculation.satisfaction,
        unlockAt: node.unlockAt!,
        population,
        ignored: input.ignoredDemands,
      });
      result[node.id] = calculatePrimary(
        satisfaction,
        population,
        productivity,
        Boolean(node.calculation.recyclable && input.recycling),
        input.wholeBuildings,
      );
    } else {
      const parent = result[node.calculation.parentId];
      result[node.id] = parent === null
        ? null
        : calculateMaterial(parent, node.calculation.multiplier, productivity, input.wholeBuildings);
    }
  }

  return result;
}
