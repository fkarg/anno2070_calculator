import { describe, expect, test } from 'vitest';

import { BUILDINGS } from './building-data';
import { ALTERNATIVE_GROUPS, PRODUCTION_NODES } from './production-data';

describe('BUILDINGS', () => {
  test('covers every occurrence with one canonical operating configuration', () => {
    const ids = new Set(Object.keys(BUILDINGS));

    expect(ids.size).toBe(64);
    expect(PRODUCTION_NODES).toHaveLength(88);
    for (const node of PRODUCTION_NODES) {
      expect(ids.has(node.buildingId), node.id).toBe(true);
    }
  });

  test('contains complete finite sourced operating data', () => {
    for (const [id, building] of Object.entries(BUILDINGS)) {
      expect(building.label, id).not.toBe('');
      expect(building.image, id).toMatch(/\.png$/);
      expect(building.source, id).toMatch(/^https:\/\/anno2070\.fandom\.com\/wiki\//);
      expect(Object.values(building.operatingImpact).every(Number.isFinite), id).toBe(true);
    }
  });

  test('pins aliases, shared buildings, and converter modes', () => {
    expect(BUILDINGS.farmhouse.source).toMatch(/\/Farmhouse$/);
    expect(BUILDINGS.fishery.operatingImpact).toEqual({
      maintenanceCredits: -5,
      power: -1,
      ecoBalance: 0,
    });
    expect(BUILDINGS.goldMetalConverter.operatingImpact).toEqual({
      maintenanceCredits: -150,
      power: -25,
      ecoBalance: 0,
    });
    expect(BUILDINGS.ironMetalConverter.operatingImpact).toEqual({
      maintenanceCredits: -100,
      power: -25,
      ecoBalance: 0,
    });
    expect(BUILDINGS.platinumMetalConverter.operatingImpact).toEqual({
      maintenanceCredits: -80,
      power: -30,
      ecoBalance: 0,
    });
    expect(PRODUCTION_NODES.filter(({ buildingId }) => buildingId === 'chipFactory')).toHaveLength(3);
  });

  test('declares the eight independent alternative groups', () => {
    expect(ALTERNATIVE_GROUPS.map(({ id }) => id)).toEqual([
      'ecoCommunicatorsChips',
      'ecoServiceBotsChips',
      'tycoonPlasticsOil',
      'tycoonJewelryGold',
      'tycoonJewelryCoal',
      'techNeuroimplantsChips',
      'techLaboratoryIron',
      'techLaboratoryCoal',
    ]);
  });
});
