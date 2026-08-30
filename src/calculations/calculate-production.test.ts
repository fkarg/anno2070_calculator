import { describe, expect, test } from 'vitest';

import {
  calculateAvailableProduction,
  calculateProduction,
  createDefaultProductivity,
} from './calculate-production';
import { PRODUCTION_NODES, type ProductionNode } from './production-data';

const expectedIds = {
  eco: [
    'ecoFish', 'ecoTea', 'ecoHealthFood', 'ecoVegetablesHealthFood', 'ecoRice',
    'ecoCommunicators', 'ecoMicrochipsCommunicators', 'ecoCopperCommunicators',
    'ecoSandCommunicators', 'ecoElectronicsRecyclerCommunicators', 'ecoBioDrinks',
    'ecoFruits', 'ecoMilk', 'ecoPastaDishes', 'ecoVegetablesPasta', 'ecoFlour',
    'ecoDurumWheat', 'eco3DProjectors', 'ecoDiamonds', 'ecoRareEarthElements',
    'ecoManganeseNodules', 'ecoServiceBots', 'ecoMicrochipsServiceBots',
    'ecoCopperServiceBots', 'ecoSandServiceBots', 'ecoElectronicsRecyclerServiceBots',
    'ecoBiopolymers', 'ecoAlgae', 'ecoCorn',
  ],
  tycoon: [
    'tycoonFish', 'tycoonLiquor', 'tycoonConvenienceFood', 'tycoonMeat',
    'tycoonSuperFlavor', 'tycoonPlastics', 'tycoonOil', 'tycoonCrudeOil',
    'tycoonOilDriller', 'tycoonLuxuryMeals', 'tycoonLobsters', 'tycoonTruffles',
    'tycoonChampagne', 'tycoonGrapes', 'tycoonSugar', 'tycoonJewelry',
    'tycoonDiamonds', 'tycoonGold', 'tycoonGoldNuggets', 'tycoonGoldConverter',
    'tycoonCoal', 'tycoonRotaryExcavator', 'tycoonPharmaceuticals',
    'tycoonRareEarthElements', 'tycoonManganeseNodules', 'tycoonSecretIngredients',
    'tycoonOmegaAcids', 'tycoonAlgae',
  ],
  tech: [
    'techFish', 'techFunctionalFood', 'techAlgaeFunctionalFood',
    'techFunctionalDrinks', 'techSugar', 'techCaffeine', 'techImmunityDrugs',
    'techEnzymes', 'techCoral', 'techNeuroimplants', 'techSponges',
    'techMicrochips', 'techCopper', 'techSand', 'techElectronicsRecycler',
    'techLaboratoryInstruments', 'techPlatinumLaboratory', 'techIron',
    'techIronOre', 'techIronConverter', 'techCoal', 'techRotaryExcavator',
    'techBionicSuits', 'techBiopolymers', 'techAlgaeBiopolymers', 'techCorn',
    'techExoskeletons', 'techPlatinumExoskeletons', 'techElectrolyteCells',
    'techLithium', 'techOmegaAcids',
  ],
} as const;

const p = (satisfaction: readonly number[], recyclable = false) => ({
  kind: 'primary' as const,
  satisfaction,
  ...(recyclable ? { recyclable: true } : {}),
});
const m = (parentId: string, multiplier: number) => ({
  kind: 'material' as const,
  parentId,
  multiplier,
});

