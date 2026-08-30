import type { Faction } from './population';
import { BUILDINGS, buildingIdForImage, type BuildingId } from './building-data';

type PrimaryCalculation = {
  kind: 'primary';
  satisfaction: readonly number[];
  recyclable?: boolean;
};

type MaterialCalculation = {
  kind: 'material';
  parentId: string;
  multiplier: number;
};

export type ProductionNode = {
  id: string;
  buildingId: BuildingId;
  faction: Faction;
  calculation: PrimaryCalculation | MaterialCalculation;
};

function resolveBuilding(label: string, image: string): BuildingId {
  const buildingId = buildingIdForImage(image);
  if (BUILDINGS[buildingId].label !== label) {
    throw new Error(`Building label mismatch for ${image}: ${label}`);
  }
  return buildingId;
}

function primary(
  faction: Faction,
  id: string,
  label: string,
  image: string,
  satisfaction: readonly number[],
  recyclable = false,
): ProductionNode {
  return {
    id,
    buildingId: resolveBuilding(label, image),
    faction,
    calculation: {
      kind: 'primary',
      satisfaction,
      ...(recyclable ? { recyclable: true } : {}),
    },
  };
}

function material(
  faction: Faction,
  id: string,
  label: string,
  image: string,
  parentId: string,
  multiplier: number,
): ProductionNode {
  return {
    id,
    buildingId: resolveBuilding(label, image),
    faction,
    calculation: { kind: 'material', parentId, multiplier },
  };
}

export type AlternativeGroup = Readonly<{
  id: string;
  rootId: string;
  options: readonly Readonly<{ rootId: string; label: string }>[];
}>;

export const ALTERNATIVE_GROUPS: readonly AlternativeGroup[] = [
  { id: 'ecoCommunicatorsChips', rootId: 'ecoCommunicators', options: [
    { rootId: 'ecoMicrochipsCommunicators', label: 'Chip factory route' },
    { rootId: 'ecoElectronicsRecyclerCommunicators', label: 'Electronics recycler route' },
  ] },
  { id: 'ecoServiceBotsChips', rootId: 'ecoServiceBots', options: [
    { rootId: 'ecoMicrochipsServiceBots', label: 'Chip factory route' },
    { rootId: 'ecoElectronicsRecyclerServiceBots', label: 'Electronics recycler route' },
  ] },
  { id: 'tycoonPlasticsOil', rootId: 'tycoonPlastics', options: [
    { rootId: 'tycoonCrudeOil', label: 'Oil rig route' },
    { rootId: 'tycoonOilDriller', label: 'Oil driller route' },
  ] },
  { id: 'tycoonJewelryGold', rootId: 'tycoonJewelry', options: [
    { rootId: 'tycoonGoldNuggets', label: 'Gold refinery route' },
    { rootId: 'tycoonGoldConverter', label: 'Gold converter route' },
  ] },
  { id: 'tycoonJewelryCoal', rootId: 'tycoonJewelry', options: [
    { rootId: 'tycoonCoal', label: 'Coal mine route' },
    { rootId: 'tycoonRotaryExcavator', label: 'Rotary excavator route' },
  ] },
  { id: 'techNeuroimplantsChips', rootId: 'techNeuroimplants', options: [
    { rootId: 'techMicrochips', label: 'Chip factory route' },
    { rootId: 'techElectronicsRecycler', label: 'Electronics recycler route' },
  ] },
  { id: 'techLaboratoryIron', rootId: 'techLaboratoryInstruments', options: [
    { rootId: 'techIronOre', label: 'Iron ore route' },
    { rootId: 'techIronConverter', label: 'Iron converter route' },
  ] },
  { id: 'techLaboratoryCoal', rootId: 'techLaboratoryInstruments', options: [
    { rootId: 'techCoal', label: 'Coal mine route' },
    { rootId: 'techRotaryExcavator', label: 'Rotary excavator route' },
  ] },
];

