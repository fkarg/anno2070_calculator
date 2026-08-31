import { islandProductivity, type IslandState } from '../island';
import { BUILDINGS, TYCOON_ECO_BUILDINGS, type BuildingId, type OperatingImpact } from './building-data';
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

// Every settled island starts with its warehouse: -10 credits, +6 power on
// land; underwater islands settle with a deep sea warehouse (-60, +8). The
// underwater warehouse is the depot equivalent and lives in the catalog.
export const WAREHOUSE_IMPACT: OperatingImpact = { maintenanceCredits: -10, power: 6, ecoBalance: 0 };
export const DEEP_SEA_WAREHOUSE_IMPACT: OperatingImpact = { maintenanceCredits: -60, power: 8, ecoBalance: 0 };

// One island's summed impact, with the wiki eco rules applied: Tycoon eco
// buildings only fill the balance up to 0, and underwater islands have no
// ecobalance at all (their eco reads 0; the display shows a dash).
export function islandOperatingImpact(island: IslandState): OperatingImpact | null {
  let total = island.settled
    ? (island.underwater ? DEEP_SEA_WAREHOUSE_IMPACT : WAREHOUSE_IMPACT)
    : ZERO_OPERATING_IMPACT;
  let tycoonEcoOutput = 0;
  for (const [buildingId, entry] of Object.entries(island.owned)) {
    if (entry.value === null) return null;
    const definition = BUILDINGS[buildingId as BuildingId];
    let scaled = scaleOperatingImpact(definition.operatingImpact, entry.value);
    if (definition.scalableOutput) {
      // Population-scaled buildings: the % scales their positive output only;
      // maintenance and their own consumption stay full.
      const productivity = islandProductivity(island, buildingId as BuildingId);
      if (productivity === null) return null;
      scaled = {
        maintenanceCredits: scaled.maintenanceCredits,
        power: scaled.power > 0 ? scaled.power * (productivity / 100) : scaled.power,
        ecoBalance: scaled.ecoBalance > 0 ? scaled.ecoBalance * (productivity / 100) : scaled.ecoBalance,
      };
    }
    if (TYCOON_ECO_BUILDINGS.has(buildingId as BuildingId)) {
      tycoonEcoOutput += scaled.ecoBalance;
      scaled = { ...scaled, ecoBalance: 0 };
    }
    total = addOperatingImpacts(total, scaled);
  }
  const ecoBalance = island.underwater
    ? 0
    : total.ecoBalance + Math.min(tycoonEcoOutput, Math.max(0, -total.ecoBalance));
  return { ...total, ecoBalance };
}

export function calculateOwnedImpact(islands: readonly IslandState[]): OperatingImpact | null {
  let total = ZERO_OPERATING_IMPACT;
  for (const island of islands) {
    if (!island.settled) continue;
    const impact = islandOperatingImpact(island);
    if (impact === null) return null;
    total = addOperatingImpacts(total, impact);
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