const expectedCalculations: Record<string, ProductionNode['calculation']> = {
  ecoFish: p([250, 364, 571, 800]),
  ecoTea: p([375, 375, 500, 750]),
  ecoHealthFood: p([0, 667, 857, 1000]),
  ecoVegetablesHealthFood: m('ecoHealthFood', 2),
  ecoRice: m('ecoHealthFood', 1),
  ecoCommunicators: p([0, 571, 800, 1250], true),
  ecoMicrochipsCommunicators: m('ecoCommunicators', 1),
  ecoCopperCommunicators: m('ecoMicrochipsCommunicators', 0.5),
  ecoSandCommunicators: m('ecoMicrochipsCommunicators', 1 / 3),
  ecoElectronicsRecyclerCommunicators: m('ecoCommunicators', 2 / 3),
  ecoBioDrinks: p([0, 0, 833, 1136]),
  ecoFruits: m('ecoBioDrinks', 2),
  ecoMilk: m('ecoBioDrinks', 1),
  ecoPastaDishes: p([0, 0, 667, 909]),
  ecoVegetablesPasta: m('ecoPastaDishes', 1),
  ecoFlour: m('ecoPastaDishes', 0.5),
  ecoDurumWheat: m('ecoFlour', 3),
  eco3DProjectors: p([0, 0, 0, 750], true),
  ecoDiamonds: m('eco3DProjectors', 50 / 89),
  ecoRareEarthElements: m('eco3DProjectors', 100 / 89),
  ecoManganeseNodules: m('ecoRareEarthElements', 0.5),
  ecoServiceBots: p([0, 0, 0, 666 + 2 / 3], true),
  ecoMicrochipsServiceBots: m('ecoServiceBots', 0.5),
  ecoCopperServiceBots: m('ecoMicrochipsServiceBots', 0.5),
  ecoSandServiceBots: m('ecoMicrochipsServiceBots', 1 / 3),
  ecoElectronicsRecyclerServiceBots: m('ecoServiceBots', 1 / 3),
  ecoBiopolymers: m('ecoServiceBots', 1),
  ecoAlgae: m('ecoBiopolymers', 1),
  ecoCorn: m('ecoBiopolymers', 2),
  tycoonFish: p([250, 364, 571, 800]),
  tycoonLiquor: p([300, 333, 300, 750]),
  tycoonConvenienceFood: p([0, 577, 714, 857]),
  tycoonMeat: m('tycoonConvenienceFood', 2),
  tycoonSuperFlavor: m('tycoonConvenienceFood', 1),
  tycoonPlastics: p([0, 667, 1000, 1667]),
  tycoonOil: m('tycoonPlastics', 1),
  tycoonCrudeOil: m('tycoonOil', 1),
  tycoonOilDriller: m('tycoonOil', 3),
  tycoonLuxuryMeals: p([0, 0, 833, 1111]),
  tycoonLobsters: m('tycoonLuxuryMeals', 0.5),
  tycoonTruffles: m('tycoonLuxuryMeals', 2),
  tycoonChampagne: p([0, 0, 1042, 1389]),
  tycoonGrapes: m('tycoonChampagne', 2),
  tycoonSugar: m('tycoonChampagne', 1),
  tycoonJewelry: p([0, 0, 0, 665]),
  tycoonDiamonds: m('tycoonJewelry', 1),
  tycoonGold: m('tycoonJewelry', 1),
  tycoonGoldNuggets: m('tycoonGold', 1),
  tycoonGoldConverter: m('tycoonGold', 0.89),
  tycoonCoal: m('tycoonGold', 0.5),
  tycoonRotaryExcavator: m('tycoonGold', 1),
  tycoonPharmaceuticals: p([0, 0, 0, 571]),
  tycoonRareEarthElements: m('tycoonPharmaceuticals', 1.5),
  tycoonManganeseNodules: m('tycoonRareEarthElements', 0.5),
  tycoonSecretIngredients: m('tycoonPharmaceuticals', 1),
  tycoonOmegaAcids: m('tycoonSecretIngredients', 3),
  tycoonAlgae: m('tycoonSecretIngredients', 1),
  techFish: p([800, 800, 1600]),
  techFunctionalFood: p([299, 444, 1250]),
  techAlgaeFunctionalFood: m('techFunctionalFood', 1),
  techFunctionalDrinks: p([301, 735, 1250]),
  techSugar: m('techFunctionalDrinks', 1),
  techCaffeine: m('techFunctionalDrinks', 1),
  techImmunityDrugs: p([0, 500, 667]),
  techEnzymes: m('techImmunityDrugs', 1),
  techCoral: m('techImmunityDrugs', 0.5),
  techNeuroimplants: p([0, 667, 667]),
  techSponges: m('techNeuroimplants', 1),
  techMicrochips: m('techNeuroimplants', 0.5),
  techCopper: m('techMicrochips', 0.5),
  techSand: m('techMicrochips', 1 / 3),
  techElectronicsRecycler: m('techNeuroimplants', 1 / 3),
  techLaboratoryInstruments: p([0, 0, 444]),
  techPlatinumLaboratory: m('techLaboratoryInstruments', 1),
  techIron: m('techLaboratoryInstruments', 1),
  techIronOre: m('techIron', 1),
  techIronConverter: m('techIron', 2 / 3),
  techCoal: m('techIron', 0.5),
  techRotaryExcavator: m('techIron', 1),
  techBionicSuits: p([0, 0, 1481]),
  techBiopolymers: m('techBionicSuits', 1),
  techAlgaeBiopolymers: m('techBiopolymers', 1),
  techCorn: m('techBiopolymers', 2),
  techExoskeletons: m('techBionicSuits', 1),
  techPlatinumExoskeletons: m('techExoskeletons', 1),
  techElectrolyteCells: m('techExoskeletons', 1),
  techLithium: m('techElectrolyteCells', 2),
  techOmegaAcids: m('techElectrolyteCells', 2),
};

