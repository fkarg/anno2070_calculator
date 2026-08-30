import { beforeEach, describe, expect, test } from 'vitest';

import { createInitialState } from './model';
import { loadCalculatorState, saveCalculatorState, STORAGE_KEY } from './storage';

beforeEach(() => localStorage.clear());

describe('calculator storage', () => {
  test('round-trips valid user-owned state', () => {
    const state = createInitialState();
    state.factions.eco.houses = { raw: '100', value: 100 };
    state.productivity.ecoFish = { raw: '117.5', value: 117.5 };
    saveCalculatorState(state);

    expect(loadCalculatorState()).toEqual(state);
  });

  test('rejects parsed state whose displayed and calculated values disagree', () => {
    const state = createInitialState();
    state.factions.eco.houses = { raw: '100', value: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));

    expect(loadCalculatorState()).toEqual(createInitialState());
  });

  test('rejects unknown storage versions', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state: createInitialState() }));

    expect(loadCalculatorState()).toEqual(createInitialState());
  });

  test('rejects unknown productivity keys', () => {
    const state = createInitialState();
    state.productivity.unknown = { raw: '100', value: 100 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));

    expect(loadCalculatorState()).toEqual(createInitialState());
  });
});
