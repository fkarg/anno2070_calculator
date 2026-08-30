import { describe, expect, test } from 'vitest';

import { OPEN_FERTILITY_SLOT } from './calculations/building-data';
import { canBuildOn, createIsland, islandPopulation, islandProductivity, ownedCount } from './island';

describe('island model', () => {
  test('creates a settled land island with empty sparse records', () => {
    const island = createIsland('Walbruck');
    expect(island.name).toBe('Walbruck');
    expect(island.settled).toBe(true);
    expect(island.underwater).toBe(false);
    expect(island.owned).toEqual({});
    expect(island.productivity).toEqual({});
    expect(island.fertilities).toEqual([]);
    expect(island.id).not.toBe(createIsland('Walbruck').id);
  });

  test('placement gates buildings by island type', () => {
    const land = createIsland('Land');
    expect(canBuildOn(land, 'fishery')).toBe(true);        // coastal on land islands
    expect(canBuildOn(land, 'chipFactory')).toBe(true);
    expect(canBuildOn(land, 'electronicsRecycler')).toBe(false);

    const underwater = { ...createIsland('Deep'), underwater: true };
    expect(canBuildOn(underwater, 'electronicsRecycler')).toBe(true);
    expect(canBuildOn(underwater, 'fishery')).toBe(false);
    expect(canBuildOn(underwater, 'chipFactory')).toBe(false);
  });

  test('fertility requirements gate buildings until present or seedable via the open slot', () => {
    const island = createIsland('Land');
    expect(canBuildOn(island, 'teaPlantation')).toBe(false);
    expect(canBuildOn({ ...island, fertilities: ['tea'] }, 'teaPlantation')).toBe(true);
    // An open slot satisfies any land fertility, but never a deposit.
    expect(canBuildOn({ ...island, fertilities: [OPEN_FERTILITY_SLOT] }, 'teaPlantation')).toBe(true);
    expect(canBuildOn({ ...island, fertilities: [OPEN_FERTILITY_SLOT] }, 'copperMine')).toBe(false);
    expect(canBuildOn({ ...island, fertilities: ['copperDeposit'] }, 'copperMine')).toBe(true);
    // Underwater fertilities are not seedable.
    const underwater = { ...createIsland('Deep'), underwater: true };
    expect(canBuildOn(underwater, 'aquafarm')).toBe(false);
    expect(canBuildOn({ ...underwater, fertilities: ['algae'] }, 'aquafarm')).toBe(true);
  });

  test('missing owned and productivity entries default to 0 and 100', () => {
    const island = createIsland('A');
    expect(ownedCount(island, 'chipFactory')).toBe(0);
    expect(islandProductivity(island, 'chipFactory')).toBe(100);
    const edited = {
      ...island,
      owned: { chipFactory: { raw: '3', value: 3 } },
      productivity: { chipFactory: { raw: '50', value: 50 } },
    };
    expect(ownedCount(edited, 'chipFactory')).toBe(3);
    expect(islandProductivity(edited, 'chipFactory')).toBe(50);
  });

  test('invalid entries resolve to null', () => {
    const island = {
      ...createIsland('A'),
      owned: { chipFactory: { raw: 'x', value: null } },
      productivity: { fishery: { raw: '-1', value: null } },
    };
    expect(ownedCount(island, 'chipFactory')).toBeNull();
    expect(islandProductivity(island, 'fishery')).toBeNull();
  });

  test('island population uses the shared ascension model per faction', () => {
    const island = createIsland('A');
    const withHouses = {
      ...island,
      factions: {
        ...island.factions,
        eco: { ...island.factions.eco, houses: { raw: '10', value: 10 } },
      },
    };
    const population = islandPopulation(withHouses, 'eco');
    expect(population).not.toBeNull();
    expect(population!.reduce((total, tier) => total + tier, 0)).toBeGreaterThan(0);
  });
});
