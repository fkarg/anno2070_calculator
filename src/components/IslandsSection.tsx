import {
  BUILDING_REQUIREMENTS,
  BUILDINGS,
  type BuildingId,
} from '../calculations/building-data';
import { calculateIslandBalance, type GoodBalance } from '../calculations/island-balance';
import { producedGood, type GoodId } from '../calculations/goods';
import type { Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES } from '../calculations/production-data';
import { createIsland, type IslandFactionState, type IslandState } from '../island';
import {
  FACTIONS,
  FACTION_CONFIGS,
  parseNonNegativeInteger,
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

// Plan requirement per building: canonical rows only — non-canonical
// alternatives restate demand the canonical producer already covers.
function planRequirementByBuilding(planRequirements: Record<string, number | null>): Map<BuildingId, number> {
  const required = new Map<BuildingId, number>();
  for (const node of PRODUCTION_NODES) {
    if (producedGood(node.buildingId) !== node.buildingId) continue;
    const requirement = planRequirements[node.id];
    if (requirement === null || requirement === undefined) continue;
    required.set(node.buildingId, (required.get(node.buildingId) ?? 0) + requirement);
  }
  return required;
}

function balanceCell(value: number | null): string {
  return value === null ? '—' : formatRequirement(value);
}

function IslandCard({
  island,
  index,
  buildingGaps,
  onChange,
  onRemove,
}: {
  island: IslandState;
  index: number;
  buildingGaps: Map<BuildingId, number>;
  onChange: (updater: (current: IslandState) => IslandState) => void;
  onRemove: () => void;
}) {
  const idPrefix = `island-${index}-`;
  const balances = calculateIslandBalance(island);
  const balanceGoods = (Object.entries(balances) as [GoodId, GoodBalance][])
    .sort(([left], [right]) => BUILDINGS[left].label.localeCompare(BUILDINGS[right].label));

  const addable = ALL_BUILDING_IDS
    .filter((buildingId) => !(buildingId in island.owned))
    .filter((buildingId) => {
      const requirement = BUILDING_REQUIREMENTS[buildingId];
      return requirement === undefined || island.fertilities[requirement] !== 'absent';
    })
    .sort((left, right) => (buildingGaps.get(right) ?? 0) - (buildingGaps.get(left) ?? 0));

  const updateFaction = (faction: Faction, update: (current: IslandFactionState) => IslandFactionState) =>
    onChange((current) => ({
      ...current,
      factions: { ...current.factions, [faction]: update(current.factions[faction]) },
    }));

  return (
    <section className="island-card" data-testid={`island-${index}`}>
      <header className="island-card__header">
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
          <span>Settled</span>
        </label>
        <button
          type="button"
          aria-label={`Remove island ${island.name}`}
          onClick={() => {
            if (window.confirm(`Remove island ${island.name}?`)) onRemove();
          }}
        >
          Remove
        </button>
      </header>

      <FertilityPicker
        islandName={island.name}
        fertilities={island.fertilities}
        onChange={(requirementId, state) => onChange((current) => {
          const fertilities = { ...current.fertilities };
          if (state === null) delete fertilities[requirementId];
          else fertilities[requirementId] = state;
          return { ...current, fertilities };
        })}
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

      <div className="island-card__owned">
        <h4>Owned production buildings</h4>
        <ul>
          {(Object.keys(island.owned) as BuildingId[]).map((buildingId) => (
            <li key={buildingId} data-testid={`${idPrefix}owned-${buildingId}`}>
              <img src={`/assets/${BUILDINGS[buildingId].image}`} alt="" width="24" height="24" />
              <span>{BUILDINGS[buildingId].label}</span>
              <NumericInput
                id={`${idPrefix}owned-${buildingId}`}
                label={`${island.name} owned ${BUILDINGS[buildingId].label}`}
                raw={island.owned[buildingId].raw}
                valid={island.owned[buildingId].value !== null}
                onChange={(raw) => onChange((current) => ({
                  ...current,
                  owned: { ...current.owned, [buildingId]: { raw, value: parseNonNegativeInteger(raw) } },
                }))}
              />
              <NumericInput
                id={`${idPrefix}productivity-${buildingId}`}
                label={`${island.name} ${BUILDINGS[buildingId].label} productivity`}
                raw={island.productivity[buildingId]?.raw ?? '100'}
                valid={island.productivity[buildingId] === undefined
                  || island.productivity[buildingId].value !== null}
                inputMode="decimal"
                onChange={(raw) => onChange((current) => ({
                  ...current,
                  productivity: {
                    ...current.productivity,
                    [buildingId]: { raw, value: raw.trim() === '' ? null : Number(raw) },
                  },
                }))}
              />
              <button
                type="button"
                aria-label={`Remove ${BUILDINGS[buildingId].label} from ${island.name}`}
                onClick={() => onChange((current) => {
                  const owned = { ...current.owned };
                  const productivity = { ...current.productivity };
                  delete owned[buildingId];
                  delete productivity[buildingId];
                  return { ...current, owned, productivity };
                })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <label>
          <span className="visually-hidden">Add building to {island.name}</span>
          <select
            aria-label={`Add building to ${island.name}`}
            value=""
            onChange={(event) => {
              if (event.target.value === '') return;
              const buildingId = event.target.value as BuildingId;
              onChange((current) => ({
                ...current,
                owned: { ...current.owned, [buildingId]: { raw: '1', value: 1 } },
              }));
            }}
          >
            <option value="">Add building…</option>
            {addable.map((buildingId) => {
              const gap = buildingGaps.get(buildingId) ?? 0;
              return (
                <option key={buildingId} value={buildingId}>
                  {BUILDINGS[buildingId].label}{gap > 0 ? ` (plan needs ${formatRequirement(gap)} more)` : ''}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className="island-card__balances">
        <h4>Local balance</h4>
        {balanceGoods.length === 0
          ? <p>No production or demand yet.</p>
          : (
            <table>
              <thead>
                <tr><th>Good</th><th>Capacity</th><th>Demand</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {balanceGoods.map(([goodId, balance]) => (
                  <tr key={goodId} data-testid={`${idPrefix}balance-${goodId}`}>
                    <th scope="row">
                      <img src={`/assets/${BUILDINGS[goodId].image}`} alt="" width="20" height="20" />
                      <span>{BUILDINGS[goodId].label}</span>
                    </th>
                    <td>{balanceCell(balance.capacity)}</td>
                    <td>{balanceCell(balance.demand)}</td>
                    <td className={balance.balance !== null && balance.balance < 0 ? 'balance--shortfall' : 'balance--surplus'}>
                      {balanceCell(balance.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </section>
  );
}

export function IslandsSection({ islands, planRequirements, onIslandsChange }: IslandsSectionProps) {
  const required = planRequirementByBuilding(planRequirements);
  const ownedTotals = new Map<BuildingId, number>();
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned) as [BuildingId, EditableNumber][]) {
      if (entry.value !== null) ownedTotals.set(buildingId, (ownedTotals.get(buildingId) ?? 0) + entry.value);
    }
  }
  const buildingGaps = new Map<BuildingId, number>(
    [...required.entries()].map(([buildingId, requirement]) => [
      buildingId,
      requirement - (ownedTotals.get(buildingId) ?? 0),
    ]),
  );

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
        {islands.map((island, index) => (
          <IslandCard
            key={island.id}
            island={island}
            index={index}
            buildingGaps={buildingGaps}
            onChange={(updater) => onIslandsChange((current) =>
              current.map((candidate) => candidate.id === island.id ? updater(candidate) : candidate))}
            onRemove={() => onIslandsChange((current) =>
              current.filter((candidate) => candidate.id !== island.id))}
          />
        ))}
      </div>
    </section>
  );
}
