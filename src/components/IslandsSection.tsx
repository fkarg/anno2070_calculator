import { Fragment, useState } from 'react';

import {
  BUILDINGS,
  ISLAND_REQUIREMENTS,
  OPEN_FERTILITY_SLOT,
  type BuildingId,
  type OperatingImpact,
} from '../calculations/building-data';
import {
  aggregateBalances,
  BALANCE_EPSILON,
  DISPLAY_EPSILON,
  calculateIslandBalance,
  type GoodBalance,
  type IslandBalances,
} from '../calculations/island-balance';
import { GOODS, producedGood, type GoodId } from '../calculations/goods';
import { islandOperatingImpact } from '../calculations/operating-impact';
import type { Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import {
  canBuildOn,
  createIsland,
  islandPopulation,
  type IslandFactionState,
  type IslandState,
} from '../island';
import {
  FACTIONS,
  FACTION_CONFIGS,
  parseNonNegativeInteger,
  resolveHouses,
  type EditableNumber,
} from '../model';
import { FertilityPicker } from './FertilityPicker';
import { NumericInput } from './NumericInput';
import { OperatingImpactValues } from './OperatingImpactValues';
import { PopulationFaction } from './PopulationFaction';
import { RevealEditValue } from './RevealEditValue';

type IslandsSectionProps = {
  islands: readonly IslandState[];
  planRequirements: Record<string, number | null>;
  onIslandsChange: (updater: (current: readonly IslandState[]) => IslandState[]) => void;
};

type IslandChange = (updater: (current: IslandState) => IslandState) => void;

const ALL_BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
const requirementById = new Map(ISLAND_REQUIREMENTS.map((requirement) => [requirement.id, requirement]));

// Chain/tier ordering: buildings group by the population tier their chain
// first unlocks (fisheries before health food before robots), alphabetical
// within a tier — a stable order that never re-sorts while editing counts.
const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));
const BUILDING_TIER: ReadonlyMap<BuildingId, number> = (() => {
  const tiers = new Map<BuildingId, number>();
  for (const node of PRODUCTION_NODES) {
    let root = node;
    while (root.calculation.kind === 'material') root = nodeById.get(root.calculation.parentId)!;
    if (root.calculation.kind !== 'primary') continue;
    const tier = root.calculation.satisfaction.findIndex((value) => value > 0);
    const current = tiers.get(node.buildingId);
    if (current === undefined || tier < current) tiers.set(node.buildingId, tier);
  }
  return tiers;
})();

const CATEGORY_ORDER = { production: 0, power: 1, eco: 2, material: 3, civic: 4, logistics: 5 } as const;
const CATEGORY_LABELS = {
  production: 'Production',
  power: 'Power',
  eco: 'Ecobalance',
  material: 'Materials',
  civic: 'City & civic',
  logistics: 'Harbor & logistics',
} as const;

function compareByChainTier(left: BuildingId, right: BuildingId): number {
  const categoryDifference = CATEGORY_ORDER[BUILDINGS[left].category] - CATEGORY_ORDER[BUILDINGS[right].category];
  if (categoryDifference !== 0) return categoryDifference;
  const tierDifference = (BUILDING_TIER.get(left) ?? 9) - (BUILDING_TIER.get(right) ?? 9);
  if (tierDifference !== 0) return tierDifference;
  return BUILDINGS[left].label.localeCompare(BUILDINGS[right].label);
}

// Plan requirement per building: canonical rows only — non-canonical
// alternatives restate demand the canonical producer already covers.
function planRequirementByBuilding(planRequirements: Record<string, number | null>): Map<BuildingId, number | null> {
  const required = new Map<BuildingId, number | null>();
  for (const node of PRODUCTION_NODES) {
    if (producedGood(node.buildingId) !== node.buildingId) continue;
    const current = required.get(node.buildingId);
    const requirement = planRequirements[node.id];
    required.set(
      node.buildingId,
      current === null || requirement === null || requirement === undefined
        ? null
        : (current ?? 0) + requirement,
    );
  }
  return required;
}

