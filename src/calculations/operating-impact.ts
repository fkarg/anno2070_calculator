import type { IslandState } from '../island';
import { BUILDINGS, type BuildingId, type OperatingImpact } from './building-data';
import { PRODUCTION_NODES } from './production-data';
import { buildProductionTrees } from './production-tree';

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

export const ZERO_OPERATING_IMPACT: OperatingImpact = {
  maintenanceCredits: 0,
  power: 0,
  ecoBalance: 0,
};

export function addOperatingImpacts(
  left: OperatingImpact,
  right: OperatingImpact,
): OperatingImpact {
  return {
    maintenanceCredits: left.maintenanceCredits + right.maintenanceCredits,
    power: left.power + right.power,
    ecoBalance: left.ecoBalance + right.ecoBalance,
  };
}

export function scaleOperatingImpact(impact: OperatingImpact, count: number): OperatingImpact {
  return {
    maintenanceCredits: impact.maintenanceCredits * count,
    power: impact.power * count,
    ecoBalance: impact.ecoBalance * count,
  };
}

export type VariantOperatingImpact = Readonly<{
  id: string;
  label: string;
  impact: OperatingImpact | null;
}>;

export type ProductionOperatingImpacts = Readonly<{
  direct: Readonly<Record<string, OperatingImpact | null>>;
  byRoot: Readonly<Record<string, readonly VariantOperatingImpact[]>>;
}>;

export function calculateOwnedImpact(islands: readonly IslandState[]): OperatingImpact | null {
  let total = ZERO_OPERATING_IMPACT;
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned)) {
      if (entry.value === null) return null;
      total = addOperatingImpacts(
        total,
        scaleOperatingImpact(BUILDINGS[buildingId as BuildingId].operatingImpact, entry.value),
      );
    }
  }
  return total;
}

export function calculateOperatingImpacts(
  requirements: Readonly<Record<string, number | null>>,
): ProductionOperatingImpacts {
  const direct: Record<string, OperatingImpact | null> = {};
  for (const node of PRODUCTION_NODES) {
    const count = requirements[node.id];
    direct[node.id] = count === null
      ? null
      : scaleOperatingImpact(BUILDINGS[node.buildingId].operatingImpact, count);
  }

  const byRoot: Record<string, readonly VariantOperatingImpact[]> = {};
  for (const tree of (['eco', 'tycoon', 'tech'] as const).flatMap(buildProductionTrees)) {
    byRoot[tree.rootId] = tree.variants.map((variant) => {
      let impact: OperatingImpact | null = ZERO_OPERATING_IMPACT;
      for (const nodeId of variant.nodeIds) {
        const count = requirements[nodeId];
        if (count === null) {
          impact = null;
          break;
        }
        const node = nodeById.get(nodeId)!;
        impact = addOperatingImpacts(
          impact,
          scaleOperatingImpact(BUILDINGS[node.buildingId].operatingImpact, Math.ceil(count)),
        );
      }
      return { id: variant.id, label: variant.label, impact };
    });
  }

  return { direct, byRoot };
}
