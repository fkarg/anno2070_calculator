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
  const island = createIsland('Home');
  island.owned = { fishery: { raw: '2', value: 2 } };
  island.fertilities = ['tea'];
  const plan = createV1State();
  plan.factions.eco.houses = { raw: '9', value: 9 };
  return { version: 2, plan, islands: [island] };
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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4);
    expect(loadAppState()).toEqual(result);
  });

  test('valid v1 payloads migrate losslessly with houses kept manual', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: createV1State() }));
    const result = loadAppState();
    expect(result.storable).toBe(true);
    expect(result.state.plan.factions.eco.intent).toEqual({
      kind: 'residences', houses: { raw: '12', value: 12 }, maxTier: 4,
    });
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
    expect(result.state.plan.factions.eco.intent).toEqual({ kind: 'follow', tierMode: 'mirror' });
  });

  test('migrates v2 follow and manual houses into target intents', () => {
    const stored = validV2();
    (stored.plan.factions.eco as { houses: unknown }).houses = null;
    stored.plan.factions.tech.houses = { raw: '120', value: 120 };
    stored.plan.factions.tech.maxTier = 2;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const loaded = loadAppState();

    expect(loaded.storable).toBe(true);
    expect(loaded.state.plan.factions.eco.intent).toEqual({ kind: 'follow', tierMode: 'mirror' });
    expect(loaded.state.plan.factions.tech.intent).toEqual({
      kind: 'residences', houses: { raw: '120', value: 120 }, maxTier: 2,
    });
  });

  test('migrates v3 follow intents to explicit mirror mode', () => {
    const state = createInitialAppState();
    const legacy = JSON.parse(JSON.stringify(state));
    legacy.plan.factions.eco.intent = { kind: 'follow' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, ...legacy }));

    expect(loadAppState()).toMatchObject({
      storable: true,
      state: { plan: { factions: { eco: { intent: { kind: 'follow', tierMode: 'mirror' } } } } },
    });
  });

  test('round-trips unrestricted follow mode in version 4', () => {
    const state = createInitialAppState();
    state.plan.factions.tech.intent = { kind: 'follow', tierMode: 'unrestricted' };

    saveAppState(state);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(4);
    expect(loadAppState()).toEqual({ state, storable: true });
  });

  test('round-trips and deduplicates known ignored demand sources', () => {
    const state = createInitialAppState();
    state.plan.ignoredDemands = [
      { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
      { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
    ];

    saveAppState(state);

    expect(loadAppState().state.plan.ignoredDemands).toEqual([
      { faction: 'tech', tier: 2, goodId: 'bionicsFactory' },
    ]);
  });

  test('defaults missing v4 ignored demand state without data loss', () => {
    const state = createInitialAppState();
    const plan = { ...state.plan } as Record<string, unknown>;
    delete plan.ignoredDemands;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, plan, islands: [] }));

    expect(loadAppState()).toMatchObject({
      storable: true,
      state: { plan: { ignoredDemands: [] } },
    });
  });

  test('round-trips a v4 population target without derived fields', () => {
    const state = createInitialAppState();
    state.plan.factions.tech.intent = {
      kind: 'population', tier: 3, count: { raw: '2500', value: 2500 },
    };

    saveAppState(state);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.version).toBe(4);
    expect(stored.plan.factions.tech.intent).toEqual(state.plan.factions.tech.intent);
    expect(JSON.stringify(stored)).not.toMatch(/normalPopulations|effectivePopulations|achieved/);
    expect(loadAppState()).toEqual({ state, storable: true });
  });
});

describe('legacy fertility records', () => {
  test('tri-state records migrate to the present list', () => {
    const stored = validV2();
    (stored.islands[0] as { fertilities: unknown }).fertilities = { tea: 'present', grapes: 'absent', bogus: 'present' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.state.islands[0].fertilities).toEqual(['tea']);
  });

  test('the split coal deposit ids merge into coalDeposit', () => {
    const stored = validV2();
    stored.islands[0].fertilities = ['coalMountain', 'coalGround', 'tea'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const result = loadAppState();
    expect(result.state.islands[0].fertilities).toEqual(['coalDeposit', 'tea']);
  });
});