function ownedTotalsByBuilding(islands: readonly IslandState[]): Map<BuildingId, number | null> {
  const totals = new Map<BuildingId, number | null>();
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned) as [BuildingId, EditableNumber][]) {
      const current = totals.get(buildingId);
      totals.set(buildingId, current === null || entry.value === null ? null : (current ?? 0) + entry.value);
    }
  }
  return totals;
}

function cell(value: number | null | undefined): string {
  if (value === undefined) return '0';
  if (value === null) return '—';
  return formatRequirement(value);
}

function balanceClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value < 0 ? 'balance--shortfall' : 'balance--surplus';
}

// A deficit good suggests a producer actually buildable on this island —
// an underwater island's chip deficit suggests recyclers, not chip factories.
function buildableProducer(island: IslandState, goodId: GoodId): BuildingId | null {
  const producers = GOODS.get(goodId)?.producers ?? [];
  const canonical = producers.find((producer) => producer.buildingId === goodId);
  const ordered = canonical ? [canonical, ...producers.filter((producer) => producer !== canonical)] : producers;
  return ordered.find((producer) => canBuildOn(island, producer.buildingId))?.buildingId ?? null;
}

type Suggestion = { buildingId: BuildingId; reason: string };

function buildSuggestions(
  island: IslandState,
  balances: IslandBalances,
  planByBuilding: Map<BuildingId, number | null>,
  ownedTotals: Map<BuildingId, number | null>,
  empire: IslandBalances,
): Suggestion[] {
  const local = (Object.entries(balances) as [GoodId, GoodBalance][])
    .filter(([, balance]) => balance.balance !== null && balance.balance < -BALANCE_EPSILON)
    // Imported goods (empire-covered) need a route, not another building.
    .filter(([goodId]) => {
      const empireBalance = empire[goodId]?.balance;
      return empireBalance === null || empireBalance === undefined || empireBalance < -DISPLAY_EPSILON;
    })
    .sort(([, left], [, right]) => (left.balance ?? 0) - (right.balance ?? 0))
    .flatMap(([goodId, balance]): Suggestion[] => {
      const buildingId = buildableProducer(island, goodId);
      return buildingId === null ? [] : [{
        buildingId,
        reason: `local ${formatRequirement(balance.balance ?? 0)}`,
      }];
    });

  const global = [...planByBuilding.entries()]
    .map(([buildingId, plan]) => ({
      buildingId,
      gap: plan === null ? 0 : plan - (ownedTotals.get(buildingId) ?? 0),
    }))
    .filter(({ buildingId, gap }) => gap > BALANCE_EPSILON && canBuildOn(island, buildingId))
    .sort((left, right) => right.gap - left.gap)
    .map(({ buildingId, gap }): Suggestion => ({ buildingId, reason: `plan +${formatRequirement(gap)}` }));

  const suggestions: Suggestion[] = [];
  for (const candidate of [...local.slice(0, 2), ...global]) {
    if (suggestions.some((suggestion) => suggestion.buildingId === candidate.buildingId)) continue;
    suggestions.push(candidate);
    if (suggestions.length === 4) break;
  }
  return suggestions;
}

