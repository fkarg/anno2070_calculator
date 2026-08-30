export type OperatingImpact = Readonly<{
  maintenanceCredits: number;
  power: number;
  ecoBalance: number;
}>;

export type BuildingDefinition = Readonly<{
  label: string;
  image: string;
  source: string;
  operatingImpact: OperatingImpact;
}>;

const wiki = (page: string) => `https://anno2070.fandom.com/wiki/${page}`;
const building = (
  label: string,
  image: string,
  maintenanceCredits: number,
  power: number,
  ecoBalance: number,
  page: string,
): BuildingDefinition => ({
  label,
  image,
  source: wiki(page),
  operatingImpact: { maintenanceCredits, power, ecoBalance },
});

export const BUILDINGS = {
  fishery: building('Fishery', 'Fish_Qoor.png', -5, -1, 0, 'Fishery'),
  teaPlantation: building('Tea plantation', 'Tea_Qoor.png', -10, -1, 0, 'Tea_Plantation'),
  healthFoodFactory: building('Health food factory', 'Health food_Qoor.png', -15, -2, -3, 'Health_Food_Factory'),
  farmhouse: building('Vegetable farm', 'Vegetables_Qoor.png', -5, -1, -1, 'Farmhouse'),
  riceFarm: building('Rice farm', 'Rice_Qoor.png', -10, -1, -1, 'Rice_Farm'),
  electronicsFactory: building('Electronics factory', 'Communicator_Qoor.png', -20, -4, -4, 'Electronics_Factory'),
  chipFactory: building('Chip factory', 'Microchips_Qoor.png', -10, -2, -4, 'Chip_Factory'),
  copperMine: building('Copper mine', 'Copper_Qoor.png', -15, -2, -2, 'Copper_Mine'),
  sandExtractor: building('Sand extractor', 'Sand_Qoor.png', -20, -2, -2, 'Sand_Extractor'),
  electronicsRecycler: building('Electronics recycler', 'electronics_recycler_Qoor.png', -160, -35, 0, 'Electronics_Recycler'),
  healthDrinkFactory: building('Health drink factory', 'Bio drinks_Qoor.png', -30, -2, -4, 'Health_Drink_Factory'),
  fruitPlantation: building('Fruit plantation', 'Fruits_Qoor.png', -15, -1, -1, 'Fruit_Plantation'),
  dairyFarm: building('Dairy farm', 'Milk_Qoor.png', -20, -2, -4, 'Dairy_Farm'),
  pastaProduction: building('Pasta production', 'Pasta dishes_Qoor.png', -20, -2, -4, 'Pasta_Production'),
  flourMill: building('Flour mill', 'Pasta_Qoor.png', -25, -4, -5, 'Flour_Mill'),
  grainFarm: building('Grain farm', 'Durum wheat_Qoor.png', -15, -2, -2, 'Grain_Farm'),
  projectorPlant: building('3D projector plant', '3D Projector_Qoor.png', -50, -25, -12, 'Projector_Plant'),
  diamondHarvestingStation: building('Diamond harvesting station', 'Diamonds_Qoor.png', -60, -10, 0, 'Diamond_Harvesting_Station'),
  rareEarthBorer: building('Rare-earth borer', 'Rare-earth elements_Qoor.png', -60, -7, 0, 'Rare-Earth_Borer'),
  manganeseExcavationRobot: building('Manganese excavation robot', 'Manganese nodules_Qoor.png', -40, -8, 0, 'Manganese_Excavation_Robot'),
  robotFactory: building('Robot factory', 'Service bots_Qoor.png', -90, -25, -8, 'Robot_Factory'),
  biopolymerFactory: building('Biopolymer factory', 'Biopolymers_Qoor.png', -70, -15, -8, 'Biopolymer_Factory'),
  aquafarm: building('Aquafarm', 'Algae_Qoor.png', -40, -3, 0, 'Aquafarm'),
  cornFarm: building('Corn farm', 'Corn_Qoor.png', -50, -4, -2, 'Corn_Farm'),
  distillery: building('Distillery', 'Liquor_Qoor.png', -5, -1, -2, 'Distillery'),
  foodSupplyFactory: building('Food supply factory', 'Convenience Food_Qoor.png', -15, -4, -3, 'Food_Supply_Factory'),
  meatFactory: building('Meat factory', 'Meat_Qoor.png', -5, -2, -3, 'Meat_Factory'),
  flavorLab: building('Flavor lab', 'Super flavor_Qoor.png', -10, -2, -2, 'Flavor_Lab'),
  plasticsFactory: building('Plastic factory', 'Plastics_Qoor.png', -15, -2, -4, 'Plastics_Factory'),
  oilRefinery: building('Oil refinery', 'Oil_Qoor.png', -15, -2, -4, 'Oil_Refinery'),
  oilRig: building('Oil rig', 'Crude oil_Qoor.png', -50, -20, 0, 'Oil_Rig'),
  oilDriller: building('Oil driller', 'oil_driller_Qoor.png', -15, -4, -3, 'Oil_Driller'),
  gourmetFactory: building('Gourmet factory', 'Luxury meal_Qoor.png', -30, -6, -4, 'Gourmet_Factory'),
  lobsterFarm: building('Lobster farm', 'Lobster_Qoor.png', -30, -3, -3, 'Lobster_Farm'),
  truffleFarm: building('Truffle farm', 'Truffle_Qoor.png', -15, -3, -2, 'Truffle_Farm'),
  champagneCellar: building('Champagne cellar', 'Champagne_Qoor.png', -30, -6, -4, 'Champagne_Cellar'),
  vineyard: building('Vineyard', 'Grapes_Qoor.png', -15, -3, -2, 'Vineyard'),
  sugarBeetPlantation: building('Sugar beet plantation', 'Sugar_Qoor.png', -30, -3, -2, 'Sugar_Beet_Plantation'),
  jeweleryManufactory: building('Jewelry manufactory', 'Jewelery_Qoor.png', -40, -8, -5, 'Jewelery_Manufactory'),
  goldSmeltery: building('Gold smeltery', 'Gold_Qoor.png', -30, -4, -5, 'Gold_Smeltery'),
  goldRefinery: building('Gold refinery', 'Gold nuggets_Qoor.png', -30, -4, -6, 'Gold_Refinery'),
  goldMetalConverter: building('Gold converter', 'gold_converter_Qoor.png', -150, -25, 0, 'Metal_Converter'),
  coalMine: building('Coal mine', 'Coal_Qoor.png', -15, -2, -2, 'Coal_Mine'),
  rotaryExcavator: building('Rotary excavator', 'rotary_excavator_Qoor.png', -10, 0, -5, 'Rotary_Excavator'),
  healthcareOffice: building('Healthcare office', 'Pharmaceuticals_Qoor.png', -80, -15, -8, 'Healthcare_Office'),
  chemicalPlant: building('Chemical plant', 'Secret ingredients_Qoor.png', -25, -6, -8, 'Chemical_Plant'),
  fatFactory: building('Fat factory', 'Omega acids_Qoor.png', -10, -3, -4, 'Fat_Factory'),
  functionalFoodFactory: building('Functional food factory', 'Functional food_Qoor.png', -40, -6, 0, 'Functional_Food_Factory'),
  energyDrinkFactory: building('Energy drink factory', 'Functional drinks_Qoor.png', -60, -6, -4, 'Energy_Drink_Factory'),
  coffeePlantation: building('Coffee plantation', 'Caffeine_Qoor.png', -40, -3, -3, 'Coffee_Plantation'),
  immunityDrugManufacturers: building('Immunity drug manufacturer', 'Immunity Drugs_Qoor.png', -60, -20, -6, 'Immunity_Drug_Manufacturers'),
  genFarmingLaboratory: building('Gene farming laboratory', 'Enzymes_Qoor.png', -30, -3, 0, 'Gen_Farming_Laboratory'),
  coralBreeder: building('Coral breeder', 'Coral_Qoor.png', -40, -4, 0, 'Coral_Breeder'),
  cyberneticFactory: building('Cybernetic factory', 'Neuroimplants_Qoor.png', -70, -20, 0, 'Cybernetic_Factory'),
  spongeFarm: building('Sponge farm', 'Sponges_Qoor.png', -45, -12, 0, 'Sponge_Farm'),
  laboratoryOutfitter: building('Laboratory outfitter', 'Laboratory instruments_Qoor.png', -80, -25, 0, 'Laboratory_Outfitter'),
  platinumMetalConverter: building('Platinum metal converter', 'Platinum_Qoor.png', -80, -30, 0, 'Metal_Converter'),
  ironSmeltery: building('Iron smeltery', 'Iron_Qoor.png', -10, -2, -3, 'Iron_Smelter'),
  ironOreMine: building('Iron ore mine', 'Iron Ore_Qoor.png', -10, -2, -2, 'Iron_Ore_Mine'),
  ironMetalConverter: building('Iron converter', 'iron_converter_Qoor.png', -100, -25, 0, 'Metal_Converter'),
  bionicsFactory: building('Bionics factory', 'Bionic Suits_Qoor.png', -90, -40, -15, 'Bionics_Factory'),
  hydraulicPlant: building('Hydraulic plant', 'Exoskeletons_Qoor.png', -50, -20, -10, 'Hydraulic_Plant'),
  oxidationFacility: building('Oxidation facility', 'Electrolite Cells_Qoor.png', -40, -15, 0, 'Oxidation_Facility'),
  lithiumProductionFacility: building('Lithium production facility', 'Lithium_Qoor.png', -30, -10, 0, 'Lithium_Production_Facility'),
} as const;

