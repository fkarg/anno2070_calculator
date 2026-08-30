import { Fragment, useState } from 'react';

import {
  BUILDINGS,
  ISLAND_REQUIREMENTS,
  OPEN_FERTILITY_SLOT,
  type BuildingId,
} from '../calculations/building-data';
import { calculateIslandBalance, type GoodBalance } from '../calculations/island-balance';
import { producedGood, type GoodId } from '../calculations/goods';
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
import { PopulationFaction } from './PopulationFaction';

type IslandsSectionProps = {
  islands: readonly IslandState[];
  planRequirements: Record<string, number | null>;
  onIslandsChange: (updater: (current: readonly IslandState[]) => IslandState[]) => void;
};

const ALL_BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];
const requirementLabel = new Map(ISLAND_REQUIREMENTS.map((requirement) => [requirement.id, requirement.label]));

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

function LocalBalanceTable({ island, idPrefix }: { island: IslandState; idPrefix: string }) {
  const balances = (Object.entries(calculateIslandBalance(island)) as [GoodId, GoodBalance][])
    .sort(([left], [right]) => BUILDINGS[left].label.localeCompare(BUILDINGS[right].label));
  if (balances.length === 0) return <p>No production or demand yet.</p>;

  return (
    <table className="island-card__balance-table">
      <thead>
        <tr><th>Good</th><th>Capacity</th><th>Demand</th><th>Balance</th></tr>
      </thead>
      <tbody>
        {balances.map(([goodId, balance]) => (
          <tr key={goodId} data-testid={`${idPrefix}balance-${goodId}`}>
            <th scope="row">
              <img src={`/assets/${BUILDINGS[goodId].image}`} alt="" width="20" height="20" />
              <span>{BUILDINGS[goodId].label}</span>
            </th>
            <td>{cell(balance.capacity)}</td>
            <td>{cell(balance.demand)}</td>
            <td className={balanceClass(balance.balance)}>{cell(balance.balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BuildingLedger({
  island,
  idPrefix,
  planByBuilding,
  ownedTotals,
  onChange,
}: {
  island: IslandState;
  idPrefix: string;
  planByBuilding: Map<BuildingId, number | null>;
  ownedTotals: Map<BuildingId, number | null>;
  onChange: (updater: (current: IslandState) => IslandState) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<BuildingId | null>(null);
  const balances = calculateIslandBalance(island);

  const gap = (buildingId: BuildingId): number => {
    const plan = planByBuilding.get(buildingId);
    const owned = ownedTotals.get(buildingId);
    if (plan === null || plan === undefined) return 0;
    return plan - (owned ?? 0);
  };

  const rows = ALL_BUILDING_IDS
    .filter((buildingId) => canBuildOn(island, buildingId))
    .filter((buildingId) => {
      if (showAll || buildingId in island.owned) return true;
      const plan = planByBuilding.get(buildingId);
      return plan !== undefined && plan !== null && plan > 0;
    })
    .sort((left, right) => gap(right) - gap(left));

  const setOwned = (buildingId: BuildingId, entry: EditableNumber) => onChange((current) => ({
    ...current,
    owned: { ...current.owned, [buildingId]: entry },
  }));
  const step = (buildingId: BuildingId, delta: number) => {
    const value = Math.max(0, (island.owned[buildingId]?.value ?? 0) + delta);
    setOwned(buildingId, { raw: String(value), value });
  };

  return (
    <div className="island-card__ledger">
      <div className="island-card__ledger-heading">
        <h4>Owned production buildings</h4>
        <label>
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          <span>Show all buildable</span>
        </label>
      </div>
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th title="Empire-wide plan requirement">Plan</th>
            <th title="Owned across all islands">Σ own</th>
            <th>Here</th>
            <th title="This island's demand">Demand</th>
            <th title="This island's capacity minus demand">Balance</th>
            <th><span className="visually-hidden">Productivity</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((buildingId) => {
            const building = BUILDINGS[buildingId];
            const entry = island.owned[buildingId];
            const goodId = producedGood(buildingId);
            const canonical = goodId === buildingId;
            const balance = canonical && goodId !== null ? balances[goodId] : undefined;
            const productivity = island.productivity[buildingId];
            return (
              <Fragment key={buildingId}>
                <tr data-testid={`${idPrefix}ledger-${buildingId}`}>
                  <th scope="row">
                    <img src={`/assets/${building.image}`} alt="" width="22" height="22" />
                    <span>{building.label}</span>
                  </th>
                  <td>{cell(planByBuilding.get(buildingId))}</td>
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
                  <td>
                    <button
                      type="button"
                      aria-expanded={expanded === buildingId}
                      aria-label={`${building.label} productivity on ${island.name}`}
                      onClick={() => setExpanded((current) => current === buildingId ? null : buildingId)}
                    >%</button>
                  </td>
                </tr>
                {expanded === buildingId && (
                  <tr className="island-card__ledger-expansion">
                    <td colSpan={7}>
                      <NumericInput
                        id={`${idPrefix}productivity-${buildingId}`}
                        label={`${island.name} ${building.label} productivity`}
                        raw={productivity?.raw ?? '100'}
                        valid={productivity === undefined || productivity.value !== null}
                        inputMode="decimal"
                        onChange={(raw) => onChange((current) => ({
                          ...current,
                          productivity: {
                            ...current.productivity,
                            [buildingId]: { raw, value: raw.trim() === '' ? null : Number(raw) },
                          },
                        }))}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IslandViewCard({ island, idPrefix }: { island: IslandState; idPrefix: string }) {
  const factionSummaries = FACTIONS
    .map((faction) => {
      const houses = resolveHouses(island.factions[faction], 0);
      const population = islandPopulation(island, faction);
      return { faction, houses, population };
    })
    .filter(({ houses }) => houses.value === null || houses.value > 0);

  return (
    <>
      {factionSummaries.length === 0
        ? <p className="island-card__summary-empty">No residences recorded.</p>
        : (
          <ul className="island-card__summaries">
            {factionSummaries.map(({ faction, houses, population }) => (
              <li key={faction} data-testid={`${idPrefix}summary-${faction}`}>
                <strong>{FACTION_CONFIGS[faction].label}</strong>
                <span>{houses.value === null ? '—' : houses.value} houses → {
                  population === null ? '—' : population.map((value) => String(value)).join(' / ')
                }</span>
              </li>
            ))}
          </ul>
        )}

      <div className="island-card__chips">
        {island.fertilities.map((id) => id === OPEN_FERTILITY_SLOT
          ? <span key={id} className="island-card__chip island-card__chip--slot" title="Open fertility slot">?</span>
          : (
            <span key={id} className="island-card__chip" title={requirementLabel.get(id) ?? id}>
              <img
                src={`/assets/${ISLAND_REQUIREMENTS.find((requirement) => requirement.id === id)?.image}`}
                alt={requirementLabel.get(id) ?? id}
                width="22"
                height="22"
              />
            </span>
          ))}
        {(Object.entries(island.owned) as [BuildingId, EditableNumber][])
          .filter(([, entry]) => entry.value === null || entry.value > 0)
          .map(([buildingId, entry]) => (
            <span key={buildingId} className="island-card__chip island-card__chip--owned" title={BUILDINGS[buildingId].label}>
              <img src={`/assets/${BUILDINGS[buildingId].image}`} alt={BUILDINGS[buildingId].label} width="22" height="22" />
              <span>×{entry.value ?? '—'}</span>
            </span>
          ))}
      </div>

      <details className="island-card__balances" open>
        <summary>Local balance</summary>
        <LocalBalanceTable island={island} idPrefix={idPrefix} />
      </details>
    </>
  );
}

function IslandEditCard({
  island,
  idPrefix,
  planByBuilding,
  ownedTotals,
  onChange,
  onRemove,
}: {
  island: IslandState;
  idPrefix: string;
  planByBuilding: Map<BuildingId, number | null>;
  ownedTotals: Map<BuildingId, number | null>;
  onChange: (updater: (current: IslandState) => IslandState) => void;
  onRemove: () => void;
}) {
  const updateFaction = (faction: Faction, update: (current: IslandFactionState) => IslandFactionState) =>
    onChange((current) => ({
      ...current,
      factions: { ...current.factions, [faction]: update(current.factions[faction]) },
    }));

  return (
    <>
      <div className="island-card__flags">
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
              idPrefix={idPrefix}
              onHousesChange={(houses) => updateFaction(faction, (current) => ({ ...current, houses }))}
              onMaxTierChange={(maxTier) => updateFaction(faction, (current) => ({ ...current, maxTier }))}
              onLivingSpaceChange={(livingSpace) => updateFaction(faction, (current) => ({ ...current, livingSpace }))}
              onSenateChange={(senate) => updateFaction(faction, (current) => ({ ...current, senate }))}
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

      <BuildingLedger
        island={island}
        idPrefix={idPrefix}
        planByBuilding={planByBuilding}
        ownedTotals={ownedTotals}
        onChange={onChange}
      />

      <details className="island-card__balances">
        <summary>Local balance</summary>
        <LocalBalanceTable island={island} idPrefix={idPrefix} />
      </details>
    </>
  );
}

export function IslandsSection({ islands, planRequirements, onIslandsChange }: IslandsSectionProps) {
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set());
  const planByBuilding = planRequirementByBuilding(planRequirements);
  const ownedTotals = ownedTotalsByBuilding(islands);

  const toggleEdit = (islandId: string) => setEditing((current) => {
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
          onClick={() => onIslandsChange((current) => {
            const island = createIsland(`Island ${current.length + 1}`);
            setEditing((editingIds) => new Set(editingIds).add(island.id));
            return [...current, island];
          })}
        >
          Add island
        </button>
      </div>

      <div className="islands-section__cards">
        {islands.map((island, index) => {
          const idPrefix = `island-${index}-`;
          const isEditing = editing.has(island.id);
          return (
            <section
              key={island.id}
              className={`island-card${isEditing ? ' island-card--editing' : ''}`}
              data-testid={`island-${index}`}
            >
              <header className="island-card__header">
                {isEditing
                  ? (
                    <input
                      type="text"
                      value={island.name}
                      aria-label={`Island ${index + 1} name`}
                      onChange={(event) => onIslandsChange((current) =>
                        current.map((candidate) => candidate.id === island.id
                          ? { ...candidate, name: event.target.value }
                          : candidate))}
                    />
                  )
                  : <h3>{island.name}</h3>}
                {island.underwater && <span className="island-card__badge">underwater</span>}
                {!island.settled && <span className="island-card__badge island-card__badge--unsettled">unsettled</span>}
                <button
                  type="button"
                  aria-label={`${isEditing ? 'Finish editing' : 'Edit'} island ${island.name}`}
                  onClick={() => toggleEdit(island.id)}
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              </header>
              {isEditing
                ? (
                  <IslandEditCard
                    island={island}
                    idPrefix={idPrefix}
                    planByBuilding={planByBuilding}
                    ownedTotals={ownedTotals}
                    onChange={(updater) => onIslandsChange((current) =>
                      current.map((candidate) => candidate.id === island.id ? updater(candidate) : candidate))}
                    onRemove={() => onIslandsChange((current) =>
                      current.filter((candidate) => candidate.id !== island.id))}
                  />
                )
                : <IslandViewCard island={island} idPrefix={idPrefix} />}
            </section>
          );
        })}
      </div>
    </section>
  );
}
