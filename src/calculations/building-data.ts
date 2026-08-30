export type OperatingImpact = Readonly<{
  maintenanceCredits: number;
  power: number;
  ecoBalance: number;
}>;

export type BuildingCategory = 'production' | 'power' | 'eco' | 'material';

export type BuildingDefinition = Readonly<{
  label: string;
  image: string;
  source: string;
  category: BuildingCategory;
  // Modeling caveat shown as a tooltip wherever the building appears.
  note?: string;
  // Output scales with inhabitants in range: the per-island productivity %
  // scales this building's positive power/eco output (maintenance stays full).
  scalableOutput?: true;
  operatingImpact: OperatingImpact;
}>;

const wiki = (page: string) => `https://anno2070.fandom.com/wiki/${page}`;
const catalogEntry = (category: BuildingCategory) => (
  label: string,
  image: string,
  maintenanceCredits: number,
  power: number,
  ecoBalance: number,
  page: string,
  note?: string,
): BuildingDefinition => ({
  label,
  image,
  source: wiki(page),
  category,
  ...(note === undefined ? {} : { note }),
  operatingImpact: { maintenanceCredits, power, ecoBalance },
});
const building = catalogEntry('production');
const powerPlant = catalogEntry('power');
const ecoBuilding = catalogEntry('eco');
const materialBuilding = catalogEntry('material');

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

  // Power plants (docs/research/2026-08-31-power-eco-materials.md). Underwater
  // placements carry ecoBalance 0: no ecobalance exists underwater.
  windPark: powerPlant('Wind park', 'Wind-park-icon.png', -25, 15, 0, 'Wind_Park'),
  thermalPowerStation: { ...powerPlant('Thermal power station', 'Thermal-power-icon.png', -65, 70, 0, 'Thermal_Power_Station', 'Output scales with inhabitants in range (100% at 650) — set its % to match.'), scalableOutput: true },
  offshoreWindPark: powerPlant('Offshore wind park', 'Offshore-wind-icon.png', -50, 30, 0, 'Offshore_Wind_Park'),
  solarTowerGenerator: powerPlant('Solar tower generator', 'Solar-power-icon.png', -120, 120, 0, 'Solar_Tower_Generator'),
  coalPowerStation: powerPlant('Coal power station', 'Coal-power-stn-icon.png', -10, 60, -15, 'Coal_Power_Station', 'Burns the coal of 1 rotary excavator (= ½ coal mine) per station.'),
  nuclearPowerPlant: powerPlant('Nuclear power plant', 'Nuclear-power-icon.png', -100, 500, -10, 'Nuclear_Power_Plant', 'Burns the fuel rods of 1 fuel element factory (fed by 1 uranium mine) per plant.'),
  marineCurrentPowerPlant: powerPlant('Marine current power plant', 'Marine-power-icon.png', -40, 25, 0, 'Marine_Current_Power_Plant'),
  hydroelectricPowerPlant: powerPlant('Hydroelectric power plant', 'Hydro-dam-icon.png', -140, 500, -10, 'Hydroelectric_Power_Plant'),
  geothermicPowerPlant: powerPlant('Geothermic power plant', 'Geothermal_Power_Plant_Icon.png', -200, 750, 0, 'Geothermic_Power_Plant'),
  energyTransmitter: powerPlant('Energy transmitter', 'Energy_Transmitter_Icon.png', -175, 0, -30, 'Energy_Transmitter', 'Moves energy between islands; the transfer itself is not modeled.'),

  // Ecobalance buildings. Tycoon entries cannot raise island eco above 0.
  weatherControlStation: ecoBuilding('Weather control station', 'Weather-stn-icon.png', -20, -2, 15, 'Weather_Control_Station'),
  monitoringStation: ecoBuilding('Monitoring station', 'Monitor-stn-icon.png', -40, -25, 40, 'Monitoring_Station'),
  ozoneMakerStation: ecoBuilding('Ozone maker station', 'Ozone-maker-icon.png', -120, -60, 100, 'Ozone_Maker_Station'),
  riverSewageTreatmentPlant: ecoBuilding('River sewage treatment plant', 'River-treatment-icon.png', -200, -250, 300, 'River_Sewage_Treatment_Plant'),
  guardian: ecoBuilding('Guardian 1.0', 'Guardian-icon.png', -500, -250, 500, 'Guardian_1.0'),
  wasteCompactor: { ...ecoBuilding('Waste compactor', 'Waste-comp-icon.png', -40, -5, 50, 'Waste_Compactor', 'Output scales with inhabitants in range — set its % to match.'), scalableOutput: true },
  deacidificationStation: ecoBuilding('Deacidification station', 'Deacid-stn-icon.png', -80, -60, 90, 'Deacidification_Station'),
  co2Reservoir: ecoBuilding('CO2 reservoir', 'Co2-res-icon.png', -160, -110, 200, 'CO2_Reservoir'),

  // Construction-material buildings: impact-only (material goods flows carry
  // no wiki-documented absolute rates and stay out of the goods graph).
  basaltExtraction: materialBuilding('Basalt extraction', 'Basalt.png', -5, -1, 0, 'Basalt_Extraction'),
  basaltCrusher: materialBuilding('Basalt crusher', 'Granules.png', -5, -2, -4, 'Basalt_Crusher'),
  smelter: materialBuilding('Smelter', 'Smelter.png', -5, -1, 0, 'Smelter'),
  underwaterRecyclingStation: materialBuilding('Underwater recycling station', 'Building_modules.png', -60, -4, 0, 'Underwater_Recycling_Station'),
  toolsWorkshop: materialBuilding('Tools workshop', 'Tools.png', -10, -3, -4, 'Tools_Workshop'),
  treeNursery: materialBuilding('Tree nursery', 'Nursery-icon.png', -10, -2, 0, 'Tree_Nursery'),
  sawmill: materialBuilding('Sawmill', 'Wood.png', -5, -2, -3, 'Sawmill'),
  limestoneQuarry: materialBuilding('Limestone quarry', 'Limestone.png', -20, -2, -2, 'Limestone_Quarry'),
  glassworks: materialBuilding('Glassworks', 'Glass.png', -60, -3, -6, 'Glassworks'),
  concreteFactory: materialBuilding('Concrete factory', 'Concrete.png', -10, -4, -4, 'Concrete_Factory'),
  steelworks: materialBuilding('Steelworks', 'Steel.png', -20, -6, -6, 'Steelworks'),
  carbonFactory: materialBuilding('Carbon factory', 'Carbon.png', -40, -6, -6, 'Carbon_Producing_Factory'),
  uraniumMine: materialBuilding('Uranium mine', 'Uranium.png', -50, -4, -6, 'Uranium_Mine'),
  fuelElementFactory: materialBuilding('Fuel element factory', 'Fuel.png', -60, -4, -6, 'Fuel_Element_Factory'),
} as const;

