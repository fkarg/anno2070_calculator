# Production Trees and Operating Impacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render readable connector-tree production chains and calculate per-building, required, and complete-variant maintenance-credit, power, and ecobalance impacts from canonical building data.

**Architecture:** Keep the existing 88 occurrence-specific formula nodes and their calculation parent links authoritative. Give each occurrence a canonical `buildingId`, derive display rows and alternative variants from the formula graph plus one small alternative-group table, and calculate operating impacts from the already-computed requirement vector. React renders those pure results directly; no selected-route state, persistence migration, cache, generic graph framework, or island model is added.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Testing Library, fast-check, pnpm.

---

## File structure

- Create `src/calculations/building-data.ts`: canonical operating configuration, source URL, label, and image for each unique building or Metal Converter mode.
- Create `src/calculations/building-data.test.ts`: exhaustive catalog-to-occurrence coverage and pinned researched values.
- Modify `src/calculations/production-data.ts`: replace duplicated label/image identity with `buildingId`; remove presentation-only depth/alternate fields; add explicit alternative groups.
- Modify `src/calculations/calculate-production.test.ts`: pin the refactored formula graph and alternative-group integrity without changing formulas.
- Create `src/calculations/production-tree.ts`: derive ordered tree rows, connector ancestry, and complete variant membership.
- Create `src/calculations/production-tree.test.ts`: exact hierarchy and Cartesian variant tests.
- Create `src/calculations/operating-impact.ts`: pure scaling, addition, direct-impact, and variant-total calculations.
- Create `src/calculations/operating-impact.test.ts`: pinned examples and null-locality tests.
- Create `src/calculations/operating-impact.property.test.ts`: scaling and variant-membership properties.
- Create `src/components/OperatingImpactValues.tsx`: accessible rendering of the three original impact symbols.
- Modify `src/components/ProductionSection.tsx`: group occurrences into trees, render intrinsic-width CLI connectors and direct/per-building/variant impacts.
- Modify `src/App.test.tsx`: integration coverage for full simultaneous alternatives, connectors, icons, live impacts, rounding, and invalid inputs.
- Modify `src/assets.test.ts`: require the three downloaded wiki icon assets.
- Modify `src/styles.css`: content-driven wide layout, tree rows, impact columns, and horizontal fallback.
- Modify `README.md`: move production-tree/impact work from “Next” to current functionality after it passes.
- Add `public/assets/Balance-icon.png`, `public/assets/Energy-icon.png`, and `public/assets/Ecobal-icon.png`: locally stored original Anno symbols.

### Task 1: Canonical building identities and researched operating data

**Files:**
- Create: `src/calculations/building-data.ts`
- Create: `src/calculations/building-data.test.ts`
- Modify: `src/calculations/production-data.ts`
- Modify: `src/calculations/calculate-production.test.ts`

- [ ] **Step 1: Write failing catalog and graph-shape tests**

Create `building-data.test.ts` with exhaustive boundary assertions:

```ts
import { describe, expect, test } from 'vitest';

import { BUILDINGS } from './building-data';
import { ALTERNATIVE_GROUPS, PRODUCTION_NODES } from './production-data';

describe('BUILDINGS', () => {
  test('covers every occurrence with one canonical operating configuration', () => {
    const ids = new Set(Object.keys(BUILDINGS));
    expect(ids.size).toBe(60);
    expect(PRODUCTION_NODES).toHaveLength(88);
    for (const node of PRODUCTION_NODES) expect(ids.has(node.buildingId), node.id).toBe(true);
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
    expect(BUILDINGS.farmhouse.source).toEndWith('/Farmhouse');
    expect(BUILDINGS.fishery.operatingImpact).toEqual({ maintenanceCredits: -5, power: -1, ecoBalance: 0 });
    expect(BUILDINGS.goldMetalConverter.operatingImpact).toEqual({ maintenanceCredits: -150, power: -25, ecoBalance: 0 });
    expect(BUILDINGS.ironMetalConverter.operatingImpact).toEqual({ maintenanceCredits: -100, power: -25, ecoBalance: 0 });
    expect(BUILDINGS.platinumMetalConverter.operatingImpact).toEqual({ maintenanceCredits: -80, power: -30, ecoBalance: 0 });
    expect(PRODUCTION_NODES.filter(({ buildingId }) => buildingId === 'chipFactory')).toHaveLength(3);
  });

  test('declares the eight independent alternative groups', () => {
    expect(ALTERNATIVE_GROUPS.map(({ id }) => id)).toEqual([
      'ecoCommunicatorsChips', 'ecoServiceBotsChips', 'tycoonPlasticsOil',
      'tycoonJewelryGold', 'tycoonJewelryCoal', 'techNeuroimplantsChips',
      'techLaboratoryIron', 'techLaboratoryCoal',
    ]);
  });
});
```

