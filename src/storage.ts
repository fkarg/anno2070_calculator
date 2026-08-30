import { PRODUCTION_NODES } from './calculations/production-data';
import {
  createInitialState,
  FACTIONS,
  FACTION_CONFIGS,
  type CalculatorState,
  type EditableNumber,
  type FactionState,
} from './model';

export const STORAGE_KEY = 'anno2070-calculator-state';

type StoredState = {
  version: 1;
  state: CalculatorState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEditableNumber(value: unknown): value is EditableNumber {
  return isRecord(value)
    && typeof value.raw === 'string'
    && (value.value === null || (typeof value.value === 'number' && Number.isFinite(value.value)));
}

function isFactionState(value: unknown, faction: typeof FACTIONS[number]): value is FactionState {
  if (!isRecord(value) || !isEditableNumber(value.houses)) return false;
  if (value.houses.value !== null && (!Number.isSafeInteger(value.houses.value) || value.houses.value < 0)) return false;

  const tierCount = FACTION_CONFIGS[faction].tierLabels.length;
  if (!Number.isInteger(value.maxTier) || Number(value.maxTier) < 1 || Number(value.maxTier) > tierCount) return false;
  if (typeof value.livingSpace !== 'boolean' || typeof value.senate !== 'boolean') return false;
  if (!Array.isArray(value.overrides) || value.overrides.length !== tierCount) return false;

  return value.overrides.every((override) => override === null || (
    isEditableNumber(override)
    && (override.value === null || (Number.isSafeInteger(override.value) && override.value >= 0))
  ));
}

function isCalculatorState(value: unknown): value is CalculatorState {
  if (!isRecord(value) || !isRecord(value.factions) || !isRecord(value.productivity)) return false;
  const factions = value.factions;
  const productivity = value.productivity;
  if (typeof value.recycling !== 'boolean' || typeof value.wholeBuildings !== 'boolean') return false;
  if (!FACTIONS.every((faction) => isFactionState(factions[faction], faction))) return false;

  return PRODUCTION_NODES.every((node) => {
    const entry = productivity[node.id];
    return isEditableNumber(entry)
      && (entry.value === null || entry.value > 0);
  });
}

export function loadCalculatorState(): CalculatorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createInitialState();
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || saved.version !== 1 || !isCalculatorState(saved.state)) {
      return createInitialState();
    }
    return saved.state;
  } catch {
    return createInitialState();
  }
}

export function saveCalculatorState(state: CalculatorState): void {
  try {
    const saved: StoredState = { version: 1, state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage can be disabled or full; the calculator remains usable in memory.
  }
}
