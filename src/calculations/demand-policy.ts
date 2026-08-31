import type { GoodId } from './goods';
import type { Faction } from './population';

export type IgnoredDemandSource = Readonly<{
  faction: Faction;
  tier: number;
  goodId: GoodId;
}>;

export function sameDemandSource(left: IgnoredDemandSource, right: IgnoredDemandSource): boolean {
  return left.faction === right.faction && left.tier === right.tier && left.goodId === right.goodId;
}

export function isDemandIgnored(
  ignored: readonly IgnoredDemandSource[],
  faction: Faction,
  tier: number,
  goodId: GoodId,
): boolean {
  return ignored.some((source) => sameDemandSource(source, { faction, tier, goodId }));
}

export function maskSatisfaction(
  goodId: GoodId,
  faction: Faction,
  satisfaction: readonly number[],
  ignored: readonly IgnoredDemandSource[],
): readonly number[] {
  return satisfaction.map((value, tier) => (
    isDemandIgnored(ignored, faction, tier, goodId) ? 0 : value
  ));
}
