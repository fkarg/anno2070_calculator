import { describe, expect, test } from 'vitest';

import { createIsland } from '../island';
import { PRODUCTION_NODES } from './production-data';
import { calculateOperatingImpacts, calculateOwnedImpact, scaleOperatingImpact } from './operating-impact';

describe('scaleOperatingImpact', () => {
  test('scales fractional requirements without rounding again', () => {
    expect(scaleOperatingImpact(
      { maintenanceCredits: -10, power: -2, ecoBalance: -4 },
      1.25,
    )).toEqual({ maintenanceCredits: -12.5, power: -2.5, ecoBalance: -5 });
  });
});

describe('calculateOperatingImpacts', () => {
  test('rounds every required stage up for buildable full-chain totals', () => {
    const requirements: Record<string, number | null> = Object.fromEntries(
      PRODUCTION_NODES.map(({ id }) => [id, 0]),
    );
    requirements.ecoCommunicators = 0.1;
    requirements.ecoMicrochipsCommunicators = 0.1;
    requirements.ecoCopperCommunicators = 0.1;
    requirements.ecoSandCommunicators = 0.1;
    requirements.ecoElectronicsRecyclerCommunicators = 0.1;

    const result = calculateOperatingImpacts(requirements);

    expect(result.direct.ecoCommunicators).toEqual({
      maintenanceCredits: -2,
      power: -0.4,
      ecoBalance: -0.4,
    });
    expect(result.byRoot.ecoCommunicators.map(({ impact }) => impact)).toEqual([
      { maintenanceCredits: -65, power: -10, ecoBalance: -12 },
      { maintenanceCredits: -180, power: -39, ecoBalance: -4 },
    ]);
  });

  test('pins one-choice, mandatory-plus-choice, and two-choice totals', () => {
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
    expect(result.byRoot.techLaboratoryInstruments.map(({ impact }) => impact)).toEqual([
      { maintenanceCredits: -195, power: -61, ecoBalance: -7 },
      { maintenanceCredits: -190, power: -59, ecoBalance: -10 },
      { maintenanceCredits: -285, power: -84, ecoBalance: -5 },
      { maintenanceCredits: -280, power: -82, ecoBalance: -8 },
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

  test('an invalid mandatory node affects every local variant but no unrelated root', () => {
    const requirements: Record<string, number | null> = Object.fromEntries(
      PRODUCTION_NODES.map(({ id }) => [id, 1]),
    );
    requirements.ecoCommunicators = null;

    const result = calculateOperatingImpacts(requirements);
    expect(result.byRoot.ecoCommunicators.every(({ impact }) => impact === null)).toBe(true);
    expect(result.byRoot.ecoServiceBots.every(({ impact }) => impact !== null)).toBe(true);
    expect(result.byRoot.tycoonFish[0].impact).not.toBeNull();
  });
});

describe('calculateOwnedImpact', () => {
  test('sums flat per-building impacts across settled islands', () => {
    const a = createIsland('A');
    a.owned = { fishery: { raw: '2', value: 2 } }; // -5 credits, -1 power each
    const b = createIsland('B');
    b.owned = { chipFactory: { raw: '1', value: 1 } }; // -10, -2, -4
    const unsettled = { ...createIsland('C'), settled: false, owned: { fishery: { raw: '9', value: 9 } } };
    expect(calculateOwnedImpact([a, b, unsettled])).toEqual({
      maintenanceCredits: -20, power: -4, ecoBalance: -4,
    });
  });

  test('productivity does not affect owned impacts', () => {
    const island = createIsland('A');
    island.owned = { fishery: { raw: '2', value: 2 } };
    island.productivity = { fishery: { raw: '250', value: 250 } };
    expect(calculateOwnedImpact([island])!.maintenanceCredits).toBe(-10);
  });

  test('an invalid owned count makes the total unavailable', () => {
    const island = createIsland('A');
    island.owned = { fishery: { raw: 'x', value: null } };
    expect(calculateOwnedImpact([island])).toBeNull();
  });
});
