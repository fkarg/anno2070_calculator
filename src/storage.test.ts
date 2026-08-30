import { beforeEach, describe, expect, test } from 'vitest';

import { createIsland, createInitialAppState } from './island';
import { PRODUCTION_NODES } from './calculations/production-data';
import { loadAppState, saveAppState, STORAGE_KEY } from './storage';

beforeEach(() => localStorage.clear());

function createV1State() {
  return {
    factions: {
      eco: { houses: { raw: '12', value: 12 }, maxTier: 4, livingSpace: false, senate: false, overrides: [null, null, null, null] },
      tycoon: { houses: { raw: '0', value: 0 }, maxTier: 4, livingSpace: true, senate: false, overrides: [null, null, null, null] },
      tech: { houses: { raw: '3', value: 3 }, maxTier: 2, livingSpace: false, senate: true, overrides: [null, { raw: '55', value: 55 }, null] },
    },
    productivity: Object.fromEntries(PRODUCTION_NODES.map((node) => [node.id, { raw: '100', value: 100 }])),
    recycling: true,
    wholeBuildings: false,
  };
}

function validV2() {
  const state = createInitialAppState();
  state.plan.factions.eco.houses = { raw: '9', value: 9 };
  const island = createIsland('Home');
  island.owned = { fishery: { raw: '2', value: 2 } };
  island.fertilities = ['tea'];
  state.islands = [island];
  saveAppState(state);
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  localStorage.clear();
  return stored;
}

describe('loadAppState', () => {
  test('empty storage loads defaults and allows saving', () => {
    const result = loadAppState();
    expect(result.state).toEqual(createInitialAppState());
    expect(result.storable).toBe(true);
  });

  test('round-trips saved state', () => {
    const stored = validV2();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    saveAppState(result.state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(stored);
  });

  test('valid v1 payloads migrate losslessly with houses kept manual', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: createV1State() }));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    expect(result.state.plan.factions.eco.houses).toEqual({ raw: '12', value: 12 });
    expect(result.state.plan.factions.tech.overrides[1]).toEqual({ raw: '55', value: 55 });
    expect(result.state.plan.recycling).toBe(true);
    expect(result.state.islands).toEqual([]);
  });

  test('corrupted payloads are preserved and autosave is suppressed', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const result = loadAppState();
    expect(result.state).toEqual(createInitialAppState());
    expect(result.storable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not json');
  });

  test('future versions are preserved and autosave is suppressed', () => {
    const payload = JSON.stringify({ version: 99, anything: true });
    localStorage.setItem(STORAGE_KEY, payload);
    const result = loadAppState();
    expect(result.storable).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
  });

  test('missing and unknown productivity keys tolerate catalog changes', () => {
    const stored = validV2();
    delete stored.plan.productivity.ecoFish;
    stored.plan.productivity.unknownNode = { raw: '100', value: 100 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    expect(result.state.plan.productivity.ecoFish).toEqual({ raw: '100', value: 100 });
    expect('unknownNode' in result.state.plan.productivity).toBe(false);
  });

  test('unknown owned building ids are dropped without wiping the island', () => {
    const stored = validV2();
    stored.islands[0].owned.retiredBuilding = { raw: '4', value: 4 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.state.islands[0].owned.fishery).toEqual({ raw: '2', value: 2 });
    expect('retiredBuilding' in result.state.islands[0].owned).toBe(false);
  });

  test('invalid island entries are dropped and the original payload preserved', () => {
    const stored = validV2();
    const payload = JSON.stringify({ ...stored, islands: [...stored.islands, { nonsense: true }] });
    localStorage.setItem(STORAGE_KEY, payload);
    const result = loadAppState();
    expect(result.storable).toBe(false);
    expect(result.state.islands).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
  });

  test('rejects stored values whose displayed and calculated numbers disagree', () => {
    const stored = validV2();
    stored.plan.factions.eco.houses = { raw: '100', value: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.storable).toBe(false);
    expect(result.state.plan.factions.eco.houses).toBeNull();
  });
});

describe('legacy fertility records', () => {
  test('tri-state records migrate to the present list', () => {
    const stored = validV2();
    stored.islands[0].fertilities = { tea: 'present', grapes: 'absent', bogus: 'present' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.state.islands[0].fertilities).toEqual(['tea']);
  });
});