Update the existing graph test so `expectedCalculations` stays byte-for-byte equivalent while presentation fields disappear:

```ts
expect(Object.fromEntries(PRODUCTION_NODES.map((node) => [node.id, node.calculation])))
  .toEqual(expectedCalculations);
expect(PRODUCTION_NODES.every((node) => !('depth' in node) && !('alternate' in node))).toBe(true);
```

- [ ] **Step 2: Run the focused tests and verify the missing-module/type failures**

Run:

```bash
pnpm test -- src/calculations/building-data.test.ts src/calculations/calculate-production.test.ts
```

Expected: FAIL because `building-data.ts`, `buildingId`, and `ALTERNATIVE_GROUPS` do not exist.

- [ ] **Step 3: Add the canonical catalog**

Create these public types and helpers in `building-data.ts`:

```ts
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
```

- [ ] **Step 4: Refactor production occurrences without changing formulas**

Change `ProductionNode` to hold `buildingId: BuildingId`; helper constructors now take a building ID and no depth/alternate presentation arguments:

```ts
export type ProductionNode = {
  id: string;
  buildingId: BuildingId;
  faction: Faction;
  calculation: PrimaryCalculation | MaterialCalculation;
};

function primary(
  faction: Faction,
  id: string,
  buildingId: BuildingId,
  satisfaction: readonly number[],
  recyclable = false,
): ProductionNode {
  return {
    id,
    buildingId,
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
  buildingId: BuildingId,
  parentId: string,
  multiplier: number,
): ProductionNode {
  return {
    id,
    buildingId,
    faction,
    calculation: { kind: 'material', parentId, multiplier },
  };
}
```

Replace each occurrence's old label/image pair with the matching catalog ID. The non-obvious shared mappings are:

```ts
// Examples which also pin the unchanged formula shape:
primary('eco', 'ecoFish', 'fishery', [250, 364, 571, 800]);
material('eco', 'ecoVegetablesHealthFood', 'farmhouse', 'ecoHealthFood', 2);
material('eco', 'ecoMicrochipsCommunicators', 'chipFactory', 'ecoCommunicators', 1);
material('tycoon', 'tycoonGoldConverter', 'goldMetalConverter', 'tycoonGold', 0.89);
material('tech', 'techPlatinumLaboratory', 'platinumMetalConverter', 'techLaboratoryInstruments', 1);
material('tech', 'techIronConverter', 'ironMetalConverter', 'techIron', 2 / 3);
```

Use the catalog names directly for every remaining occurrence; identical old image filenames map to the same catalog ID except the explicitly separate Metal Converter modes.

Add the only non-derivable chain semantics as data:

```ts
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
```

- [ ] **Step 5: Run all calculation tests and commit the stable data boundary**

Run:

```bash
pnpm test -- src/calculations
```

Expected: PASS with the same 88 production calculations and the new 60-entry catalog.

Commit:

```bash
git add src/calculations/building-data.ts src/calculations/building-data.test.ts src/calculations/production-data.ts src/calculations/calculate-production.test.ts
git commit -m "refactor: add canonical production buildings"
```

### Task 2: Derived connector trees and complete variants

**Files:**
- Create: `src/calculations/production-tree.ts`
- Create: `src/calculations/production-tree.test.ts`

- [ ] **Step 1: Write exact hierarchy and alternative-membership tests**

Create tests for the public surface:

```ts
import { describe, expect, test } from 'vitest';
import { buildProductionTrees } from './production-tree';

describe('buildProductionTrees', () => {
  test('derives connector ancestry and sibling endings from calculation parents', () => {
    const communicators = buildProductionTrees('eco').find(({ rootId }) => rootId === 'ecoCommunicators')!;
    expect(communicators.rows.map(({ nodeId, ancestorContinues, isLastSibling }) => ({
      nodeId, ancestorContinues, isLastSibling,
    }))).toEqual([
      { nodeId: 'ecoCommunicators', ancestorContinues: [], isLastSibling: true },
      { nodeId: 'ecoMicrochipsCommunicators', ancestorContinues: [], isLastSibling: false },
      { nodeId: 'ecoCopperCommunicators', ancestorContinues: [true], isLastSibling: false },
      { nodeId: 'ecoSandCommunicators', ancestorContinues: [true], isLastSibling: true },
      { nodeId: 'ecoElectronicsRecyclerCommunicators', ancestorContinues: [], isLastSibling: true },
    ]);
  });

  test('keeps all options visible while generating mutually exclusive variants', () => {
    const serviceBots = buildProductionTrees('eco').find(({ rootId }) => rootId === 'ecoServiceBots')!;
    expect(serviceBots.rows.map(({ nodeId }) => nodeId)).toContain('ecoMicrochipsServiceBots');
    expect(serviceBots.rows.map(({ nodeId }) => nodeId)).toContain('ecoElectronicsRecyclerServiceBots');
    expect(serviceBots.variants).toHaveLength(2);
    for (const variant of serviceBots.variants) {
      expect(variant.nodeIds).toContain('ecoBiopolymers');
      expect(variant.nodeIds).toContain('ecoAlgae');
      expect(variant.nodeIds).toContain('ecoCorn');
      expect([
        variant.nodeIds.includes('ecoMicrochipsServiceBots'),
        variant.nodeIds.includes('ecoElectronicsRecyclerServiceBots'),
      ].filter(Boolean)).toHaveLength(1);
    }
  });

  test.each([
    ['tycoon', 'tycoonJewelry'],
    ['tech', 'techLaboratoryInstruments'],
  ] as const)('%s %s produces the Cartesian four variants', (faction, rootId) => {
    const tree = buildProductionTrees(faction).find((candidate) => candidate.rootId === rootId)!;
    expect(tree.variants).toHaveLength(4);
    expect(new Set(tree.variants.map(({ id }) => id)).size).toBe(4);
  });
});
```

Also test that every option root belongs to its declared root tree, groups have at least two options, option subtrees within a group are disjoint, all primary roots become one tree, and source order is preserved.

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```bash
pnpm test -- src/calculations/production-tree.test.ts
```

Expected: FAIL because `production-tree.ts` does not exist.

- [ ] **Step 3: Implement one small derived-tree module**

Expose only these view-independent structures:

```ts
export type ProductionTreeRow = Readonly<{
  nodeId: string;
  depth: number;
  ancestorContinues: readonly boolean[];
  isLastSibling: boolean;
  alternativeRoot: boolean;
}>;

export type ProductionVariant = Readonly<{
  id: string;
  label: string;
  nodeIds: readonly string[];
}>;

export type ProductionTree = Readonly<{
  rootId: string;
  rows: readonly ProductionTreeRow[];
  variants: readonly ProductionVariant[];
}>;

export function buildProductionTrees(faction: Faction): readonly ProductionTree[];
```

Implement the derivation directly:

```ts
const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));
const childrenById = new Map(PRODUCTION_NODES.map((node) => [
  node.id,
  PRODUCTION_NODES.filter((candidate) =>
    candidate.calculation.kind === 'material' && candidate.calculation.parentId === node.id),
]));

const alternativeRoots = new Set(ALTERNATIVE_GROUPS.flatMap((group) =>
  group.options.map((option) => option.rootId)));

function subtreeIds(rootId: string): readonly string[] {
  return [rootId, ...(childrenById.get(rootId) ?? []).flatMap(({ id }) => subtreeIds(id))];
}

function rowsFor(rootId: string): readonly ProductionTreeRow[] {
  const rows: ProductionTreeRow[] = [];
  const visit = (
    nodeId: string,
    depth: number,
    ancestorContinues: readonly boolean[],
    isLastSibling: boolean,
  ) => {
    rows.push({
      nodeId,
      depth,
      ancestorContinues,
      isLastSibling,
      alternativeRoot: alternativeRoots.has(nodeId),
    });
    const children = childrenById.get(nodeId) ?? [];
    children.forEach((child, index) => visit(
      child.id,
      depth + 1,
      depth === 0 ? [] : [...ancestorContinues, !isLastSibling],
      index === children.length - 1,
    ));
  };
  visit(rootId, 0, [], true);
  return rows;
}

function variantsFor(rootId: string, rows: readonly ProductionTreeRow[]): readonly ProductionVariant[] {
  const groups = ALTERNATIVE_GROUPS.filter((group) => group.rootId === rootId);
  const selections = groups.reduce<readonly (readonly AlternativeGroup['options'][number][])[]>(
    (current, group) => current.flatMap((selection) =>
      group.options.map((option) => [...selection, option])),
    [[]],
  );
  const nodeIds = rows.map((row) => row.nodeId);
  const optionSubtrees = new Map(groups.flatMap((group) => group.options)
    .map((option) => [option.rootId, new Set(subtreeIds(option.rootId))]));

  return selections.map((selection) => {
    const selected = new Set(selection.map((option) => option.rootId));
    const excluded = [...optionSubtrees.entries()]
      .filter(([optionRootId]) => !selected.has(optionRootId))
      .map(([, ids]) => ids);
    return {
      id: selection.length === 0 ? 'full' : selection.map((option) => option.rootId).join('+'),
      label: selection.length === 0 ? 'Full chain' : selection.map((option) => option.label).join(' + '),
      nodeIds: nodeIds.filter((nodeId) => excluded.every((ids) => !ids.has(nodeId))),
    };
  });
}

export function buildProductionTrees(faction: Faction): readonly ProductionTree[] {
  return PRODUCTION_NODES
    .filter((node) => node.faction === faction && node.calculation.kind === 'primary')
    .map((node) => {
      const rows = rowsFor(node.id);
      return { rootId: node.id, rows, variants: variantsFor(node.id, rows) };
    });
}
```