export type BuildingId = keyof typeof BUILDINGS;

// Island prerequisites per the Anno 2070 wiki (Fertility, All Items, and
// per-building pages, verified 2026-08-30). Only picker semantics: a building
// absent from BUILDING_REQUIREMENTS needs nothing from the island.
//
// Land fertilities are seedable: an island's one free fertility slot can be
// filled with any of them, so an open slot satisfies any land fertility.
// Underwater fertilities and deposits are fixed per island.
export type IslandRequirement = Readonly<{
  id: string;
  label: string;
  image: string;
  kind: 'fertility' | 'deposit';
  placement: 'land' | 'underwater';
  seedable: boolean;
}>;

export const OPEN_FERTILITY_SLOT = 'openSlot';

const landFertility = (id: string, label: string, image: string): IslandRequirement =>
  ({ id, label, image, kind: 'fertility', placement: 'land', seedable: true });
const underwaterFertility = (id: string, label: string, image: string): IslandRequirement =>
  ({ id, label, image, kind: 'fertility', placement: 'underwater', seedable: false });
const deposit = (id: string, label: string, image: string, placement: 'land' | 'underwater' = 'land'): IslandRequirement =>
  ({ id, label, image, kind: 'deposit', placement, seedable: false });

export const ISLAND_REQUIREMENTS: readonly IslandRequirement[] = [
  landFertility('tea', 'Tea', 'Tea_Qoor.png'),
  landFertility('rice', 'Rice', 'Rice_Qoor.png'),
  landFertility('vegetable', 'Vegetable', 'Vegetables_Qoor.png'),
  landFertility('fruit', 'Fruit', 'Fruits_Qoor.png'),
  landFertility('durumWheat', 'Durum wheat', 'Durum wheat_Qoor.png'),
  landFertility('corn', 'Corn', 'Corn_Qoor.png'),
  landFertility('coffee', 'Coffee', 'Caffeine_Qoor.png'),
  landFertility('sugar', 'Sugar', 'Sugar_Qoor.png'),
  landFertility('grapes', 'Grapes', 'Grapes_Qoor.png'),
  landFertility('truffle', 'Truffle', 'Truffle_Qoor.png'),
  underwaterFertility('algae', 'Algae', 'Algae_Qoor.png'),
  underwaterFertility('diamond', 'Diamond', 'Diamonds_Qoor.png'),
  underwaterFertility('manganeseNodule', 'Manganese nodules', 'Manganese nodules_Qoor.png'),
  underwaterFertility('spongeCultures', 'Sponge cultures', 'Sponges_Qoor.png'),
  deposit('copperDeposit', 'Copper deposit', 'Copper_Qoor.png'),
  deposit('coalMountain', 'Coal deposit (mountain)', 'Coal_Qoor.png'),
  deposit('coalGround', 'Coal deposit (ground)', 'Coal_Qoor.png'),
  deposit('ironOreDeposit', 'Iron ore deposit', 'Iron Ore_Qoor.png'),
  deposit('sandDeposit', 'Sand deposit (river slot)', 'Sand_Qoor.png'),
  deposit('goldDeposit', 'Gold deposit (river slot)', 'Gold nuggets_Qoor.png'),
  deposit('oilLand', 'Crude oil (land)', 'Crude oil_Qoor.png'),
  deposit('oilUnderwater', 'Crude oil (underwater)', 'Crude oil_Qoor.png', 'underwater'),
  deposit('blackSmoker', 'Black smoker', 'gold_converter_Qoor.png', 'underwater'),
];

