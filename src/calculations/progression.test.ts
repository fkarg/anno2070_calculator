import { describe, expect, test } from 'vitest';

import { ascensionGate, demandUnlocks } from './progression';

describe('ascension progression gates', () => {
  test('uses Deep Ocean thresholds for every faction transition', () => {
    expect([2, 3, 4].map((tier) => ascensionGate('eco', tier)?.required)).toEqual([144, 750, 1200]);
    expect([2, 3, 4].map((tier) => ascensionGate('tycoon', tier)?.required)).toEqual([144, 750, 1200]);
    expect([2, 3].map((tier) => ascensionGate('tech', tier)?.required)).toEqual([150, 1200]);
  });

  test('exposes every recurring-demand threshold at its introducing tier', () => {
    expect([1, 2, 3, 4].map((tier) => demandUnlocks('eco', tier)
      .map(({ goodId, population }) => `${goodId}:${population}`))).toEqual([
      ['fishery:1', 'teaPlantation:60'],
      ['healthFoodFactory:360', 'electronicsFactory:600'],
      ['healthDrinkFactory:950', 'pastaProduction:250'],
      ['projectorPlant:1', 'robotFactory:1200'],
    ]);
    expect([1, 2, 3, 4].map((tier) => demandUnlocks('tycoon', tier)
      .map(({ goodId, population }) => `${goodId}:${population}`))).toEqual([
      ['fishery:1', 'distillery:60'],
      ['foodSupplyFactory:360', 'plasticsFactory:600'],
      ['gourmetFactory:250', 'champagneCellar:950'],
      ['jeweleryManufactory:1', 'healthcareOffice:1200'],
    ]);
    expect([1, 2, 3].map((tier) => demandUnlocks('tech', tier)
      .map(({ goodId, population }) => `${goodId}:${population}`))).toEqual([
      ['fishery:1', 'functionalFoodFactory:50', 'energyDrinkFactory:100'],
      ['immunityDrugManufacturers:1', 'cyberneticFactory:600'],
      ['laboratoryOutfitter:1', 'bionicsFactory:600'],
    ]);
  });
});