Before exporting results, validate the static table once: every group has at least two options, its root is primary, every option root is in the declared root's subtree, and option subtrees are pairwise disjoint. Throw a descriptive `Error` for malformed static metadata; runtime user input cannot create those states.

- [ ] **Step 4: Run the tree tests and commit**

Run:

```bash
pnpm test -- src/calculations/production-tree.test.ts src/calculations/calculate-production.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/calculations/production-tree.ts src/calculations/production-tree.test.ts
git commit -m "feat: derive production trees and variants"
```

### Task 3: Pure direct and complete-variant operating impacts

**Files:**
- Create: `src/calculations/operating-impact.ts`
- Create: `src/calculations/operating-impact.test.ts`
- Create: `src/calculations/operating-impact.property.test.ts`

- [ ] **Step 1: Write pinned calculation tests**

Test component-wise arithmetic, direct scaling, and variant-local null handling:

```ts
import { describe, expect, test } from 'vitest';
import { calculateOperatingImpacts, scaleOperatingImpact } from './operating-impact';

describe('scaleOperatingImpact', () => {
  test('scales fractional requirements without rounding again', () => {
    expect(scaleOperatingImpact({ maintenanceCredits: -10, power: -2, ecoBalance: -4 }, 1.25))
      .toEqual({ maintenanceCredits: -12.5, power: -2.5, ecoBalance: -5 });
  });
});

describe('calculateOperatingImpacts', () => {
  test('pins one-group, mandatory-plus-choice, and two-group totals', () => {
    const requirements = Object.fromEntries(PRODUCTION_NODES.map(({ id }) => [id, 1]));
    const result = calculateOperatingImpacts(requirements);

    expect(result.byRoot.ecoCommunicators.map(({ impact }) => impact)).toEqual([
      { maintenanceCredits: -65, power: -10, ecoBalance: -12 },
      { maintenanceCredits: -180, power: -39, ecoBalance: -4 },
    ]);
    expect(result.byRoot.ecoServiceBots.map(({ impact }) => impact)).toEqual([
      { maintenanceCredits: -295, power: -53, ecoBalance: -26 },
      { maintenanceCredits: -410, power: -82, ecoBalance: -18 },
    ]);
    expect(result.byRoot.tycoonJewelry.map(({ impact }) => impact)).toEqual([
      { maintenanceCredits: -175, power: -28, ecoBalance: -18 },
      { maintenanceCredits: -170, power: -26, ecoBalance: -21 },
      { maintenanceCredits: -295, power: -49, ecoBalance: -12 },
      { maintenanceCredits: -290, power: -47, ecoBalance: -15 },
    ]);
  });

  test('an invalid option affects only variants which include it', () => {
    const requirements: Record<string, number | null> = Object.fromEntries(
      PRODUCTION_NODES.map(({ id }) => [id, 1]),
    );
    requirements.ecoElectronicsRecyclerCommunicators = null;
    const variants = calculateOperatingImpacts(requirements).byRoot.ecoCommunicators;
    expect(variants[0].impact).not.toBeNull();
    expect(variants[1].impact).toBeNull();
  });
});
```

