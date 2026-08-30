export type Faction = 'eco' | 'tycoon' | 'tech';

export type PopulationInput = {
  faction: Faction;
  houses: number;
  maxTier: number;
  livingSpace: boolean;
  senate: boolean;
};

function calculateEcoTycoonPopulation(input: PopulationInput): number[] {
  const employeeAndUp = Math.floor(input.houses * 0.8);
  const engineerAndUp = Math.floor(employeeAndUp * 0.6);
  const executives = Math.floor(engineerAndUp * (input.senate ? 0.45 : 0.4));
  const employeeCapacity = input.livingSpace ? 16 : 15;
  const engineerCapacity = input.livingSpace ? 28 : 25;
  const executiveCapacity = input.livingSpace ? 44 : 40;

  switch (input.maxTier) {
    case 1:
      return [8 * input.houses, 0, 0, 0];
    case 2:
      return [
        8 * (input.houses - employeeAndUp),
        employeeAndUp * employeeCapacity,
        0,
        0,
      ];
    case 3:
      return [
        8 * (input.houses - employeeAndUp),
        (employeeAndUp - engineerAndUp) * employeeCapacity,
        engineerAndUp * engineerCapacity,
        0,
      ];
    case 4:
      return [
        8 * (input.houses - employeeAndUp),
        (employeeAndUp - engineerAndUp) * employeeCapacity,
        (engineerAndUp - executives) * engineerCapacity,
        executives * executiveCapacity,
      ];
    default:
      throw new RangeError(`Invalid maximum tier for ${input.faction}: ${input.maxTier}`);
  }
}

function calculateTechPopulation(input: PopulationInput): number[] {
  const researcherAndUp = Math.floor(input.houses * 0.6);
  const geniuses = Math.floor(researcherAndUp * (input.senate ? 0.35 : 0.3));
  const researcherCapacity = input.livingSpace ? 33 : 30;
  const geniusCapacity = input.livingSpace ? 56 : 50;

  switch (input.maxTier) {
    case 1:
      return [5 * input.houses, 0, 0];
    case 2:
      return [
        5 * (input.houses - researcherAndUp),
        researcherAndUp * researcherCapacity,
        0,
      ];
    case 3:
      return [
        5 * (input.houses - researcherAndUp),
        (researcherAndUp - geniuses) * researcherCapacity,
        geniuses * geniusCapacity,
      ];
    default:
      throw new RangeError(`Invalid maximum tier for Tech: ${input.maxTier}`);
  }
}

export function calculatePopulation(input: PopulationInput): number[] {
  return input.faction === 'tech'
    ? calculateTechPopulation(input)
    : calculateEcoTycoonPopulation(input);
}
