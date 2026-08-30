import { describe, expect, test } from 'vitest';

import { CONSUMPTION, GOODS, producedGood } from './goods';
import { PRODUCTION_NODES } from './production-data';
import { BUILDINGS, type BuildingId } from './building-data';

describe('GOODS derivation', () => {
  test('every production building produces exactly one good; other categories none', () => {
    const producerIds = new Set(
      [...GOODS.values()].flatMap((good) => good.producers.map((producer) => producer.buildingId)),
    );
    for (const buildingId of Object.keys(BUILDINGS) as BuildingId[]) {
      if (BUILDINGS[buildingId].category === 'production') {
        expect(producedGood(buildingId), buildingId).not.toBeNull();
        expect(producerIds.has(buildingId), buildingId).toBe(true);
      } else {
        // Power/eco/material buildings are impact-only: invisible to the
        // goods graph, counted only in operating impacts (and fuel).
        expect(producedGood(buildingId), buildingId).toBeNull();
        expect(producerIds.has(buildingId), buildingId).toBe(false);
      }
    }
  });

  test('alternative producers share the good at derived rates', () => {
    const microchips = GOODS.get('chipFactory')!;
    expect(microchips.producers).toContainEqual({ buildingId: 'chipFactory', rate: 1 });
    expect(microchips.producers).toContainEqual({ buildingId: 'electronicsRecycler', rate: 1.5 });
    const coal = GOODS.get('coalMine')!;
    expect(coal.producers).toContainEqual({ buildingId: 'rotaryExcavator', rate: 0.5 });
    const ironOre = GOODS.get('ironOreMine')!;
    expect(ironOre.producers).toContainEqual({ buildingId: 'ironMetalConverter', rate: 1.5 });
    const nuggets = GOODS.get('goldRefinery')!;
    expect(nuggets.producers).toContainEqual({ buildingId: 'goldMetalConverter', rate: 1 / 0.89 });
    const crudeOil = GOODS.get('oilRig')!;
    expect(crudeOil.producers).toContainEqual({ buildingId: 'oilDriller', rate: 1 / 3 });
  });

  test('fish aggregates final demand from all three factions', () => {
    const fish = GOODS.get('fishery')!;
    expect(fish.finalDemands).toHaveLength(3);
    expect(fish.finalDemands.map((demand) => demand.faction).sort()).toEqual(['eco', 'tech', 'tycoon']);
  });

  test('consumption edges dedupe consistently across chains', () => {
    const chipInputs = CONSUMPTION.get('chipFactory')!;
    expect(chipInputs).toContainEqual({ goodId: 'copperMine', rate: 0.5 });
    expect(chipInputs).toContainEqual({ goodId: 'sandExtractor', rate: 1 / 3 });
    // The recycler substitutes at the same microchips edge, so the electronics
    // factory consumes microchips at the canonical multiplier exactly once.
    expect(CONSUMPTION.get('electronicsFactory')!).toContainEqual({ goodId: 'chipFactory', rate: 1 });
    expect(CONSUMPTION.get('electronicsRecycler') ?? []).toEqual([]);
  });

  test('every material node is represented as a consumption edge', () => {
    for (const node of PRODUCTION_NODES) {
      if (node.calculation.kind !== 'material') continue;
      const parentBuilding = PRODUCTION_NODES.find((candidate) => candidate.id
        === (node.calculation as { parentId: string }).parentId)!.buildingId;
      const inputs = CONSUMPTION.get(parentBuilding) ?? [];
      expect(inputs.some((input) => input.goodId === producedGood(node.buildingId)), node.id).toBe(true);
    }
  });
});