- [ ] **Step 2: Write property tests before implementation**

Generate finite non-negative counts for all 88 occurrences and assert:

```ts
test.prop({ count: fc.double({ min: 0, max: 10_000, noNaN: true }) })(
  'direct impacts scale linearly',
  ({ count }) => {
    const base = BUILDINGS.chipFactory.operatingImpact;
    expect(scaleOperatingImpact(base, count * 2)).toEqual(
      scaleOperatingImpact(scaleOperatingImpact(base, count), 2),
    );
  },
);

test.prop({ counts: requirementArbitrary })(
  'each variant equals the sum of exactly its occurrence node IDs',
  ({ counts }) => {
    const result = calculateOperatingImpacts(counts);
    for (const tree of allTrees) for (const variant of tree.variants) {
      expect(result.byRoot[tree.rootId].find(({ id }) => id === variant.id)?.impact)
        .toEqual(sumExpectedDirectImpacts(variant.nodeIds, counts));
    }
  },
);
```

Use integer generated counts for exact equality in the membership property; add a zero-vector property asserting every direct and variant component is zero.

- [ ] **Step 3: Run the focused tests and verify the missing module failure**

Run:

```bash
pnpm test -- src/calculations/operating-impact.test.ts src/calculations/operating-impact.property.test.ts
```

Expected: FAIL because `operating-impact.ts` does not exist.

- [ ] **Step 4: Implement the pure impact pass**

Expose:

```ts
export const ZERO_OPERATING_IMPACT: OperatingImpact = {
  maintenanceCredits: 0,
  power: 0,
  ecoBalance: 0,
};

export function addOperatingImpacts(left: OperatingImpact, right: OperatingImpact): OperatingImpact;
export function scaleOperatingImpact(impact: OperatingImpact, count: number): OperatingImpact;

export type VariantOperatingImpact = Readonly<{
  id: string;
  label: string;
  impact: OperatingImpact | null;
}>;

export type ProductionOperatingImpacts = Readonly<{
  direct: Readonly<Record<string, OperatingImpact | null>>;
  byRoot: Readonly<Record<string, readonly VariantOperatingImpact[]>>;
}>;

export function calculateOperatingImpacts(
  requirements: Readonly<Record<string, number | null>>,
): ProductionOperatingImpacts;
```

Implement it as one direct pass followed by small variant reductions:

```ts
export function addOperatingImpacts(left: OperatingImpact, right: OperatingImpact): OperatingImpact {
  return {
    maintenanceCredits: left.maintenanceCredits + right.maintenanceCredits,
    power: left.power + right.power,
    ecoBalance: left.ecoBalance + right.ecoBalance,
  };
}

export function scaleOperatingImpact(impact: OperatingImpact, count: number): OperatingImpact {
  return {
    maintenanceCredits: impact.maintenanceCredits * count,
    power: impact.power * count,
    ecoBalance: impact.ecoBalance * count,
  };
}

export function calculateOperatingImpacts(
  requirements: Readonly<Record<string, number | null>>,
): ProductionOperatingImpacts {
  const direct = Object.fromEntries(PRODUCTION_NODES.map((node) => {
    const count = requirements[node.id];
    return [node.id, count === null ? null
      : scaleOperatingImpact(BUILDINGS[node.buildingId].operatingImpact, count)];
  }));
  const trees = (['eco', 'tycoon', 'tech'] as const).flatMap(buildProductionTrees);
  const byRoot = Object.fromEntries(trees.map((tree) => [tree.rootId, tree.variants.map((variant) => {
    let impact: OperatingImpact | null = ZERO_OPERATING_IMPACT;
    for (const nodeId of variant.nodeIds) {
      const nodeImpact = direct[nodeId];
      if (nodeImpact === null) {
        impact = null;
        break;
      }
      impact = addOperatingImpacts(impact, nodeImpact);
    }
    return { id: variant.id, label: variant.label, impact };
  })]));
  return { direct, byRoot };
}
```

Do not read `wholeBuildings`, population, productivity, or React state in this module: the requirement vector already contains all of those effects.

- [ ] **Step 5: Run calculation tests and commit**

Run:

```bash
pnpm test -- src/calculations
```

Expected: PASS.

Commit:

```bash
git add src/calculations/operating-impact.ts src/calculations/operating-impact.test.ts src/calculations/operating-impact.property.test.ts
git commit -m "feat: calculate production operating impacts"
```