export const PRODUCTION_NODES: readonly ProductionNode[] = [
  primary('eco', 'ecoFish', 'Fishery', 'Fish_Qoor.png', [250, 364, 571, 800]),
  primary('eco', 'ecoTea', 'Tea plantation', 'Tea_Qoor.png', [375, 375, 500, 750]),
  primary('eco', 'ecoHealthFood', 'Health food factory', 'Health food_Qoor.png', [0, 667, 857, 1000]),
  material('eco', 'ecoVegetablesHealthFood', 'Vegetable farm', 'Vegetables_Qoor.png', 'ecoHealthFood', 2),
  material('eco', 'ecoRice', 'Rice farm', 'Rice_Qoor.png', 'ecoHealthFood', 1),
  primary('eco', 'ecoCommunicators', 'Electronics factory', 'Communicator_Qoor.png', [0, 571, 800, 1250], true),
  material('eco', 'ecoMicrochipsCommunicators', 'Chip factory', 'Microchips_Qoor.png', 'ecoCommunicators', 1),
  material('eco', 'ecoCopperCommunicators', 'Copper mine', 'Copper_Qoor.png', 'ecoMicrochipsCommunicators', 0.5),
  material('eco', 'ecoSandCommunicators', 'Sand extractor', 'Sand_Qoor.png', 'ecoMicrochipsCommunicators', 1 / 3),
  material('eco', 'ecoElectronicsRecyclerCommunicators', 'Electronics recycler', 'electronics_recycler_Qoor.png', 'ecoCommunicators', 2 / 3),
  primary('eco', 'ecoBioDrinks', 'Health drink factory', 'Bio drinks_Qoor.png', [0, 0, 833, 1136]),
  material('eco', 'ecoFruits', 'Fruit plantation', 'Fruits_Qoor.png', 'ecoBioDrinks', 2),
  material('eco', 'ecoMilk', 'Dairy farm', 'Milk_Qoor.png', 'ecoBioDrinks', 1),
  primary('eco', 'ecoPastaDishes', 'Pasta production', 'Pasta dishes_Qoor.png', [0, 0, 667, 909]),
  material('eco', 'ecoVegetablesPasta', 'Vegetable farm', 'Vegetables_Qoor.png', 'ecoPastaDishes', 1),
  material('eco', 'ecoFlour', 'Flour mill', 'Pasta_Qoor.png', 'ecoPastaDishes', 0.5),
  material('eco', 'ecoDurumWheat', 'Grain farm', 'Durum wheat_Qoor.png', 'ecoFlour', 3),
  primary('eco', 'eco3DProjectors', '3D projector plant', '3D Projector_Qoor.png', [0, 0, 0, 750], true),
  material('eco', 'ecoDiamonds', 'Diamond harvesting station', 'Diamonds_Qoor.png', 'eco3DProjectors', 50 / 89),
  material('eco', 'ecoRareEarthElements', 'Rare-earth borer', 'Rare-earth elements_Qoor.png', 'eco3DProjectors', 100 / 89),
  material('eco', 'ecoManganeseNodules', 'Manganese excavation robot', 'Manganese nodules_Qoor.png', 'ecoRareEarthElements', 0.5),
  primary('eco', 'ecoServiceBots', 'Robot factory', 'Service bots_Qoor.png', [0, 0, 0, 666 + 2 / 3], true),
  material('eco', 'ecoMicrochipsServiceBots', 'Chip factory', 'Microchips_Qoor.png', 'ecoServiceBots', 0.5),
  material('eco', 'ecoCopperServiceBots', 'Copper mine', 'Copper_Qoor.png', 'ecoMicrochipsServiceBots', 0.5),
  material('eco', 'ecoSandServiceBots', 'Sand extractor', 'Sand_Qoor.png', 'ecoMicrochipsServiceBots', 1 / 3),
  material('eco', 'ecoElectronicsRecyclerServiceBots', 'Electronics recycler', 'electronics_recycler_Qoor.png', 'ecoServiceBots', 1 / 3),
  material('eco', 'ecoBiopolymers', 'Biopolymer factory', 'Biopolymers_Qoor.png', 'ecoServiceBots', 1),
  material('eco', 'ecoAlgae', 'Aquafarm', 'Algae_Qoor.png', 'ecoBiopolymers', 1),
  material('eco', 'ecoCorn', 'Corn farm', 'Corn_Qoor.png', 'ecoBiopolymers', 2),

  primary('tycoon', 'tycoonFish', 'Fishery', 'Fish_Qoor.png', [250, 364, 571, 800]),
  primary('tycoon', 'tycoonLiquor', 'Distillery', 'Liquor_Qoor.png', [300, 333, 300, 750]),
  primary('tycoon', 'tycoonConvenienceFood', 'Food supply factory', 'Convenience Food_Qoor.png', [0, 577, 714, 857]),
  material('tycoon', 'tycoonMeat', 'Meat factory', 'Meat_Qoor.png', 'tycoonConvenienceFood', 2),
  material('tycoon', 'tycoonSuperFlavor', 'Flavor lab', 'Super flavor_Qoor.png', 'tycoonConvenienceFood', 1),
  primary('tycoon', 'tycoonPlastics', 'Plastic factory', 'Plastics_Qoor.png', [0, 667, 1000, 1667]),
  material('tycoon', 'tycoonOil', 'Oil refinery', 'Oil_Qoor.png', 'tycoonPlastics', 1),
  material('tycoon', 'tycoonCrudeOil', 'Oil rig', 'Crude oil_Qoor.png', 'tycoonOil', 1),
  material('tycoon', 'tycoonOilDriller', 'Oil driller', 'oil_driller_Qoor.png', 'tycoonOil', 3),
  primary('tycoon', 'tycoonLuxuryMeals', 'Gourmet factory', 'Luxury meal_Qoor.png', [0, 0, 833, 1111]),
  material('tycoon', 'tycoonLobsters', 'Lobster farm', 'Lobster_Qoor.png', 'tycoonLuxuryMeals', 0.5),
  material('tycoon', 'tycoonTruffles', 'Truffle farm', 'Truffle_Qoor.png', 'tycoonLuxuryMeals', 2),
  primary('tycoon', 'tycoonChampagne', 'Champagne cellar', 'Champagne_Qoor.png', [0, 0, 1042, 1389]),
  material('tycoon', 'tycoonGrapes', 'Vineyard', 'Grapes_Qoor.png', 'tycoonChampagne', 2),
  material('tycoon', 'tycoonSugar', 'Sugar beet plantation', 'Sugar_Qoor.png', 'tycoonChampagne', 1),
  primary('tycoon', 'tycoonJewelry', 'Jewelry manufactory', 'Jewelery_Qoor.png', [0, 0, 0, 665]),
  material('tycoon', 'tycoonDiamonds', 'Diamond harvesting station', 'Diamonds_Qoor.png', 'tycoonJewelry', 1),
  material('tycoon', 'tycoonGold', 'Gold smeltery', 'Gold_Qoor.png', 'tycoonJewelry', 1),
  material('tycoon', 'tycoonGoldNuggets', 'Gold refinery', 'Gold nuggets_Qoor.png', 'tycoonGold', 1),
  material('tycoon', 'tycoonGoldConverter', 'Gold converter', 'gold_converter_Qoor.png', 'tycoonGold', 0.89),
  material('tycoon', 'tycoonCoal', 'Coal mine', 'Coal_Qoor.png', 'tycoonGold', 0.5),
  material('tycoon', 'tycoonRotaryExcavator', 'Rotary excavator', 'rotary_excavator_Qoor.png', 'tycoonGold', 1),
  primary('tycoon', 'tycoonPharmaceuticals', 'Healthcare office', 'Pharmaceuticals_Qoor.png', [0, 0, 0, 571]),
  material('tycoon', 'tycoonRareEarthElements', 'Rare-earth borer', 'Rare-earth elements_Qoor.png', 'tycoonPharmaceuticals', 1.5),
  material('tycoon', 'tycoonManganeseNodules', 'Manganese excavation robot', 'Manganese nodules_Qoor.png', 'tycoonRareEarthElements', 0.5),
  material('tycoon', 'tycoonSecretIngredients', 'Chemical plant', 'Secret ingredients_Qoor.png', 'tycoonPharmaceuticals', 1),
  material('tycoon', 'tycoonOmegaAcids', 'Fat factory', 'Omega acids_Qoor.png', 'tycoonSecretIngredients', 3),
  material('tycoon', 'tycoonAlgae', 'Aquafarm', 'Algae_Qoor.png', 'tycoonSecretIngredients', 1),

  primary('tech', 'techFish', 'Fishery', 'Fish_Qoor.png', [800, 800, 1600]),
  primary('tech', 'techFunctionalFood', 'Functional food factory', 'Functional food_Qoor.png', [299, 444, 1250]),
  material('tech', 'techAlgaeFunctionalFood', 'Aquafarm', 'Algae_Qoor.png', 'techFunctionalFood', 1),
  primary('tech', 'techFunctionalDrinks', 'Energy drink factory', 'Functional drinks_Qoor.png', [301, 735, 1250]),
  material('tech', 'techSugar', 'Sugar beet plantation', 'Sugar_Qoor.png', 'techFunctionalDrinks', 1),
  material('tech', 'techCaffeine', 'Coffee plantation', 'Caffeine_Qoor.png', 'techFunctionalDrinks', 1),
  primary('tech', 'techImmunityDrugs', 'Immunity drug manufacturer', 'Immunity Drugs_Qoor.png', [0, 500, 667]),
  material('tech', 'techEnzymes', 'Gene farming laboratory', 'Enzymes_Qoor.png', 'techImmunityDrugs', 1),
  material('tech', 'techCoral', 'Coral breeder', 'Coral_Qoor.png', 'techImmunityDrugs', 0.5),
  primary('tech', 'techNeuroimplants', 'Cybernetic factory', 'Neuroimplants_Qoor.png', [0, 667, 667]),
  material('tech', 'techSponges', 'Sponge farm', 'Sponges_Qoor.png', 'techNeuroimplants', 1),
  material('tech', 'techMicrochips', 'Chip factory', 'Microchips_Qoor.png', 'techNeuroimplants', 0.5),
  material('tech', 'techCopper', 'Copper mine', 'Copper_Qoor.png', 'techMicrochips', 0.5),
  material('tech', 'techSand', 'Sand extractor', 'Sand_Qoor.png', 'techMicrochips', 1 / 3),
  material('tech', 'techElectronicsRecycler', 'Electronics recycler', 'electronics_recycler_Qoor.png', 'techNeuroimplants', 1 / 3),
  primary('tech', 'techLaboratoryInstruments', 'Laboratory outfitter', 'Laboratory instruments_Qoor.png', [0, 0, 444]),
  material('tech', 'techPlatinumLaboratory', 'Platinum metal converter', 'Platinum_Qoor.png', 'techLaboratoryInstruments', 1),
  material('tech', 'techIron', 'Iron smeltery', 'Iron_Qoor.png', 'techLaboratoryInstruments', 1),
  material('tech', 'techIronOre', 'Iron ore mine', 'Iron Ore_Qoor.png', 'techIron', 1),
  material('tech', 'techIronConverter', 'Iron converter', 'iron_converter_Qoor.png', 'techIron', 2 / 3),
  material('tech', 'techCoal', 'Coal mine', 'Coal_Qoor.png', 'techIron', 0.5),
  material('tech', 'techRotaryExcavator', 'Rotary excavator', 'rotary_excavator_Qoor.png', 'techIron', 1),
  primary('tech', 'techBionicSuits', 'Bionics factory', 'Bionic Suits_Qoor.png', [0, 0, 1481]),
  material('tech', 'techBiopolymers', 'Biopolymer factory', 'Biopolymers_Qoor.png', 'techBionicSuits', 1),
  material('tech', 'techAlgaeBiopolymers', 'Aquafarm', 'Algae_Qoor.png', 'techBiopolymers', 1),
  material('tech', 'techCorn', 'Corn farm', 'Corn_Qoor.png', 'techBiopolymers', 2),
  material('tech', 'techExoskeletons', 'Hydraulic plant', 'Exoskeletons_Qoor.png', 'techBionicSuits', 1),
  material('tech', 'techPlatinumExoskeletons', 'Platinum metal converter', 'Platinum_Qoor.png', 'techExoskeletons', 1),
  material('tech', 'techElectrolyteCells', 'Oxidation facility', 'Electrolite Cells_Qoor.png', 'techExoskeletons', 1),
  material('tech', 'techLithium', 'Lithium production facility', 'Lithium_Qoor.png', 'techElectrolyteCells', 2),
  material('tech', 'techOmegaAcids', 'Fat factory', 'Omega acids_Qoor.png', 'techElectrolyteCells', 2),
];
