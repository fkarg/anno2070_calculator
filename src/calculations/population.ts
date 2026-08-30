export type Faction = 'eco' | 'tycoon' | 'tech';

export type PopulationInput = {
  faction: Faction;
  houses: number;
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
};

// Houses assigned to each tier plus each tier's inhabitants per house. The
// populations are always allocation × capacity; overrides move allocations.
type TierDistribution = {
  allocations: number[];
  capacities: number[];
};

function ecoTycoonDistribution(input: PopulationInput): TierDistribution {
  const employeeAndUp = Math.floor(input.houses * 0.8);
  const engineerAndUp = Math.floor(employeeAndUp * 0.6);
  const executives = Math.floor(engineerAndUp * (input.senate ? 0.45 : 0.4));
  const capacities = [
    8,
    input.livingSpace ? 16 : 15,
    input.livingSpace ? 28 : 25,
    input.livingSpace ? 44 : 40,
  ];

  switch (input.maxTier) {
    case 1:
      return { allocations: [input.houses, 0, 0, 0], capacities };
    case 2:
      return { allocations: [input.houses - employeeAndUp, employeeAndUp, 0, 0], capacities };
    case 3:
      return {
        allocations: [input.houses - employeeAndUp, employeeAndUp - engineerAndUp, engineerAndUp, 0],
        capacities,
      };
    case 4:
      return {
        allocations: [
          input.houses - employeeAndUp,
          employeeAndUp - engineerAndUp,
          engineerAndUp - executives,
          executives,
        ],
        capacities,
      };
    default:
      throw new RangeError(`Invalid maximum tier for ${input.faction}: ${input.maxTier}`);
  }
}

function techDistribution(input: PopulationInput): TierDistribution {
  const researcherAndUp = Math.floor(input.houses * 0.6);
  const geniuses = Math.floor(researcherAndUp * (input.senate ? 0.35 : 0.3));
  const capacities = [5, input.livingSpace ? 33 : 30, input.livingSpace ? 56 : 50];

  switch (input.maxTier) {
    case 1:
      return { allocations: [input.houses, 0, 0], capacities };
    case 2:
      return { allocations: [input.houses - researcherAndUp, researcherAndUp, 0], capacities };
    case 3:
      return {
        allocations: [input.houses - researcherAndUp, researcherAndUp - geniuses, geniuses],
        capacities,
      };
    default:
      throw new RangeError(`Invalid maximum tier for Tech: ${input.maxTier}`);
  }
}

function distribution(input: PopulationInput): TierDistribution {
  return input.faction === 'tech' ? techDistribution(input) : ecoTycoonDistribution(input);
}

export function calculatePopulation(input: PopulationInput): number[] {
  const { allocations, capacities } = distribution(input);
  return allocations.map((allocation, tier) => allocation * capacities[tier]);
}

// Overrides pin a tier's population count, but its houses stay built: houses
// an override does not need fall to the nearest lower automatic tier and fill
// it, as in the game when ascension rights are limited. Houses freed below the
// lowest tier stay unoccupied; raising a tier never pulls houses upward.
export function applyPopulationOverrides(
  input: PopulationInput,
  overrides: readonly (number | null)[],
): number[] {
  const { allocations, capacities } = distribution(input);
  const result = new Array<number>(allocations.length);
  let freedHouses = 0;

  for (let tier = allocations.length - 1; tier >= 0; tier -= 1) {
    const override = overrides[tier] ?? null;
    const available = allocations[tier] + freedHouses;
    if (override === null) {
      result[tier] = available * capacities[tier];
      freedHouses = 0;
    } else {
      result[tier] = override;
      freedHouses = available - Math.min(available, Math.ceil(override / capacities[tier]));
    }
  }
  return result;
}
