export function calculatePrimary(
  satisfaction: readonly number[],
  population: readonly number[],
  productivity: number,
  recycling: boolean,
  wholeBuildings: boolean,
): number {
  const productivityMultiplier = productivity / 100;
  const result = satisfaction.reduce((total, satisfiedByOneBuilding, tier) => {
    if (satisfiedByOneBuilding === 0) return total;
    const recyclingMultiplier = recycling && tier > 0 ? 0.85 : 1;
    return total + population[tier] * recyclingMultiplier / satisfiedByOneBuilding / productivityMultiplier;
  }, 0);

  return wholeBuildings ? Math.ceil(result) : result;
}

export function calculateMaterial(
  parent: number,
  multiplier: number,
  productivity: number,
  wholeBuildings: boolean,
): number {
  const result = parent * multiplier / (productivity / 100);
  return wholeBuildings ? Math.ceil(result) : result;
}

export function formatRequirement(value: number): string {
  return String(Math.ceil(value * 100) / 100);
}
