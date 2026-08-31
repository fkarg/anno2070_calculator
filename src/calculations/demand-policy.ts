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

export function isDemandUnlocked(
  satisfaction: readonly number[],
  unlockAt: number,
  population: readonly number[],
): boolean {
  const introducingTier = satisfaction.findIndex((value) => value > 0);
  if (introducingTier < 0) return false;
  return (population[introducingTier] ?? 0) >= unlockAt
    || population.slice(introducingTier + 1).some((value) => value > 0);
}

export function maskSatisfaction(input: Readonly<{
  goodId: GoodId;
  faction: Faction;
  satisfaction: readonly number[];
  unlockAt: number;
  population: readonly number[];
  ignored: readonly IgnoredDemandSource[];
}>): readonly number[] {
  if (!isDemandUnlocked(input.satisfaction, input.unlockAt, input.population)) {
    return input.satisfaction.map(() => 0);
  }
  return input.satisfaction.map((value, tier) => (
    isDemandIgnored(input.ignored, input.faction, tier, input.goodId) ? 0 : value
  ));
}
