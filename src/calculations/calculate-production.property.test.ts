import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import {
  calculateAvailableProduction,
  calculateProduction,
  createDefaultProductivity,
} from './calculate-production';
import { PRODUCTION_NODES } from './production-data';

const population = fc.record({
  eco: fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 4, maxLength: 4 }),
  tycoon: fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 4, maxLength: 4 }),
  tech: fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 3, maxLength: 3 }),
});

const productivity = fc.array(fc.integer({ min: 1, max: 999 }), {
  minLength: PRODUCTION_NODES.length,
  maxLength: PRODUCTION_NODES.length,
}).map((values) => Object.fromEntries(
  PRODUCTION_NODES.map((node, index) => [node.id, values[index]]),
));

function descendantsOf(rootId: string): Set<string> {
  const descendants = new Set([rootId]);
  for (const node of PRODUCTION_NODES) {
    if (node.calculation.kind === 'material' && descendants.has(node.calculation.parentId)) {
      descendants.add(node.id);
    }
  }
  return descendants;
}

const recyclableSubtrees = new Set(
  PRODUCTION_NODES
    .filter((node) => node.calculation.kind === 'primary' && node.calculation.recyclable)
    .flatMap((node) => [...descendantsOf(node.id)]),
);

test.prop({ population, productivity, recycling: fc.boolean() })(
  'returns a finite non-negative result for every production node',
  ({ population, productivity, recycling }) => {
    const result = calculateProduction({ population, productivity, recycling, wholeBuildings: false, ignoredDemands: [] });

    expect(Object.keys(result)).toEqual(PRODUCTION_NODES.map((node) => node.id));
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(Object.values(result).every((value) => value >= 0)).toBe(true);
  },
);

test.prop({ productivity, recycling: fc.boolean(), wholeBuildings: fc.boolean() })(
  'zero population produces zero throughout every supply chain',
  ({ productivity, recycling, wholeBuildings }) => {
    const result = calculateProduction({
      population: { eco: [0, 0, 0, 0], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      productivity,
      recycling,
      wholeBuildings,
      ignoredDemands: [],
    });

    expect(Object.values(result).every((value) => value === 0)).toBe(true);
  },
);

test.prop({ population, productivity, recycling: fc.boolean() })(
  'fractional production is linear while the same demand roots stay unlocked',
  ({ population, productivity, recycling }) => {
    const unlockedPopulation = {
      eco: population.eco.map((value) => value === 0 ? 0 : value + 1200),
      tycoon: population.tycoon.map((value) => value === 0 ? 0 : value + 1200),
      tech: population.tech.map((value) => value === 0 ? 0 : value + 1200),
    };
    const baseline = calculateProduction({ population: unlockedPopulation, productivity, recycling, wholeBuildings: false, ignoredDemands: [] });
    const doubledPopulation = {
      eco: unlockedPopulation.eco.map((value) => value * 2),
      tycoon: unlockedPopulation.tycoon.map((value) => value * 2),
      tech: unlockedPopulation.tech.map((value) => value * 2),
    };
    const doubled = calculateProduction({
      population: doubledPopulation,
      productivity,
      recycling,
      wholeBuildings: false,
      ignoredDemands: [],
    });

    for (const node of PRODUCTION_NODES) {
      expect(doubled[node.id]).toBeCloseTo(baseline[node.id] * 2, 8);
    }
  },
);

test.prop({ population, productivity, recycling: fc.boolean() })(
  'whole-building mode rounds every stage upward',
  ({ population, productivity, recycling }) => {
    const fractional = calculateProduction({ population, productivity, recycling, wholeBuildings: false, ignoredDemands: [] });
    const whole = calculateProduction({ population, productivity, recycling, wholeBuildings: true, ignoredDemands: [] });

    for (const node of PRODUCTION_NODES) {
      expect(Number.isSafeInteger(whole[node.id])).toBe(true);
      expect(whole[node.id]).toBeGreaterThanOrEqual(fractional[node.id]);
    }
  },
);

test.prop({ population, productivity })(
  'recycling changes only its three product subtrees and never increases them',
  ({ population, productivity }) => {
    const baseline = calculateProduction({ population, productivity, recycling: false, wholeBuildings: false, ignoredDemands: [] });
    const recycled = calculateProduction({ population, productivity, recycling: true, wholeBuildings: false, ignoredDemands: [] });

    for (const node of PRODUCTION_NODES) {
      if (recyclableSubtrees.has(node.id)) {
        expect(recycled[node.id]).toBeLessThanOrEqual(baseline[node.id]);
      } else {
        expect(recycled[node.id]).toBe(baseline[node.id]);
      }
    }
  },
);

test.prop({
  population,
  nodeIndex: fc.integer({ min: 0, max: PRODUCTION_NODES.length - 1 }),
  increase: fc.integer({ min: 1, max: 500 }),
})(
  'increasing one productivity affects only that node and its descendants without increasing demand',
  ({ population, nodeIndex, increase }) => {
    const node = PRODUCTION_NODES[nodeIndex];
    const baselineProductivity = createDefaultProductivity();
    const improvedProductivity = { ...baselineProductivity, [node.id]: 100 + increase };
    const baseline = calculateProduction({
      population,
      productivity: baselineProductivity,
      recycling: false,
      wholeBuildings: false,
      ignoredDemands: [],
    });
    const improved = calculateProduction({
      population,
      productivity: improvedProductivity,
      recycling: false,
      wholeBuildings: false,
      ignoredDemands: [],
    });
    const affected = descendantsOf(node.id);

    for (const candidate of PRODUCTION_NODES) {
      if (affected.has(candidate.id)) {
        expect(improved[candidate.id]).toBeLessThanOrEqual(baseline[candidate.id]);
      } else {
        expect(improved[candidate.id]).toBe(baseline[candidate.id]);
      }
    }
  },
);

test.prop({
  population,
  productivity,
  nodeIndex: fc.integer({ min: 0, max: PRODUCTION_NODES.length - 1 }),
})('an invalid productivity suppresses exactly that node and its descendants', ({
  population,
  productivity,
  nodeIndex,
}) => {
  const invalidNode = PRODUCTION_NODES[nodeIndex];
  const expectedMissing = descendantsOf(invalidNode.id);
  const baseline = calculateProduction({
    population,
    productivity,
    recycling: false,
    wholeBuildings: false,
    ignoredDemands: [],
  });
  const partial = calculateAvailableProduction({
    population,
    productivity: { ...productivity, [invalidNode.id]: null },
    recycling: false,
    wholeBuildings: false,
    ignoredDemands: [],
  });

  for (const node of PRODUCTION_NODES) {
    if (expectedMissing.has(node.id)) {
      expect(partial[node.id]).toBeNull();
    } else {
      expect(partial[node.id]).toBe(baseline[node.id]);
    }
  }
});
