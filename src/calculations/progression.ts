import type { Faction } from './population';
import { PRODUCTION_NODES } from './production-data';
import type { GoodId } from './goods';

export type AscensionGate = Readonly<{
  faction: Faction;
  fromTier: number;
  toTier: number;
  required: number;
}>;

const ASCENSION_GATES: Readonly<Record<Faction, readonly number[]>> = {
  eco: [144, 750, 1200],
  tycoon: [144, 750, 1200],
  tech: [150, 1200],
};

export type DemandUnlock = Readonly<{
  faction: Faction;
  tier: number;
  population: number;
  goodId: GoodId;
}>;

export function demandUnlocks(faction: Faction, tier: number): DemandUnlock[] {
  return PRODUCTION_NODES.flatMap((node) => {
    if (node.faction !== faction || node.calculation.kind !== 'primary') return [];
    const introducingTier = node.calculation.satisfaction.findIndex((value) => value > 0) + 1;
    return introducingTier === tier ? [{
      faction,
      tier,
      population: node.unlockAt!,
      goodId: node.buildingId as GoodId,
    }] : [];
  });
}

export function ascensionGate(faction: Faction, toTier: number): AscensionGate | null {
  const required = ASCENSION_GATES[faction][toTier - 2];
  return required === undefined ? null : {
    faction,
    fromTier: toTier - 1,
    toTier,
    required,
  };
}

export function populationMeetsAscensionGates(
  faction: Faction,
  toTier: number,
  populationAtTier: (tier: number) => readonly number[],
): boolean {
  for (let tier = 2; tier <= toTier; tier += 1) {
    const gate = ascensionGate(faction, tier)!;
    if (populationAtTier(tier - 1)[tier - 2] < gate.required) return false;
  }
  return true;
}
