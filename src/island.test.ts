import { describe, expect, test } from 'vitest';

import { createIsland, islandPopulation, islandProductivity, ownedCount } from './island';

describe('island model', () => {
  test('creates a settled island with empty sparse records', () => {
    const island = createIsland('Walbruck');
    expect(island.name).toBe('Walbruck');
    expect(island.settled).toBe(true);
    expect(island.owned).toEqual({});
    expect(island.productivity).toEqual({});
    expect(island.fertilities).toEqual({});
    expect(island.id).not.toBe(createIsland('Walbruck').id);
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