### Task 4: Original impact symbols and accessible rendering

**Files:**
- Add: `public/assets/Balance-icon.png`
- Add: `public/assets/Energy-icon.png`
- Add: `public/assets/Ecobal-icon.png`
- Create: `src/components/OperatingImpactValues.tsx`
- Modify: `src/assets.test.ts`

- [ ] **Step 1: Extend the asset test before downloading files**

Add this assertion, keeping archived-image byte comparisons unchanged:

```ts
const impactIcons = ['Balance-icon.png', 'Energy-icon.png', 'Ecobal-icon.png'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test.each(impactIcons)('ships the original wiki %s symbol locally', (filename) => {
  const image = readFileSync(join(process.cwd(), 'public/assets', filename));
  expect(image.subarray(0, 8)).toEqual(pngSignature);
  expect(image.byteLength).toBeGreaterThan(100);
});
```

- [ ] **Step 2: Run the asset test and verify all three files are missing**

Run:

```bash
pnpm test -- src/assets.test.ts
```

Expected: FAIL with `ENOENT` for `Balance-icon.png`.

- [ ] **Step 3: Download the authoritative icons directly into local assets**

Run:

```bash
curl -fL 'https://static.wikia.nocookie.net/anno2070/images/3/30/Balance-icon.png/revision/latest?cb=20111129020239' -o public/assets/Balance-icon.png
curl -fL 'https://static.wikia.nocookie.net/anno2070/images/b/bb/Energy-icon.png/revision/latest?cb=20111129020419' -o public/assets/Energy-icon.png
curl -fL 'https://static.wikia.nocookie.net/anno2070/images/9/9a/Ecobal-icon.png/revision/latest?cb=20111129020309' -o public/assets/Ecobal-icon.png
```

Expected: each command exits 0 and creates a PNG asset. The source index is `https://anno2070.fandom.com/wiki/Icons`.

- [ ] **Step 4: Add one reusable accessible presenter**

Create `OperatingImpactValues.tsx`:

```tsx
import type { OperatingImpact } from '../calculations/building-data';

const metrics = [
  { key: 'maintenanceCredits', icon: 'Balance-icon.png', label: 'maintenance credits per minute' },
  { key: 'power', icon: 'Energy-icon.png', label: 'power' },
  { key: 'ecoBalance', icon: 'Ecobal-icon.png', label: 'ecobalance' },
] as const;

export function formatOperatingImpact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

export function OperatingImpactValues({ impact }: { impact: OperatingImpact }) {
  return <span className="operating-impact-values">
    {metrics.map(({ key, icon, label }) => <span key={key} aria-label={`${formatOperatingImpact(impact[key])} ${label}`}>
      <img src={`/assets/${icon}`} alt="" />
      <span aria-hidden="true">{formatOperatingImpact(impact[key])}</span>
    </span>)}
  </span>;
}
```

- [ ] **Step 5: Run the asset test and commit**

Run:

```bash
pnpm test -- src/assets.test.ts
```

Expected: PASS.

Commit:

```bash
git add public/assets/Balance-icon.png public/assets/Energy-icon.png public/assets/Ecobal-icon.png src/assets.test.ts src/components/OperatingImpactValues.tsx
git commit -m "feat: add original operating impact symbols"
```

### Task 5: Render full production trees and live impacts