function IslandPlaque({ island, index, editing, operatingLoad, onToggleEdit }: {
  island: IslandState;
  index: number;
  editing: boolean;
  operatingLoad: OperatingImpact | null;
  onToggleEdit: () => void;
}) {
  return (
    <header className="island-card__plaque">
      <div className="island-card__plaque-name">
        <h3>{island.name}</h3>
        {island.underwater && <span className="island-card__badge">underwater</span>}
        {!island.settled && <span className="island-card__badge island-card__badge--unsettled">unsettled</span>}
      </div>
      <div className="island-card__plaque-fertilities" data-testid={`island-${index}-fertilities`}>
        {(['fertility', 'deposit'] as const).map((kind) => {
          const icons = island.fertilities
            .filter((id) => id !== OPEN_FERTILITY_SLOT && requirementById.get(id)?.kind === kind)
            .map((id) => (
              <img
                key={id}
                src={`/assets/${requirementById.get(id)?.image}`}
                alt={requirementById.get(id)?.label ?? id}
                title={requirementById.get(id)?.label ?? id}
                width="22"
                height="22"
              />
            ));
          if (kind === 'fertility') {
            return (
              <span key={kind} className="island-card__plaque-group">
                {icons}
                {island.fertilities.includes(OPEN_FERTILITY_SLOT) && (
                  <span className="island-card__slot" title="Open fertility slot">?</span>
                )}
              </span>
            );
          }
          return icons.length === 0 ? null : (
            <span key={kind} className="island-card__plaque-group island-card__plaque-group--deposits">
              {icons}
            </span>
          );
        })}
      </div>
      <div className="island-card__plaque-load" data-testid={`island-${index}-operating-load`}>
        {operatingLoad === null
          ? <span>—</span>
          : (
            <OperatingImpactValues
              impact={operatingLoad}
              ecoUnavailable={island.underwater}
              highlightDeficits
            />
          )}
      </div>
      <button
        type="button"
        aria-label={`${editing ? 'Finish configuring' : 'Configure'} island ${island.name}`}
        onClick={onToggleEdit}
      >
        {editing ? 'Done' : 'Configure'}
      </button>
    </header>
  );
}

function FactionSummaryRow({ island, faction, idPrefix, onChange }: {
  island: IslandState;
  faction: Faction;
  idPrefix: string;
  onChange: IslandChange;
}) {
  const config = FACTION_CONFIGS[faction];
  const state = island.factions[faction];
  const houses = resolveHouses(state, 0);
  const population = islandPopulation(island, faction);
  const updateFactionState = (updateState: (current: typeof state) => typeof state) =>
    onChange((current) => ({
      ...current,
      factions: { ...current.factions, [faction]: updateState(current.factions[faction] as typeof state) },
    }));

  return (
    <li className={`island-card__faction-row island-card__faction-row--${faction}`} data-testid={`${idPrefix}summary-${faction}`}>
      <img src={config.houseImage} alt="" width="28" height="28" />
      <NumericInput
        id={`${idPrefix}${faction}-houses`}
        label={`${island.name} ${config.label} houses`}
        raw={houses.raw}
        valid={houses.value !== null}
        onChange={(raw) => updateFactionState((current) => ({
          ...current,
          houses: { raw, value: parseNonNegativeInteger(raw) },
        }))}
      />
      <span className="island-card__faction-populations">
        {config.tierLabels.map((tierLabel, index) => {
          const override = state.overrides[index];
          const manual = override !== null;
          const raw = manual ? override.raw : population?.[index]?.toString() ?? '';
          const valid = manual ? override.value !== null : population !== null;
          return (
            <span key={tierLabel} className="island-card__tier-mini">
              <RevealEditValue
                id={`${idPrefix}${faction}-population-${index}`}
                label={`${island.name} ${config.label} ${tierLabel} population`}
                raw={raw}
                valid={valid}
                manual={manual}
                onChange={(newRaw) => updateFactionState((current) => ({
                  ...current,
                  overrides: current.overrides.map((entry, entryIndex) =>
                    entryIndex === index ? { raw: newRaw, value: parseNonNegativeInteger(newRaw) } : entry),
                }))}
              />
              {manual && (
                <button
                  type="button"
                  className="island-card__tier-reset"
                  aria-label={`Use automatic ${island.name} ${config.label} ${tierLabel} population`}
                  onClick={() => updateFactionState((current) => ({
                    ...current,
                    overrides: current.overrides.map((entry, entryIndex) =>
                      entryIndex === index ? null : entry),
                  }))}
                >
                  ↺
                </button>
              )}
            </span>
          );
        })}
      </span>
    </li>
  );
}

