import { describe, expect, test } from 'vitest';

import {
  createFactionState,
  createInitialState,
  createPlanFactionState,
  createResidenceFactionState,
  resolveHouses,
} from './model';

describe('resolveHouses', () => {
  test('null houses resolve to the settled-island sum', () => {
    const state = { ...createFactionState('eco'), houses: null };
    expect(resolveHouses(state, 42)).toEqual({ raw: '42', value: 42 });
  });

  test('manual houses override the island sum', () => {
    const state = { ...createFactionState('eco'), houses: { raw: '7', value: 7 } };
    expect(resolveHouses(state, 42)).toEqual({ raw: '7', value: 7 });
  });

  test('a fresh plan follows islands automatically', () => {
    const state = createInitialState();
    expect(state.factions.eco.houses).toBeNull();
    expect(state.factions.tycoon.houses).toBeNull();
    expect(state.factions.tech.houses).toBeNull();
  });
});

describe('separate residence and plan state', () => {
  test('new growth targets follow settled islands', () => {
    expect(createPlanFactionState('eco').intent).toEqual({ kind: 'follow' });
  });

  test('residence state always starts with concrete houses', () => {
    expect(createResidenceFactionState('tech').houses).toEqual({ raw: '0', value: 0 });
  });
});