describe('PRODUCTION_NODES', () => {
  test.each(['eco', 'tycoon', 'tech'] as const)('contains every archived %s productivity field in calculation order', (faction) => {
    expect(PRODUCTION_NODES.filter((node) => node.faction === faction).map((node) => node.id))
      .toEqual(expectedIds[faction]);
  });

  test('contains the exact archived calculation for every node', () => {
    expect(Object.fromEntries(PRODUCTION_NODES.map((node) => [node.id, node.calculation])))
      .toEqual(expectedCalculations);
  });

  test('uses unique identifiers and parent-before-child ordering', () => {
    const positions = new Map(PRODUCTION_NODES.map((node, index) => [node.id, index]));

    expect(positions.size).toBe(88);
    for (const [index, node] of PRODUCTION_NODES.entries()) {
      if (node.calculation.kind === 'material') {
        expect(positions.get(node.calculation.parentId)).toBeLessThan(index);
      }
    }
  });

  test('contains no presentation-only depth or alternate flags', () => {
    expect(PRODUCTION_NODES.every((node) => !('depth' in node) && !('alternate' in node))).toBe(true);
  });
});

describe('calculateProduction', () => {
  test('returns every production result at default productivity', () => {
    const result = calculateProduction({
      population: {
        eco: [1000, 2000, 3000, 4000],
        tycoon: [1100, 2100, 3100, 4100],
        tech: [1200, 2200, 3200],
      },
      productivity: createDefaultProductivity(),
      recycling: false,
      wholeBuildings: false,
    });

    expect(Object.keys(result)).toEqual(PRODUCTION_NODES.map((node) => node.id));
    expect(result.ecoHealthFood).toBeCloseTo(2000 / 667 + 3000 / 857 + 4000 / 1000);
    expect(result.ecoVegetablesHealthFood).toBeCloseTo(result.ecoHealthFood * 2);
    expect(result.tycoonOilDriller).toBeCloseTo(result.tycoonPlastics * 3);
    expect(result.techLithium).toBeCloseTo(result.techElectrolyteCells * 2);
  });

  test('rounds every parent before calculating a child in whole-building mode', () => {
    const result = calculateProduction({
      population: { eco: [0, 0, 0, 667], tycoon: [0, 0, 0, 0], tech: [0, 0, 0] },
      productivity: createDefaultProductivity(),
      recycling: false,
      wholeBuildings: true,
    });

    expect(result.ecoServiceBots).toBe(2);
    expect(result.ecoMicrochipsServiceBots).toBe(1);
    expect(result.ecoSandServiceBots).toBe(1);
  });
});

describe('calculateAvailableProduction', () => {
  test('suppresses only an invalid node and its descendants', () => {
    const productivity: Record<string, number | null> = createDefaultProductivity();
    productivity.ecoHealthFood = null;
    const result = calculateAvailableProduction({
      population: {
        eco: [1000, 2000, 3000, 4000],
        tycoon: [1100, 2100, 3100, 4100],
        tech: [1200, 2200, 3200],
      },
      productivity,
      recycling: false,
      wholeBuildings: false,
    });

    expect(result.ecoHealthFood).toBeNull();
    expect(result.ecoVegetablesHealthFood).toBeNull();
    expect(result.ecoRice).toBeNull();
    expect(result.ecoFish).not.toBeNull();
    expect(result.tycoonFish).not.toBeNull();
  });
});