function BuildingLedger({
  island,
  idPrefix,
  balances,
  planByBuilding,
  ownedTotals,
  empire,
  onChange,
}: {
  island: IslandState;
  idPrefix: string;
  balances: IslandBalances;
  planByBuilding: Map<BuildingId, number | null>;
  ownedTotals: Map<BuildingId, number | null>;
  empire: IslandBalances;
  onChange: IslandChange;
}) {
  // Only buildings physically on this island; the chips and the add-list are
  // the entry points for everything else. Stable chain/tier order: no jumping.
  const rows = (Object.keys(island.owned) as BuildingId[])
    .filter((buildingId) => {
      const entry = island.owned[buildingId];
      return entry.value === null || entry.value > 0;
    })
    .sort(compareByChainTier);

  const addable = ALL_BUILDING_IDS
    .filter((buildingId) => canBuildOn(island, buildingId))
    .filter((buildingId) => !rows.includes(buildingId))
    .sort(compareByChainTier);

  const setOwned = (buildingId: BuildingId, entry: EditableNumber) => onChange((current) => ({
    ...current,
    owned: { ...current.owned, [buildingId]: entry },
  }));
  const step = (buildingId: BuildingId, delta: number) => {
    const value = Math.max(0, (island.owned[buildingId]?.value ?? 0) + delta);
    setOwned(buildingId, { raw: String(value), value });
  };

  const suggestions = buildSuggestions(island, balances, planByBuilding, ownedTotals, empire);
  const mixedCategories = new Set(rows.map((buildingId) => BUILDINGS[buildingId].category)).size > 1;

  return (
    <div className="island-card__ledger">
      <div className="island-card__ledger-heading">
        <h4>Owned buildings</h4>
        <select
          aria-label={`Add building to ${island.name}`}
          value=""
          onChange={(event) => {
            if (event.target.value === '') return;
            step(event.target.value as BuildingId, 1);
          }}
        >
          <option value="">Add building…</option>
          {(Object.keys(CATEGORY_ORDER) as (keyof typeof CATEGORY_ORDER)[])
            .map((category) => ({ category, ids: addable.filter((buildingId) => BUILDINGS[buildingId].category === category) }))
            .filter(({ ids }) => ids.length > 0)
            .map(({ category, ids }) => (
              <optgroup key={category} label={CATEGORY_LABELS[category]}>
                {ids.map((buildingId) => {
                  // The produced good's empire balance orients the pick; goods
                  // with no activity anywhere stay a plain label.
                  const goodId = producedGood(buildingId);
                  const empireBalance = goodId === null ? undefined : empire[goodId]?.balance;
                  const suffix = empireBalance === undefined ? ''
                    : empireBalance === null ? ' · empire —'
                    : ` · empire ${empireBalance > 0 ? '+' : ''}${formatRequirement(empireBalance)}`;
                  return (
                    <option key={buildingId} value={buildingId}>{BUILDINGS[buildingId].label}{suffix}</option>
                  );
                })}
              </optgroup>
            ))}
        </select>
      </div>

      {suggestions.length > 0 && (
        <div className="island-card__suggestions" data-testid={`${idPrefix}suggestions`}>
          <span>Build next:</span>
          {suggestions.map(({ buildingId, reason }) => (
            <button
              key={buildingId}
              type="button"
              aria-label={`Build one ${BUILDINGS[buildingId].label} on ${island.name}`}
              onClick={() => step(buildingId, 1)}
            >
              <img src={`/assets/${BUILDINGS[buildingId].image}`} alt="" width="20" height="20" />
              <span>+1 {BUILDINGS[buildingId].label}</span>
              <small>{reason}</small>
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <p className="island-card__ledger-empty">
          No buildings recorded yet — use Build next or the add list.
        </p>
      )}
      {rows.length > 0 && (
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th title="Empire-wide plan requirement">Plan</th>
            <th title="Owned across all islands">Σ own</th>
            <th>Here</th>
            <th title="This island's demand">Demand</th>
            <th title="This island's capacity minus demand">Balance</th>
            <th title="Productivity on this island">Prod %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((buildingId, index) => {
            const building = BUILDINGS[buildingId];
            const entry = island.owned[buildingId];
            const goodId = producedGood(buildingId);
            const canonical = goodId === buildingId;
            const balance = canonical && goodId !== null ? balances[goodId] : undefined;
            const productivity = island.productivity[buildingId];
            // Category divider rows keep supply-chain buildings visually
            // separate from power/eco/material support once both appear.
            const startsGroup = mixedCategories
              && (index === 0 || BUILDINGS[rows[index - 1]].category !== building.category);
            return (
              <Fragment key={buildingId}>
                {startsGroup && (
                  <tr className="island-card__ledger-group" aria-hidden="true">
                    <th colSpan={7}>{CATEGORY_LABELS[building.category]}</th>
                  </tr>
                )}
                <tr data-testid={`${idPrefix}ledger-${buildingId}`}>
                  <th scope="row">
                    <span className="island-card__building-cell" title={building.note}>
                      <img src={`/assets/${building.image}`} alt="" width="22" height="22" />
                      <span>{building.label}{building.note !== undefined && '*'}</span>
                    </span>
                  </th>
                  <td>{building.category === 'production' ? cell(planByBuilding.get(buildingId)) : '·'}</td>
                  <td>{ownedTotals.get(buildingId) === null ? '—' : ownedTotals.get(buildingId) ?? 0}</td>
                  <td className="island-card__stepper">
                    <button
                      type="button"
                      aria-label={`One less ${building.label} on ${island.name}`}
                      onClick={() => step(buildingId, -1)}
                    >−</button>
                    <NumericInput
                      id={`${idPrefix}owned-${buildingId}`}
                      label={`${island.name} owned ${building.label}`}
                      raw={entry?.raw ?? '0'}
                      valid={entry === undefined || entry.value !== null}
                      onChange={(raw) => setOwned(buildingId, { raw, value: parseNonNegativeInteger(raw) })}
                    />
                    <button
                      type="button"
                      aria-label={`One more ${building.label} on ${island.name}`}
                      onClick={() => step(buildingId, 1)}
                    >+</button>
                  </td>
                  <td>{canonical ? cell(balance?.demand) : '·'}</td>
                  <td className={canonical ? balanceClass(balance?.balance) : ''}>
                    {canonical ? cell(balance?.balance) : '·'}
                  </td>
                  <td className="island-card__prod-cell">
                    {goodId === null && building.scalableOutput === undefined ? '·' : (
                      <NumericInput
                        id={`${idPrefix}productivity-${buildingId}`}
                        label={`${island.name} ${building.label} productivity`}
                        raw={productivity?.raw ?? '100'}
                        valid={productivity === undefined || productivity.value !== null}
                        inputMode="decimal"
                        hideLabel
                        onChange={(raw) => onChange((current) => ({
                          ...current,
                          productivity: {
                            ...current.productivity,
                            [buildingId]: { raw, value: raw.trim() === '' ? null : Number(raw) },
                          },
                        }))}
                      />
                    )}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}

function coverageCell(
  balance: GoodBalance,
  empire: GoodBalance | undefined,
): { text: string; ratio: number | null; imported: boolean } {
  if (balance.capacity === null || balance.demand === null) return { text: '—', ratio: null, imported: false };
  if (balance.demand === 0) return { text: balance.capacity > 0 ? 'export' : '—', ratio: null, imported: false };
  const ratio = balance.capacity / balance.demand;
  // A local shortfall sourced from other islands is an import, not an alarm.
  // When the empire itself is short, still say import but carry the empire's
  // coverage — "0%" would wrongly claim nothing is available anywhere.
  if (ratio < 1 && empire !== undefined
    && empire.capacity !== null && empire.demand !== null && empire.balance !== null
    && empire.capacity > BALANCE_EPSILON) {
    if (empire.balance >= -DISPLAY_EPSILON) return { text: 'import', ratio, imported: true };
    return { text: `import ${Math.round((empire.capacity / empire.demand) * 100)}%`, ratio, imported: false };
  }
  return { text: `${Math.round(Math.min(1, ratio) * 100)}%${ratio > 1 ? ' +' : ''}`, ratio, imported: false };
}

function LocalBalanceTable({ island, idPrefix, empire }: {
  island: IslandState;
  idPrefix: string;
  empire: IslandBalances;
}) {
  const balances = (Object.entries(calculateIslandBalance(island)) as [GoodId, GoodBalance][])
    // Owned-at-zero entries create all-zero rows; only goods this island
    // actually produces or demands are worth a line.
    .filter(([, balance]) => balance.capacity === null || balance.demand === null
      || Math.abs(balance.capacity) > BALANCE_EPSILON || Math.abs(balance.demand) > BALANCE_EPSILON)
    .sort(([left], [right]) => BUILDINGS[left].label.localeCompare(BUILDINGS[right].label));
  if (balances.length === 0) return <p>No production or demand yet.</p>;

  return (
    <table className="island-card__balance-table">
      <thead>
        <tr><th>Good</th><th>Capacity</th><th>Demand</th><th>Balance</th><th>Coverage</th></tr>
      </thead>
      <tbody>
        {balances.map(([goodId, balance]) => {
          const coverage = coverageCell(balance, empire[goodId]);
          return (
            <tr key={goodId} data-testid={`${idPrefix}balance-${goodId}`}>
              <th scope="row">
                <img src={`/assets/${BUILDINGS[goodId].image}`} alt="" width="20" height="20" />
                <span>{BUILDINGS[goodId].label}</span>
              </th>
              <td>{cell(balance.capacity)}</td>
              <td>{cell(balance.demand)}</td>
              {/* A deficit fully covered from elsewhere is routine, not an alarm. */}
              <td className={coverage.imported ? 'balance--import' : balanceClass(balance.balance)}>
                {cell(balance.balance)}
              </td>
              <td className="island-card__coverage-cell">
                {coverage.ratio !== null && (
                  <span className="coverage-bar" aria-hidden="true">
                    <span
                      className={`coverage-bar__fill${coverage.ratio < 1 ? ' coverage-bar__fill--short' : ''}`}
                      style={{ width: `${Math.round(Math.min(1, coverage.ratio) * 100)}%` }}
                    />
                  </span>
                )}
                <span className={coverage.imported
                  ? 'balance--import'
                  : coverage.ratio !== null && coverage.ratio < 1 ? 'balance--shortfall' : 'balance--surplus'}>
                  {coverage.text}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Rarely-changed configuration: identity, flags, fertilities, and the full
// population distribution. Everything that changes often lives on the card.
function IslandConfiguration({ island, index, idPrefix, onChange, onRemove }: {
  island: IslandState;
  index: number;
  idPrefix: string;
  onChange: IslandChange;
  onRemove: () => void;
}) {
  const updateFaction = (faction: Faction, update: (current: IslandFactionState) => IslandFactionState) =>
    onChange((current) => ({
      ...current,
      factions: { ...current.factions, [faction]: update(current.factions[faction]) },
    }));

  return (
    <div className="island-card__configuration">
      <div className="island-card__flags">
        <label>
          <span className="visually-hidden">Island name</span>
          <input
            type="text"
            value={island.name}
            aria-label={`Island ${index + 1} name`}
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={island.settled}
            onChange={(event) => onChange((current) => ({ ...current, settled: event.target.checked }))}
          />
          <span>Settled (counts toward the plan and totals)</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={island.underwater}
            onChange={(event) => onChange((current) => ({ ...current, underwater: event.target.checked }))}
          />
          <span>Underwater island</span>
        </label>
        <button
          type="button"
          aria-label={`Remove island ${island.name}`}
          onClick={() => {
            if (window.confirm(`Remove island ${island.name}?`)) onRemove();
          }}
        >
          Remove island
        </button>
      </div>

      <FertilityPicker
        islandName={island.name}
        underwater={island.underwater}
        fertilities={island.fertilities}
        onToggle={(requirementId) => onChange((current) => ({
          ...current,
          fertilities: current.fertilities.includes(requirementId)
            ? current.fertilities.filter((id) => id !== requirementId)
            : [...current.fertilities, requirementId],
        }))}
      />

      <div className="island-card__factions">
        {FACTIONS.map((faction) => (
          <div key={faction} className="island-card__faction">
            <PopulationFaction
              config={FACTION_CONFIGS[faction]}
              state={island.factions[faction]}
              islandHouses={0}
              idPrefix={`${idPrefix}config-`}
              variant="island"
              onHousesChange={(houses) => updateFaction(faction, (current) => ({ ...current, houses }))}
              onMaxTierChange={(maxTier) => updateFaction(faction, (current) => ({ ...current, maxTier }))}
              onOverrideChange={(tierIndex, value) => updateFaction(faction, (current) => ({
                ...current,
                overrides: current.overrides.map((override, overrideIndex) =>
                  overrideIndex === tierIndex ? value : override),
              }))}
              onOverrideClear={(tierIndex) => updateFaction(faction, (current) => ({
                ...current,
                overrides: current.overrides.map((override, overrideIndex) =>
                  overrideIndex === tierIndex ? null : override),
              }))}
            />
            <label className="island-card__coverage">
              <input
                type="checkbox"
                checked={island.factions[faction].recyclingCoverage}
                onChange={(event) => updateFaction(faction, (current) => ({
                  ...current,
                  recyclingCoverage: event.target.checked,
                }))}
              />
              <span>Recycling coverage (assumes all {FACTION_CONFIGS[faction].label} residences covered)</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IslandsSection({ islands, planRequirements, onIslandsChange }: IslandsSectionProps) {
  const [configuring, setConfiguring] = useState<ReadonlySet<string>>(new Set());
  const planByBuilding = planRequirementByBuilding(planRequirements);
  const ownedTotals = ownedTotalsByBuilding(islands);
  const empire = aggregateBalances(islands);

  const toggleConfigure = (islandId: string) => setConfiguring((current) => {
    const next = new Set(current);
    if (next.has(islandId)) next.delete(islandId);
    else next.add(islandId);
    return next;
  });

  return (
    <section className="calculator-section islands-section">
      <div className="calculator-section__heading">
        <div>
          <h2>Islands (actuals)</h2>
        </div>
        <p>Record what you actually own; the plan compares against it</p>
        <button
          type="button"
          onClick={() => onIslandsChange((current) => [...current, createIsland(`Island ${current.length + 1}`)])}
        >
          Add island
        </button>
      </div>

      <div className="islands-section__cards">
        {islands.map((island, index) => {
          const idPrefix = `island-${index}-`;
          const balances = calculateIslandBalance(island);
          // The island's own operating load, settled or not.
          const operatingLoad = islandOperatingImpact(island);
          const onChange: IslandChange = (updater) => onIslandsChange((current) =>
            current.map((candidate) => candidate.id === island.id ? updater(candidate) : candidate));
          return (
            <section
              key={island.id}
              className={`island-card${configuring.has(island.id) ? ' island-card--configuring' : ''}`}
              data-testid={`island-${index}`}
            >
              <IslandPlaque
                island={island}
                index={index}
                editing={configuring.has(island.id)}
                operatingLoad={operatingLoad}
                onToggleEdit={() => toggleConfigure(island.id)}
              />

              {configuring.has(island.id) && (
                <IslandConfiguration
                  island={island}
                  index={index}
                  idPrefix={idPrefix}
                  onChange={onChange}
                  onRemove={() => onIslandsChange((current) =>
                    current.filter((candidate) => candidate.id !== island.id))}
                />
              )}

              {(() => {
                // Zero-resident factions are hidden on the card; the Configure
                // panel keeps all three for initial entry.
                const populated = FACTIONS.filter((faction) => {
                  const houses = island.factions[faction].houses;
                  return houses === null || houses.value === null || houses.value > 0;
                });
                return populated.length === 0 ? null : (
                  <ul className="island-card__faction-rows">
                    {populated.map((faction) => (
                      <FactionSummaryRow
                        key={faction}
                        island={island}
                        faction={faction}
                        idPrefix={idPrefix}
                        onChange={onChange}
                      />
                    ))}
                  </ul>
                );
              })()}

              <BuildingLedger
                island={island}
                idPrefix={idPrefix}
                balances={balances}
                planByBuilding={planByBuilding}
                ownedTotals={ownedTotals}
                empire={empire}
                onChange={onChange}
              />

              <details className="island-card__balances" open>
                <summary>Local balance</summary>
                <LocalBalanceTable island={island} idPrefix={idPrefix} empire={empire} />
              </details>
            </section>
          );
        })}
      </div>
    </section>
  );
}
