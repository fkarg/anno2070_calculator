import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

import { createIsland } from '../island';
import { calculatePopulation } from './population';
import { calculateProduction, createDefaultProductivity } from './calculate-production';
import { PRODUCTION_NODES } from './production-data';
import { producedGood } from './goods';
import { calculateSupportedPopulation } from './supported-population';

describe('supported population properties', () => {
  test('a plan-mirroring island supports exactly its current population', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 500 }), (houses) => {
      const population = {
        eco: calculatePopulation({ faction: 'eco', houses, maxTier: 4, livingSpace: false, senate: false }),
        tycoon: calculatePopulation({ faction: 'tycoon', houses, maxTier: 4, livingSpace: false, senate: false }),
        tech: calculatePopulation({ faction: 'tech', houses, maxTier: 3, livingSpace: false, senate: false }),
      };
      const required = calculateProduction({
        population, productivity: createDefaultProductivity(), recycling: false, wholeBuildings: false,
        ignoredDemands: [],
      });
      const island = createIsland('Mirror');
      for (const faction of ['eco', 'tycoon', 'tech'] as const) {
        island.factions[faction].houses = { raw: String(houses), value: houses };
      }
      const owned: Record<string, number> = {};
      for (const node of PRODUCTION_NODES) {
        if (producedGood(node.buildingId) !== node.buildingId) continue;
        owned[node.buildingId] = (owned[node.buildingId] ?? 0) + required[node.id];
      }
      island.owned = Object.fromEntries(
        Object.entries(owned).map(([id, value]) => [id, { raw: String(value), value }]),
      );

      const result = calculateSupportedPopulation([island], []);
      expect(result.scale).not.toBeNull();
      expect(result.scale!).toBeCloseTo(1, 6);
      for (const constraint of result.constraints) {
        // Every populated chain is exactly balanced; nothing is over-throttled.
        expect(constraint.scale).toBeGreaterThanOrEqual(1 - 1e-6);
      }
      for (const faction of ['eco', 'tycoon', 'tech'] as const) {
        const current = population[faction];
        result.supported[faction]!.forEach((value, tier) => {
          expect(Math.abs(value - current[tier])).toBeLessThanOrEqual(1);
        });
      }
    }), { numRuns: 25 });
  });

  test('adding a producer of the limiting good never lowers the supported scale', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 60 }), fc.integer({ min: 1, max: 60 }),
      (fisheries, teaPlantations) => {
        const island = createIsland('A');
        island.factions.eco.houses = { raw: '100', value: 100 };
        island.factions.eco.maxTier = 1;
        island.owned = {
          fishery: { raw: String(fisheries), value: fisheries },
          teaPlantation: { raw: String(teaPlantations), value: teaPlantations },
        };
        const before = calculateSupportedPopulation([island], []);
        expect(before.scaleAfterNextBuilding!).toBeGreaterThanOrEqual(before.scale!);

        const limiting = before.limitingGood!;
        const grown = {
          ...island,
          owned: {
            ...island.owned,
            [limiting]: { raw: '0', value: (island.owned[limiting]?.value ?? 0) + 1 },
          },
        };
        grown.owned[limiting] = {
          raw: String(grown.owned[limiting].value),
          value: grown.owned[limiting].value,
        };
        const after = calculateSupportedPopulation([grown], []);
        expect(after.scale!).toBeGreaterThanOrEqual(before.scale! - 1e-9);
        expect(after.scale!).toBeCloseTo(before.scaleAfterNextBuilding!, 9);
      },
    ));
  });
});