// Wiki rule: Tycoon eco buildings only fill an island's ecobalance up to 0.
export const TYCOON_ECO_BUILDINGS: ReadonlySet<BuildingId> =
  new Set<BuildingId>(['wasteCompactor', 'deacidificationStation', 'co2Reservoir']);

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
  deposit('coalDeposit', 'Coal deposit', 'Coal_Qoor.png'),
  deposit('ironOreDeposit', 'Iron ore deposit', 'Iron Ore_Qoor.png'),
  deposit('sandDeposit', 'Sand deposit (river slot)', 'Sand_Qoor.png'),
  deposit('goldDeposit', 'Gold deposit (river slot)', 'Gold nuggets_Qoor.png'),
  deposit('oilLand', 'Crude oil (land)', 'Crude oil_Qoor.png'),
  deposit('oilUnderwater', 'Crude oil (underwater)', 'Crude oil_Qoor.png', 'underwater'),
  deposit('blackSmoker', 'Black smoker', 'gold_converter_Qoor.png', 'underwater'),
  deposit('basaltDeposit', 'Basalt deposit', 'Basalt.png'),
  deposit('limestoneDeposit', 'Limestone deposit', 'Limestone.png'),
  deposit('uraniumDeposit', 'Uranium deposit', 'Uranium.png'),
  deposit('rubbleHeap', 'Rubble heap', 'Building_modules.png', 'underwater'),
  deposit('damSlot', 'Dam slot', 'Hydro-dam-icon.png'),
  deposit('geothermalVent', 'Geothermal vent', 'Geothermal_Power_Plant_Icon.png', 'underwater'),
  deposit('riverSlot', 'River slot', 'River-treatment-icon.png'),
];

// Where each building can be placed (wiki-verified; coastal buildings sit on
// land islands' harbor areas). Bionics factory and hydraulic plant are land
// per indirect confirmation only (A.R.R.C. mod notes, Tech layout pages).
// 'any' fits both land and underwater islands (energy transmitter).
export type Placement = 'land' | 'coastal' | 'underwater' | 'any';

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
  windPark: 'land',
  thermalPowerStation: 'land',
  offshoreWindPark: 'coastal',
  solarTowerGenerator: 'land',
  coalPowerStation: 'land',
  nuclearPowerPlant: 'land',
  marineCurrentPowerPlant: 'underwater',
  hydroelectricPowerPlant: 'land',
  geothermicPowerPlant: 'underwater',
  energyTransmitter: 'any',
  weatherControlStation: 'land',
  monitoringStation: 'land',
  ozoneMakerStation: 'land',
  riverSewageTreatmentPlant: 'land',
  guardian: 'land',
  wasteCompactor: 'land',
  deacidificationStation: 'land',
  co2Reservoir: 'land',
  basaltExtraction: 'land',
  basaltCrusher: 'land',
  smelter: 'land',
  underwaterRecyclingStation: 'underwater',
  toolsWorkshop: 'land',
  treeNursery: 'land',
  sawmill: 'land',
  limestoneQuarry: 'land',
  glassworks: 'land',
  concreteFactory: 'land',
  steelworks: 'land',
  carbonFactory: 'land',
  uraniumMine: 'land',
  fuelElementFactory: 'land',
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
  coalMine: 'coalDeposit',
  rotaryExcavator: 'coalDeposit',
  ironOreMine: 'ironOreDeposit',
  sandExtractor: 'sandDeposit',
  goldRefinery: 'goldDeposit',
  oilDriller: 'oilLand',
  oilRig: 'oilUnderwater',
  goldMetalConverter: 'blackSmoker',
  platinumMetalConverter: 'blackSmoker',
  ironMetalConverter: 'blackSmoker',
  basaltExtraction: 'basaltDeposit',
  basaltCrusher: 'basaltDeposit',
  limestoneQuarry: 'limestoneDeposit',
  uraniumMine: 'uraniumDeposit',
  underwaterRecyclingStation: 'rubbleHeap',
  hydroelectricPowerPlant: 'damSlot',
  geothermicPowerPlant: 'geothermalVent',
  riverSewageTreatmentPlant: 'riverSlot',
};

export function buildingIdForImage(image: string): BuildingId {
  const match = (Object.entries(BUILDINGS) as [BuildingId, BuildingDefinition][])
    .find(([, buildingDefinition]) => buildingDefinition.image === image);
  if (!match) throw new Error(`No canonical building for image: ${image}`);
  return match[0];
}
