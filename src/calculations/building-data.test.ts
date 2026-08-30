import { describe, expect, test } from 'vitest';

import { BUILDINGS } from './building-data';
import { ALTERNATIVE_GROUPS, PRODUCTION_NODES } from './production-data';

const expectedOperatingImpacts = {
  fishery: [-5, -1, 0], teaPlantation: [-10, -1, 0], healthFoodFactory: [-15, -2, -3],
  farmhouse: [-5, -1, -1], riceFarm: [-10, -1, -1], electronicsFactory: [-20, -4, -4],
  chipFactory: [-10, -2, -4], copperMine: [-15, -2, -2], sandExtractor: [-20, -2, -2],
  electronicsRecycler: [-160, -35, 0], healthDrinkFactory: [-30, -2, -4],
  fruitPlantation: [-15, -1, -1], dairyFarm: [-20, -2, -4], pastaProduction: [-20, -2, -4],
  flourMill: [-25, -4, -5], grainFarm: [-15, -2, -2], projectorPlant: [-50, -25, -12],
  diamondHarvestingStation: [-60, -10, 0], rareEarthBorer: [-60, -7, 0],
  manganeseExcavationRobot: [-40, -8, 0], robotFactory: [-90, -25, -8],
  biopolymerFactory: [-70, -15, -8], aquafarm: [-40, -3, 0], cornFarm: [-50, -4, -2],
  distillery: [-5, -1, -2], foodSupplyFactory: [-15, -4, -3], meatFactory: [-5, -2, -3],
  flavorLab: [-10, -2, -2], plasticsFactory: [-15, -2, -4], oilRefinery: [-15, -2, -4],
  oilRig: [-50, -20, 0], oilDriller: [-15, -4, -3], gourmetFactory: [-30, -6, -4],
  lobsterFarm: [-30, -3, -3], truffleFarm: [-15, -3, -2], champagneCellar: [-30, -6, -4],
  vineyard: [-15, -3, -2], sugarBeetPlantation: [-30, -3, -2],
  jeweleryManufactory: [-40, -8, -5], goldSmeltery: [-30, -4, -5],
  goldRefinery: [-30, -4, -6], goldMetalConverter: [-150, -25, 0], coalMine: [-15, -2, -2],
  rotaryExcavator: [-10, 0, -5], healthcareOffice: [-80, -15, -8],
  chemicalPlant: [-25, -6, -8], fatFactory: [-10, -3, -4],
  functionalFoodFactory: [-40, -6, 0], energyDrinkFactory: [-60, -6, -4],
  coffeePlantation: [-40, -3, -3], immunityDrugManufacturers: [-60, -20, -6],
  genFarmingLaboratory: [-30, -3, 0], coralBreeder: [-40, -4, 0],
  cyberneticFactory: [-70, -20, 0], spongeFarm: [-45, -12, 0],
  laboratoryOutfitter: [-80, -25, 0], platinumMetalConverter: [-80, -30, 0],
  ironSmeltery: [-10, -2, -3], ironOreMine: [-10, -2, -2],
  ironMetalConverter: [-100, -25, 0], bionicsFactory: [-90, -40, -15],
  hydraulicPlant: [-50, -20, -10], oxidationFacility: [-40, -15, 0],
  lithiumProductionFacility: [-30, -10, 0],
} as const;

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

  test('pins every researched operating impact', () => {
    expect(Object.fromEntries(Object.entries(BUILDINGS).map(([id, definition]) => [id, [
      definition.operatingImpact.maintenanceCredits,
      definition.operatingImpact.power,
      definition.operatingImpact.ecoBalance,
    ]]))).toEqual(expectedOperatingImpacts);
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
