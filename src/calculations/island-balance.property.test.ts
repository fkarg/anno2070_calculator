import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

import { calculatePopulation } from './population';
import { calculateProduction, createDefaultProductivity } from './calculate-production';
import { PRODUCTION_NODES } from './production-data';
import { producedGood } from './goods';
import { createIsland } from '../island';
import { BALANCE_EPSILON, calculateIslandBalance, transferNeeds } from './island-balance';

describe('island balance properties', () => {
  test('an island owning exactly the plan requirement balances to ~zero', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 500 }), (houses) => {
      const population = {
        eco: calculatePopulation({ faction: 'eco', houses, maxTier: 4, livingSpace: false, senate: false }),
        tycoon: calculatePopulation({ faction: 'tycoon', houses, maxTier: 4, livingSpace: false, senate: false }),
        tech: calculatePopulation({ faction: 'tech', houses, maxTier: 3, livingSpace: false, senate: false }),
      };
      const required = calculateProduction({
        population, productivity: createDefaultProductivity(), recycling: false, wholeBuildings: false,
      });
      const island = createIsland('Mirror');
      for (const faction of ['eco', 'tycoon', 'tech'] as const) {
        island.factions[faction].houses = { raw: String(houses), value: houses };
      }
      // Sum plan node requirements per building; skip non-canonical alternatives,
      // whose demand the canonical producer already covers at full requirement.
      const owned: Record<string, number> = {};
      for (const node of PRODUCTION_NODES) {
        if (producedGood(node.buildingId) !== node.buildingId) continue;
        owned[node.buildingId] = (owned[node.buildingId] ?? 0) + required[node.id];
      }
      island.owned = Object.fromEntries(
        Object.entries(owned).map(([id, value]) => [id, { raw: String(value), value }]),
      );
      for (const [goodId, balance] of Object.entries(calculateIslandBalance(island, []))) {
        expect(Math.abs(balance.balance ?? 0), goodId).toBeLessThan(1e-6);
      }
    }), { numRuns: 25 });
  });

  test('capacity is monotone in owned count and linear in productivity', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 400 }),
      (count, productivity) => {
        const island = createIsland('A');
        island.owned = { fishery: { raw: String(count), value: count } };
        island.productivity = { fishery: { raw: String(productivity), value: productivity } };
        const capacity = calculateIslandBalance(island, []).fishery?.capacity ?? 0;
        expect(capacity).toBeCloseTo(count * productivity / 100, 9);
      },
    ));
  });

  test('transfer needs are consistent with island balances', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({ fisheries: fc.integer({ min: 0, max: 5 }), houses: fc.integer({ min: 0, max: 300 }) }),
        { maxLength: 4 },
      ),
      (configs) => {
        const islands = configs.map((config, index) => {
          const island = createIsland(`I${index}`);
          island.owned = { fishery: { raw: String(config.fisheries), value: config.fisheries } };
          island.factions.eco.houses = { raw: String(config.houses), value: config.houses };
          return island;
        });
        for (const need of transferNeeds(islands, [])) {
          expect(need.deficits.length).toBeGreaterThan(0);
          for (const entry of [...need.surpluses, ...need.deficits]) {
            expect(entry.amount).toBeGreaterThan(BALANCE_EPSILON);
          }
        }
      },
    ));
  });
});