**Files:**
- Modify: `src/components/ProductionSection.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing workflow assertions**

Replace old depth/arrow assertions and add tests which verify:

```tsx
test('renders intrinsic connector prefixes and every alternative at full demand', async () => {
  render(<App />);
  await replaceInput(screen.getByLabelText('Eco houses'), '100');

  expect(within(screen.getByTestId('production-node-ecoMicrochipsCommunicators'))
    .getByTestId('tree-connector').textContent).toBe('├── ');
  expect(within(screen.getByTestId('production-node-ecoCopperCommunicators'))
    .getByTestId('tree-connector').textContent).toBe('│   ├── ');
  expect(within(screen.getByTestId('production-node-ecoSandCommunicators'))
    .getByTestId('tree-connector').textContent).toBe('│   └── ');
  expect(within(screen.getByTestId('production-node-ecoElectronicsRecyclerCommunicators'))
    .getByTestId('tree-connector').textContent).toBe('└── ');

  expect(screen.getByLabelText('Chip factory required buildings (Eco, Electronics factory)'))
    .not.toHaveTextContent('0');
  expect(screen.getByLabelText('Electronics recycler required buildings (Eco, Electronics factory)'))
    .not.toHaveTextContent('0');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

test('updates direct and full-chain operating impacts and honors rounding', async () => {
  const user = userEvent.setup();
  render(<App />);
  await replaceInput(screen.getByLabelText('Eco Workers population'), '251');

  const fish = screen.getByTestId('production-node-ecoFish');
  const direct = within(fish).getByTestId('direct-operating-impact');
  expect(within(direct).getByLabelText('-5.02 maintenance credits per minute')).toBeInTheDocument();
  expect(screen.getByTestId('variant-ecoCommunicators-ecoMicrochipsCommunicators')).toBeInTheDocument();
  expect(screen.getByTestId('variant-ecoCommunicators-ecoElectronicsRecyclerCommunicators')).toBeInTheDocument();

  await user.click(screen.getByLabelText('Round up to whole buildings'));
  expect(within(direct).getByLabelText('-10 maintenance credits per minute')).toBeInTheDocument();
});
```

Use a more specific query or `data-testid` to distinguish direct row values from the smaller “per building” values. Add a null-locality workflow: blank the recycler productivity and assert only the recycler variant shows `—`, while the chip variant total remains numeric. Keep all existing automatic recalculation and productivity tests.

- [ ] **Step 2: Run App tests and verify the old flat renderer fails the new assertions**

Run:

```bash
pnpm test -- src/App.test.tsx
```

Expected: FAIL because connector and variant elements do not exist.

- [ ] **Step 3: Calculate the impact view model once per render**

In `App.tsx`, derive alongside the existing requirements:

```tsx
const operatingImpacts = calculateOperatingImpacts(production);

<ProductionSection
  state={state}
  results={production}
  operatingImpacts={operatingImpacts}
  // existing handlers unchanged
/>
```

This is synchronous scalar work over 88 nodes. Do not add `useMemo` or another state value.

- [ ] **Step 4: Replace the flat faction row map with tree sections**

In `ProductionSection.tsx`:

```tsx
function connector(row: ProductionTreeRow): string {
  if (row.depth === 0) return '';
  const ancestors = row.ancestorContinues.map((continues) => continues ? '│   ' : '    ').join('');
  return `${ancestors}${row.isLastSibling ? '└── ' : '├── '}`;
}

const trees = buildProductionTrees(faction);

{trees.map((tree) => <section className="production-tree" key={tree.rootId}>
  {tree.rows.map((row) => {
    const node = nodeById.get(row.nodeId)!;
    const building = BUILDINGS[node.buildingId];
    const direct = operatingImpacts.direct[node.id];
    return <div
      key={node.id}
      className={`production-node${row.alternativeRoot ? ' production-node--alternate' : ''}`}
      data-testid={`production-node-${node.id}`}
    >
      <div className="production-node__identity">
        <span className="production-node__connector" data-testid="tree-connector" aria-hidden="true">{connector(row)}</span>
        <img className="production-node__image" src={`/assets/${building.image}`} alt="" />
        <span className="production-node__label">{building.label}</span>
      </div>
      <output aria-label={`${building.label} required buildings (${context(node)})`}>
        {result === null ? '—' : formatRequirement(result)}
      </output>
      <NumericInput
        id={`${node.id}-productivity`}
        label={`${building.label} productivity (${context(node)})`}
        raw={state.productivity[node.id].raw}
        valid={state.productivity[node.id].value !== null}
        inputMode="decimal"
        onChange={(raw) => onProductivityChange(node.id, {
          raw,
          value: raw.trim() === '' ? null : Number(raw),
        })}
      />
      <div className="production-node__impact" data-testid="direct-operating-impact">
        {direct === null ? <span aria-label={`${building.label} direct operating impact unavailable`}>—</span>
          : <OperatingImpactValues impact={direct} />}
        <small>per building <OperatingImpactValues impact={building.operatingImpact} /></small>
      </div>
    </div>;
  })}
  <footer className="production-tree__variants">
    {operatingImpacts.byRoot[tree.rootId].map((variant) => <div
      key={variant.id}
      data-testid={`variant-${tree.rootId}-${variant.id}`}
    >
      <span>{variant.label}</span>
      {variant.impact === null ? <span aria-label={`${variant.label} operating impact unavailable`}>—</span>
        : <OperatingImpactValues impact={variant.impact} />}
    </div>)}
  </footer>
</section>)}
```

Root rows must return an empty connector independently of sibling position; implement an explicit `depth` or `root` field in `ProductionTreeRow` if the root test reveals ambiguity. Preserve accessible label context using canonical `building.label` plus the occurrence's primary root label, so duplicate Chip Factory occurrences remain distinguishable.

- [ ] **Step 5: Run the UI and calculation tests and commit**

Run:

```bash
pnpm test -- src/App.test.tsx src/calculations
```

Expected: PASS.

Commit:

```bash
git add src/App.tsx src/App.test.tsx src/components/ProductionSection.tsx
git commit -m "feat: render production trees and impacts"
```

### Task 6: Content-driven wide styling and documentation state

**Files:**
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add tree and impact layout styles**

Replace the fixed five-column row and depth padding with an identity-first layout:

```css
main {
  --page-gutter: clamp(1rem, 3vw, 4rem);
  width: fit-content;
  min-width: min(1440px, calc(100vw - var(--page-gutter) - 1rem));
  max-width: min(2200px, calc(100vw - var(--page-gutter) - 1rem));
  margin: 0 auto 0 var(--page-gutter);
  padding: 1rem 0 3rem;
}

.production-section__factions {
  grid-template-columns: repeat(3, minmax(620px, 1fr));
  overflow-x: auto;
}

.production-node {
  display: grid;
  grid-template-columns: minmax(15rem, 1fr) 4.3rem 4rem minmax(14rem, auto);
}

.production-node__identity { display: flex; align-items: center; min-width: 0; }
.production-node__connector {
  flex: none;
  white-space: pre;
  color: #8fa2aa;
  font-family: ui-monospace, "Cascadia Mono", "DejaVu Sans Mono", monospace;
}
.production-node__image { flex: none; }
.production-node__impact { display: grid; justify-items: end; gap: .1rem; }
.operating-impact-values { display: inline-flex; flex-wrap: nowrap; gap: .45rem; }
.operating-impact-values > span { display: inline-flex; align-items: center; gap: .12rem; }
.operating-impact-values img { width: 16px; height: 16px; object-fit: contain; }
.production-node__impact small { color: var(--muted); }
.production-tree__variants { display: grid; gap: .25rem; padding: .4rem .55rem; }
.production-tree__variants > div { display: flex; justify-content: space-between; gap: 1rem; }
main > footer { padding: .9rem .15rem; color: var(--muted); font-size: .75rem; text-align: right; }
main > footer a { color: #8fc9f6; }
```

Remove the old global `footer` rules so they do not affect variant footers. Tune the `620px` intrinsic faction minimum during browser inspection if the exact text wraps badly. Do not force the main element to 2200 px: `fit-content` plus the faction minimums makes the production table consume the width it needs, subject to the 2200 px permission ceiling. At narrow widths retain horizontal scrolling rather than compressing tree prefixes into overlap.

- [ ] **Step 2: Update README completed and queued work**

Move these items into `Current functionality`:

```markdown
- Connector-tree production chains with all source alternatives shown at full demand.
- Per-building, directly required, and complete-variant maintenance-credit, power, and ecobalance impacts from reviewed wiki building data.
```

Remove the matching three bullets from `Next`. Rename the owned production/global statistics subsection to `Next: owned production and global statistics`. Keep all user-authored simulation ideas and necessary incompleteness intact.

- [ ] **Step 3: Run automated verification**

Run each command separately:

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

Expected: all tests pass, lint exits 0, TypeScript/Vite build exits 0, and diff check emits no output.

- [ ] **Step 4: Inspect the rendered layout at wide and fallback widths**

Run:

```bash
pnpm dev --host 0.0.0.0 --port 63096
```

At a 2560 px viewport verify:

- the calculator is slightly left-aligned;
- the production section uses only the width its four columns and three faction panes need, up to 2200 px;
- connector prefixes move building images right at each level;
- all simultaneous options and every complete variant remain legible; and
- symbols align with signed totals without C/P/E abbreviations.

At 1050 px and 700 px verify horizontal scrolling preserves the tree and no controls overlap.

- [ ] **Step 5: Request focused review, fix findings, rerun verification, and commit**

Request fresh-context general correctness and test-quality reviews of the complete diff. Apply only findings supported by the approved spec, then rerun all four Step 3 commands.

Commit:

```bash
git add README.md src/styles.css
git commit -m "style: widen and clarify production chains"
```

Final working-tree expectation: `git status --short` emits no output. Report the exact test count plus lint/build results and the local development URL.
