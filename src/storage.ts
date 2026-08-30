import { BUILDINGS, ISLAND_REQUIREMENTS, OPEN_FERTILITY_SLOT } from './calculations/building-data';
import { PRODUCTION_NODES } from './calculations/production-data';
import {
  createInitialAppState,
  type AppState,
  type IslandFactionState,
  type IslandState,
} from './island';
import {
  createFactionState,
  createInitialState,
  FACTIONS,
  FACTION_CONFIGS,
  parseNonNegativeInteger,
  parsePositiveNumber,
  type CalculatorState,
  type EditableNumber,
  type FactionState,
} from './model';

export const STORAGE_KEY = 'anno2070-calculator-state';

// storable: false preserves an unreadable or lossily-read payload in
// localStorage until the user makes a real change or resets.
export type LoadResult = { state: AppState; storable: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEditableNumber(value: unknown): value is EditableNumber {
  return isRecord(value)
    && typeof value.raw === 'string'
    && (value.value === null || (typeof value.value === 'number' && Number.isFinite(value.value)));
}

type Parser = (raw: string) => number | null;

// A sanitizer repairs what it can and reports whether anything was lost.
class Loss {
  lossy = false;
  markUnless(clean: boolean): boolean {
    if (!clean) this.lossy = true;
    return clean;
  }
}

function sanitizeEntry(value: unknown, parse: Parser, loss: Loss): EditableNumber | null {
  const clean = isEditableNumber(value) && value.value === parse(value.raw);
  return loss.markUnless(clean) ? (value as EditableNumber) : null;
}

function sanitizeFactionState(value: unknown, faction: typeof FACTIONS[number], loss: Loss): FactionState {
  const fallback = { ...createFactionState(faction), houses: null };
  if (!loss.markUnless(isRecord(value))) return fallback;
  const record = value as Record<string, unknown>;
  const tierCount = FACTION_CONFIGS[faction].tierLabels.length;

  const houses = record.houses === null
    ? null
    : sanitizeEntry(record.houses, parseNonNegativeInteger, loss);
  const maxTier = loss.markUnless(
    Number.isInteger(record.maxTier) && Number(record.maxTier) >= 1 && Number(record.maxTier) <= tierCount,
  ) ? Number(record.maxTier) : tierCount;
  const livingSpace = loss.markUnless(typeof record.livingSpace === 'boolean') ? Boolean(record.livingSpace) : false;
  const senate = loss.markUnless(typeof record.senate === 'boolean') ? Boolean(record.senate) : false;
  const storedOverrides = loss.markUnless(Array.isArray(record.overrides) && record.overrides.length === tierCount)
    ? record.overrides as unknown[]
    : Array.from({ length: tierCount }, () => null);
  const overrides = storedOverrides.map((override) => override === null
    ? null
    : sanitizeEntry(override, parseNonNegativeInteger, loss));

  return { houses, maxTier, livingSpace, senate, overrides };
}

function sanitizeKnownMap(
  value: unknown,
  knownIds: readonly string[],
  parse: Parser,
  defaultRaw: string,
  loss: Loss,
): Record<string, EditableNumber> {
  const record = isRecord(value) ? value : {};
  const fallback: EditableNumber = { raw: defaultRaw, value: parse(defaultRaw) };
  return Object.fromEntries(knownIds.map((id) => {
    // Missing ids default silently: the catalog legitimately grows between versions.
    if (!(id in record)) return [id, fallback];
    const entry = sanitizeEntry(record[id], parse, loss);
    return [id, entry ?? fallback];
  }));
}

function sanitizeSparseMap(value: unknown, knownIds: ReadonlySet<string>, parse: Parser, loss: Loss): Record<string, EditableNumber> {
  if (!isRecord(value)) {
    loss.markUnless(value === undefined);
    return {};
  }
  const entries: [string, EditableNumber][] = [];
  for (const [id, entry] of Object.entries(value)) {
    if (!knownIds.has(id)) continue; // dropped catalog entries are not user data loss
    const sanitized = sanitizeEntry(entry, parse, loss);
    if (sanitized !== null) entries.push([id, sanitized]);
  }
  return Object.fromEntries(entries);
}

function sanitizePlan(value: unknown, loss: Loss): CalculatorState {
  if (!loss.markUnless(isRecord(value))) return createInitialState();
  const record = value as Record<string, unknown>;
  const factions = isRecord(record.factions) ? record.factions : {};
  return {
    factions: {
      eco: sanitizeFactionState(factions.eco, 'eco', loss),
      tycoon: sanitizeFactionState(factions.tycoon, 'tycoon', loss),
      tech: sanitizeFactionState(factions.tech, 'tech', loss),
    },
    productivity: sanitizeKnownMap(
      record.productivity,
      PRODUCTION_NODES.map((node) => node.id),
      parsePositiveNumber,
      '100',
      loss,
    ),
    recycling: loss.markUnless(typeof record.recycling === 'boolean') ? Boolean(record.recycling) : false,
    wholeBuildings: loss.markUnless(typeof record.wholeBuildings === 'boolean') ? Boolean(record.wholeBuildings) : false,
  };
}

const BUILDING_IDS = new Set(Object.keys(BUILDINGS));

function sanitizeIsland(value: unknown, loss: Loss): IslandState | null {
  if (!isRecord(value)
    || typeof value.id !== 'string' || value.id === ''
    || typeof value.name !== 'string'
    || typeof value.settled !== 'boolean'
    || !isRecord(value.factions)) {
    loss.markUnless(false);
    return null;
  }
  const factions = value.factions;
  const islandFaction = (faction: typeof FACTIONS[number]): IslandFactionState => {
    const base = sanitizeFactionState(factions[faction], faction, loss);
    const stored = factions[faction];
    const hasCoverage = isRecord(stored) && typeof stored.recyclingCoverage === 'boolean';
    const recyclingCoverage = loss.markUnless(hasCoverage) && isRecord(stored)
      ? stored.recyclingCoverage === true
      : false;
    // Island houses are always concrete; Auto only exists on the plan.
    return { ...base, houses: base.houses ?? { raw: '0', value: 0 }, recyclingCoverage };
  };

  const knownFertilityIds = new Set([...ISLAND_REQUIREMENTS.map((requirement) => requirement.id), OPEN_FERTILITY_SLOT]);
  const fertilities: string[] = [];
  if (Array.isArray(value.fertilities)) {
    for (const id of value.fertilities) {
      if (loss.markUnless(typeof id === 'string') && knownFertilityIds.has(id as string) && !fertilities.includes(id as string)) {
        fertilities.push(id as string);
      }
    }
  } else if (isRecord(value.fertilities)) {
    // Legacy tri-state record: keep the present ids, drop the rest.
    for (const [id, state] of Object.entries(value.fertilities)) {
      if (state === 'present' && knownFertilityIds.has(id)) fertilities.push(id);
    }
  } else {
    loss.markUnless(value.fertilities === undefined);
  }

  return {
    id: value.id,
    name: value.name,
    settled: value.settled,
    underwater: typeof value.underwater === 'boolean'
      ? value.underwater
      : (loss.markUnless(value.underwater === undefined), false),
    fertilities,
    factions: { eco: islandFaction('eco'), tycoon: islandFaction('tycoon'), tech: islandFaction('tech') },
    owned: sanitizeSparseMap(value.owned, BUILDING_IDS, parseNonNegativeInteger, loss),
    productivity: sanitizeSparseMap(value.productivity, BUILDING_IDS, parsePositiveNumber, loss),
  };
}

export function loadAppState(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: createInitialAppState(), storable: false };
  }
  if (raw === null) return { state: createInitialAppState(), storable: true };

  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return { state: createInitialAppState(), storable: false };
  }
  if (!isRecord(saved)) return { state: createInitialAppState(), storable: false };

  const loss = new Loss();
  if (saved.version === 1) {
    const plan = sanitizePlan(saved.state, loss);
    return { state: { plan, islands: [] }, storable: !loss.lossy };
  }
  if (saved.version === 2) {
    const plan = sanitizePlan(saved.plan, loss);
    const islands = Array.isArray(saved.islands)
      ? saved.islands.map((island) => sanitizeIsland(island, loss)).filter((island): island is IslandState => island !== null)
      : (loss.markUnless(false), []);
    return { state: { plan, islands }, storable: !loss.lossy };
  }
  return { state: createInitialAppState(), storable: false };
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, plan: state.plan, islands: state.islands }));
  } catch {
    // Storage can be disabled or full; the calculator remains usable in memory.
  }
}
