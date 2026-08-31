import { describe, expect, test } from 'vitest';

import { BUILDING_PLACEMENTS, BUILDING_REQUIREMENTS, BUILDINGS, ISLAND_REQUIREMENTS } from './building-data';
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
  windPark: [-25, 15, 0], thermalPowerStation: [-65, 70, 0], offshoreWindPark: [-50, 30, 0],
  solarTowerGenerator: [-120, 120, 0], coalPowerStation: [-10, 60, -15],
  nuclearPowerPlant: [-100, 500, -10], marineCurrentPowerPlant: [-40, 25, 0],
  hydroelectricPowerPlant: [-140, 500, -10], geothermicPowerPlant: [-200, 750, 0],
  energyTransmitter: [-175, 0, -30],
  weatherControlStation: [-20, -2, 15], monitoringStation: [-40, -25, 40],
  ozoneMakerStation: [-120, -60, 100], riverSewageTreatmentPlant: [-200, -250, 300],
  guardian: [-500, -250, 500], wasteCompactor: [-40, -5, 50],
  deacidificationStation: [-80, -60, 90], co2Reservoir: [-160, -110, 200],
  basaltExtraction: [-5, -1, 0], basaltCrusher: [-5, -2, -4], smelter: [-5, -1, 0],
  underwaterRecyclingStation: [-60, -4, 0], toolsWorkshop: [-10, -3, -4],
  treeNursery: [-10, -2, 0], sawmill: [-5, -2, -3], limestoneQuarry: [-20, -2, -2],
  glassworks: [-60, -3, -6], concreteFactory: [-10, -4, -4], steelworks: [-20, -6, -6],
  carbonFactory: [-40, -6, -6], uraniumMine: [-50, -4, -6], fuelElementFactory: [-60, -4, -6],
  ecoCityCenter: [-10, -1, 0], tycoonCityCenter: [-10, -1, 0], techCityCenter: [-5, -1, 0],
  fireStation: [-25, -2, -2], policeStation: [-60, -15, -6], hospital: [-40, -7, -4],
  concertHall: [-5, -5, -2], casino: [-5, -5, -3], laboratory: [-40, -10, -8],
  informationCenter: [-15, -10, 0], ministryOfTruth: [-30, -7, -6],
  educationNetwork: [-30, -7, -5], financialCenter: [-50, -10, -9],
  congressCenter: [-50, -10, -8], academy: [-100, -7, -12],
  missileLaunchPad: [-500, -50, -50], leisureCenter: [-1000, -300, -40],
  corporateHq: [-1000, -300, -60], scienceForum: [-2500, -750, -50],
  depot1: [-5, -1, 0], depot2: [-10, -1, 0], depot3: [-15, -1, 0],
  harborDepot: [-20, -2, -4], portAuthority: [-40, -10, -2], clearanceTerminal: [-60, -10, -2],
  underwaterWarehouse: [-40, -3, 0], underwaterReceivingDock: [-60, -5, 0],
  repairDock: [-25, -10, -2], ecoShipyard: [-20, -10, -4], tycoonShipyard: [-10, -10, -6],
  submarineBase: [-15, -7, -3], airport: [-60, -10, -10],
} as const;

describe('BUILDINGS', () => {
  test('covers every occurrence with one canonical operating configuration', () => {
    const ids = new Set(Object.keys(BUILDINGS));

    expect(ids.size).toBe(128);
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

  test('categorizes power, eco, and material entries with sign invariants', () => {
    const byCategory = (category: string) =>
      Object.values(BUILDINGS).filter((building) => building.category === category);
    expect(byCategory('power')).toHaveLength(10);
    expect(byCategory('eco')).toHaveLength(8);
    expect(byCategory('material')).toHaveLength(14);
    expect(byCategory('civic')).toHaveLength(19);
    expect(byCategory('logistics')).toHaveLength(13);
    expect(byCategory('production')).toHaveLength(64);

    for (const [id, building] of Object.entries(BUILDINGS)) {
      // The energy transmitter moves power, so 0 is legitimate for 'power'.
      if (building.category === 'power') expect(building.operatingImpact.power, id).toBeGreaterThanOrEqual(0);
      if (building.category === 'eco') expect(building.operatingImpact.ecoBalance, id).toBeGreaterThan(0);
      // No ecobalance exists underwater.
      if (BUILDING_PLACEMENTS[id as keyof typeof BUILDING_PLACEMENTS] === 'underwater') {
        expect(building.operatingImpact.ecoBalance, id).toBe(0);
      }
    }
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

describe('ISLAND_REQUIREMENTS', () => {
  test('uses unique ids and existing local good images', () => {
    const ids = ISLAND_REQUIREMENTS.map((requirement) => requirement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const requirement of ISLAND_REQUIREMENTS) {
      expect(requirement.label, requirement.id).not.toBe('');
      expect(requirement.image, requirement.id).toMatch(/\.png$/);
    }
  });

  test('every building requirement references a defined island requirement', () => {
    const known = new Set(ISLAND_REQUIREMENTS.map((requirement) => requirement.id));
    for (const [buildingId, requirementId] of Object.entries(BUILDING_REQUIREMENTS)) {
      expect(buildingId in BUILDINGS, buildingId).toBe(true);
      expect(known.has(requirementId!), `${buildingId} -> ${requirementId}`).toBe(true);
    }
  });

  test('pins researched requirement spot checks', () => {
    expect(BUILDING_REQUIREMENTS.teaPlantation).toBe('tea');
    expect(BUILDING_REQUIREMENTS.copperMine).toBe('copperDeposit');
    expect(BUILDING_REQUIREMENTS.oilRig).toBe('oilUnderwater');
    expect(BUILDING_REQUIREMENTS.platinumMetalConverter).toBe('blackSmoker');
    expect(BUILDING_REQUIREMENTS.fishery).toBeUndefined();
    expect(BUILDING_REQUIREMENTS.electronicsRecycler).toBeUndefined();
    expect(BUILDING_REQUIREMENTS.lithiumProductionFacility).toBeUndefined();
  });
});