// Where each building can be placed (wiki-verified; coastal buildings sit on
// land islands' harbor areas). Bionics factory and hydraulic plant are land
// per indirect confirmation only (A.R.R.C. mod notes, Tech layout pages).
export type Placement = 'land' | 'coastal' | 'underwater';

export const BUILDING_PLACEMENTS: Record<BuildingId, Placement> = {
  fishery: 'coastal',
  teaPlantation: 'land',
  healthFoodFactory: 'land',
  farmhouse: 'land',
  riceFarm: 'land',
  electronicsFactory: 'land',
  chipFactory: 'land',
  copperMine: 'land',
  sandExtractor: 'land',
  electronicsRecycler: 'underwater',
  healthDrinkFactory: 'land',
  fruitPlantation: 'land',
  dairyFarm: 'land',
  pastaProduction: 'land',
  flourMill: 'land',
  grainFarm: 'land',
  projectorPlant: 'land',
  diamondHarvestingStation: 'underwater',
  rareEarthBorer: 'underwater',
  manganeseExcavationRobot: 'underwater',
  robotFactory: 'land',
  biopolymerFactory: 'land',
  aquafarm: 'underwater',
  cornFarm: 'land',
  distillery: 'land',
  foodSupplyFactory: 'land',
  meatFactory: 'land',
  flavorLab: 'land',
  plasticsFactory: 'land',
  oilRefinery: 'land',
  oilRig: 'underwater',
  oilDriller: 'land',
  gourmetFactory: 'land',
  lobsterFarm: 'coastal',
  truffleFarm: 'land',
  champagneCellar: 'land',
  vineyard: 'land',
  sugarBeetPlantation: 'land',
  jeweleryManufactory: 'land',
  goldSmeltery: 'land',
  goldRefinery: 'land',
  goldMetalConverter: 'underwater',
  coalMine: 'land',
  rotaryExcavator: 'land',
  healthcareOffice: 'land',
  chemicalPlant: 'land',
  fatFactory: 'land',
  functionalFoodFactory: 'underwater',
  energyDrinkFactory: 'land',
  coffeePlantation: 'land',
  immunityDrugManufacturers: 'land',
  genFarmingLaboratory: 'underwater',
  coralBreeder: 'underwater',
  cyberneticFactory: 'underwater',
  spongeFarm: 'underwater',
  laboratoryOutfitter: 'underwater',
  platinumMetalConverter: 'underwater',
  ironSmeltery: 'land',
  ironOreMine: 'land',
  ironMetalConverter: 'underwater',
  bionicsFactory: 'land',
  hydraulicPlant: 'land',
  oxidationFacility: 'underwater',
  lithiumProductionFacility: 'underwater',
} as const;

