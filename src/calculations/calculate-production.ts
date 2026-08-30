import type { Faction } from './population';
import { calculateMaterial, calculatePrimary } from './production';
import { PRODUCTION_NODES } from './production-data';

export type ProductionInput = {
  population: Record<Faction, readonly number[]>;
  productivity: Record<string, number>;
  recycling: boolean;
  wholeBuildings: boolean;
};

export function createDefaultProductivity(): Record<string, number> {
  return Object.fromEntries(PRODUCTION_NODES.map((node) => [node.id, 100]));
}

export function calculateProduction(input: ProductionInput): Record<string, number> {
  const result: Record<string, number> = {};

  for (const node of PRODUCTION_NODES) {
    const productivity = input.productivity[node.id];
    if (node.calculation.kind === 'primary') {
      result[node.id] = calculatePrimary(
        node.calculation.satisfaction,
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
