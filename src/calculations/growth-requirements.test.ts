import { describe, expect, test } from 'vitest';

import { calculateGrowthRequirements } from './growth-requirements';

const emptyPopulation = () => ({
  eco: [0, 0, 0, 0],
  tycoon: [0, 0, 0, 0],
  tech: [0, 0, 0],
});

describe('Growth requirement provenance', () => {
  test('attributes algae to the Tech functional-food chain', () => {
    const population = emptyPopulation();
    population.tech[1] = 444;

    const algae = calculateGrowthRequirements(population, false).get('aquafarm')!;

    expect(algae.required).toBeCloseTo(1);
    expect(algae.chains).toEqual([expect.objectContaining({
      faction: 'tech',
      rootNodeId: 'techFunctionalFood',
      pathNodeIds: ['techFunctionalFood', 'techAlgaeFunctionalFood'],
      required: 1,
    })]);
  });

  test('keeps shared-good contributions separate and sums them once', () => {
    const population = emptyPopulation();
    population.eco[0] = 250;
    population.tycoon[0] = 250;
    population.tech[0] = 800;

    const fish = calculateGrowthRequirements(population, false).get('fishery')!;

    expect(fish.required).toBeCloseTo(3);
    expect(fish.chains.map((chain) => chain.faction)).toEqual(['eco', 'tycoon', 'tech']);
    expect(fish.chains.reduce((sum, chain) => sum + chain.required, 0))
      .toBeCloseTo(fish.required);
  });

  test('does not count alternative producers as additional demand causes', () => {
    const population = emptyPopulation();
    population.tech[1] = 667;

    const chips = calculateGrowthRequirements(population, false).get('chipFactory')!;

    expect(chips.chains).toHaveLength(1);
    expect(chips.chains[0].pathNodeIds).toEqual([
      'techNeuroimplants', 'techMicrochips',
    ]);
  });
});