export const BUILDING_REQUIREMENTS: Partial<Record<BuildingId, string>> = {
  teaPlantation: 'tea',
  riceFarm: 'rice',
  distillery: 'rice',
  farmhouse: 'vegetable',
  flavorLab: 'vegetable',
  fruitPlantation: 'fruit',
  grainFarm: 'durumWheat',
  cornFarm: 'corn',
  coffeePlantation: 'coffee',
  sugarBeetPlantation: 'sugar',
  vineyard: 'grapes',
  truffleFarm: 'truffle',
  aquafarm: 'algae',
  diamondHarvestingStation: 'diamond',
  manganeseExcavationRobot: 'manganeseNodule',
  spongeFarm: 'spongeCultures',
  copperMine: 'copperDeposit',
  coalMine: 'coalMountain',
  rotaryExcavator: 'coalGround',
  ironOreMine: 'ironOreDeposit',
  sandExtractor: 'sandDeposit',
  goldRefinery: 'goldDeposit',
  oilDriller: 'oilLand',
  oilRig: 'oilUnderwater',
  goldMetalConverter: 'blackSmoker',
  platinumMetalConverter: 'blackSmoker',
  ironMetalConverter: 'blackSmoker',
};

export function buildingIdForImage(image: string): BuildingId {
  const match = (Object.entries(BUILDINGS) as [BuildingId, BuildingDefinition][])
    .find(([, buildingDefinition]) => buildingDefinition.image === image);
  if (!match) throw new Error(`No canonical building for image: ${image}`);
  return match[0];
}
